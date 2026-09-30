
import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import type {
    Subject, User, AllocationRequest, Department, Priority,
    TimetableEntry, AcademicYear, Semester, TimetableSettings,
    Course, LetterheadConfig, AllocationRequestPreferences, UserTask, Institution,
    CountyInventoryItem, RemedialSession, RemedialPayout, RemedialAllocation, RemedialRateSetting
} from '../types';
import { apiService, safeLocalStorage } from '../services/apiService';
import { SynergyHub } from './SynergyHub';
import { 
    Sparkles, Play, Square, DollarSign, QrCode, CheckCircle2, Award, Clock, 
    Calendar, AlertTriangle, UserX, UserCheck, ArrowRight, RotateCcw, XCircle, 
    Hourglass, Lock, HelpCircle, Check, X, Shield, Flame, Camera, Zap, 
    SlidersHorizontal, ChevronDown, ChevronUp, Scan, SwitchCamera, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
    checkCancellationCutoff, rankSubstituteCandidates, getRemainingMinutes, 
    isConfirmationExpired, getNextOccurrenceDate 
} from '../utils/remedialSubstitutionUtils';
import { resolveRealStudentClass, naturalClassSort } from '../utils/academicUtils';
import { calculateRemedialSessionDuration, timeToMinutes } from '../utils/timeUtils';

import { SubjectCard } from './SubjectCard';
import { RequestModal } from './RequestModal';
import { TeacherWalletCard } from './TeacherWalletCard';
import { DeallocationModal } from './DeallocationModal';
import { ChangeRequestModal } from './ChangeRequestModal';
import { LecturerDashboard } from './LecturerDashboard';
import { TimetableGrid } from './TimetableGrid';
import { CalendarPlusIcon } from './icons/CalendarPlusIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { AssessmentManager } from './AssessmentManager';
import { AssessmentReports } from './AssessmentReports';
import TeacherCheckInView from './TeacherCheckInView';
import { ClockInIcon } from './icons/ClockInIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { AscScannerPanel } from './AscScannerPanel';
import { ClassSupervisorAttendanceManager } from './common/ClassSupervisorAttendanceManager';
import { TeacherLessonPlanManager } from './Academics/TeacherLessonPlanManager';

const EduFlowManager = lazy(() => import('./common/EduFlowManager').then(m => ({ default: m.EduFlowManager })));
const StudentLeaveOutManager = lazy(() => import('./StudentLeaveOutManager').then(m => ({ default: m.StudentLeaveOutManager })));


const renderTabIcon = (tab: string, className = "w-5 h-5") => {
    switch (tab) {
        case 'dashboard': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        );
        case 'class_supervisor_attendance': return <CheckCircleIcon className={className} />;
        case 'student_leave_out': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        );
        case 'academic_hub': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        );
        case 'my_timetable': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        case 'scan_session': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
        );
        case 'eduflow': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        );
        case 'synergy_hub': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        );
        case 'my_requests': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        );
        case 'inventory': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        );
        case 'self_checkin': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        case 'remedials': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        default: return null;
    }
};

interface LecturerViewProps {
    user?: User;
    activeRole?: any;
    users?: User[];
    subjects?: Subject[];
    departments?: Department[];
    courses?: Course[];
    rooms?: any[];
    requests?: AllocationRequest[];
    allocations?: AllocationRequest[];
    timeOffRequests?: any[];
    onSubmitRequest?: (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: AllocationRequestPreferences | undefined, courseLevelSelections: Record<string, string[]>) => Promise<boolean>;
    onWithdrawRequest?: (requestId: string) => void;
    onDeallocationRequest?: (requestId: string, justification: string) => void;
    onAllocationChangeRequest?: (requestId: string, justification: string, newPriority: Priority) => void;
    getSubjectById?: (id: string) => Subject | undefined;
    getRoomById?: (id: string) => any | undefined;
    getLecturerById?: (id: string) => User | undefined;
    generatedTimetable?: TimetableEntry[];
    allTimetableEntries?: TimetableEntry[];
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    academicYears?: AcademicYear[];
    semesters?: Semester[];
    timetableSettings?: TimetableSettings;
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
    userTasks?: UserTask[];
    onAddTask?: (data: { title: string; dueDate?: string; }) => void;
    onUpdateTask?: (taskId: string, isComplete: boolean) => void;
    onDeleteTask?: (taskId: string) => void;
    currentInstitution?: Institution | null;
    onShareLesson?: (entryId: string, teacherId: string | null) => void;
    assignments?: any[];
    submissions?: any[];
    onAddAssignment?: (data: any) => void;
    onDeleteAssignment?: (id: string) => void;
    onUpdateSubmission?: (id: string, data: any) => void;
    assessments?: any[];
    assessmentMarks?: any[];
    onAddAssessment?: (data: any) => void;
    onUpdateAssessment?: (id: string, data: any) => void;
    onDeleteAssessment?: (id: string) => void;
    onSaveAssessmentMarks?: (id: string, marks: any) => Promise<void>;
    inventoryItems?: CountyInventoryItem[];
    onIssueInventoryItem?: (itemId: string, quantity: number, recipientId: string, recipientName: string) => Promise<void>;
    studentAttendances?: any[];
    studentAbsenceRequests?: any[];
    onSaveAttendance?: (lessonId: string, attendance: any[]) => Promise<void>;
    onSaveScanSession?: (placeholderEntry: any, attendanceRows: any[]) => Promise<void>;
    onAccessAlumnaPortal?: (school: any) => void;
    schoolRegistry?: any[];
    onLogAction?: (msg: string) => Promise<void> | void;
    onTeacherLessonCheckIn?: (timetableEntryId: string) => void;
    enrollments?: any[];
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const base = "flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm border";
    if (status === 'approved') return <span className={`${base} bg-green-50 text-green-700 border-green-100 dark:bg-green-900/40 dark:text-green-300`}><CheckIcon className="w-3.5 h-3.5 mr-1" /> Approved</span>;
    if (status === 'disapproved') return <span className={`${base} bg-red-50 text-red-700 border-red-100 dark:bg-red-900/40 dark:text-red-300`}><XIcon className="w-3.5 h-3.5 mr-1" /> Disapproved</span>;
    if (status === 'change_request_pending') return <span className={`${base} bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/40 dark:text-orange-300`}><ArrowsRightLeftIcon className="w-3.5 h-3.5 mr-1" /> Modification Pending</span>;
    if (status === 'deallocation_pending') return <span className={`${base} bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-300`}><ExclamationTriangleIcon className="w-3.5 h-3.5 mr-1" /> Removal Pending</span>;
    return <span className={`${base} bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300`}><ClockIcon className="w-3.5 h-3.5 mr-1" /> {status.replace(/_/g, ' ')}</span>;
};

export const LecturerView: React.FC<LecturerViewProps> = (props) => {
    const {
        user = { name: 'User', id: 'user_1' } as any,
        subjects = [],
        departments = [],
        courses = [],
        requests = [],
        allocations = [],
        onSubmitRequest = async () => true,
        onWithdrawRequest = () => {},
        onDeallocationRequest,
        onAllocationChangeRequest,
        getSubjectById = () => undefined,
        getRoomById = () => undefined,
        getLecturerById = () => undefined,
        generatedTimetable = [],
        activeAcademicYear,
        activeSemester,
        academicYears = [],
        semesters = [],
        timetableSettings = {} as any,
        userTasks = [],
        onAddTask,
        onUpdateTask,
        onDeleteTask,
        currentInstitution,
        onAccessAlumnaPortal,
        schoolRegistry
    } = props;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [timetableSubTab, setTimetableSubTab] = useState<'regular' | 'remedials'>('regular');
    const [showMoreDrawer, setShowMoreDrawer] = useState(false);

    // Remedial States
    const [remedialSessions, setRemedialSessions] = useState<RemedialSession[]>([]);
    const [remedialPayouts, setRemedialPayouts] = useState<RemedialPayout[]>([]);
    const [remedialAllocations, setRemedialAllocations] = useState<RemedialAllocation[]>([]);
    const [rateSetting, setRateSetting] = useState<RemedialRateSetting | null>(null);
    const [cancellingAllocation, setCancellingAllocation] = useState<RemedialAllocation | null>(null);
    const [cancellationReason, setCancellationReason] = useState<string>('Medical Emergency');
    const [cancellationNotes, setCancellationNotes] = useState<string>('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedPrefectId, setSelectedPrefectId] = useState('');
    const [signingPayout, setSigningPayout] = useState<RemedialPayout | null>(null);
    const [anonymousToken, setAnonymousToken] = useState('');
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [scannerManualToken, setScannerManualToken] = useState('');
    const [showManualOverride, setShowManualOverride] = useState(false);

    // Live Hardware Camera States for Prefect Scanner
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [scannedBadgeSuccess, setScannedBadgeSuccess] = useState<boolean>(false);
    const [scannedVerifiedPrefect, setScannedVerifiedPrefect] = useState<any | null>(null);
    const [qrValidationError, setQrValidationError] = useState<string | null>(null);
    const [isProcessingSession, setIsProcessingSession] = useState<boolean>(false);
    const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const scannerContextRef = useRef<{
        courseId: string;
        courseName: string;
        subjectId: string;
        prefects: any[];
        primaryPrefect: any;
        onStart: (override?: any) => Promise<void>;
    }>({ courseId: '', courseName: '', subjectId: '', prefects: [], primaryPrefect: null, onStart: async () => {} });
    const isStartingRemedialRef = useRef<boolean>(false);

    const stopCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => {
                try { track.stop(); } catch (_) {}
            });
            cameraStreamRef.current = null;
        }
        if (scannerVideoRef.current) {
            try {
                scannerVideoRef.current.srcObject = null;
            } catch (_) {}
        }
        setCameraStream(null);
        setIsCameraActive(false);
    }, []);

    const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
        setCameraError(null);
        setIsCameraActive(false);

        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => {
                try { track.stop(); } catch (_) {}
            });
            cameraStreamRef.current = null;
        }

        try {
            if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                throw new Error("Camera requires a secure HTTPS connection. Please use HTTPS.");
            }

            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error("Camera API not supported or blocked in this browser. Please check browser permissions.");
            }

            let stream: MediaStream | null = null;

            // Strategy 1: Ideal facingMode
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: facing },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
            } catch (_) {}

            // Strategy 2: Simple facingMode
            if (!stream) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: facing },
                        audio: false
                    });
                } catch (_) {}
            }

            // Strategy 3: Ultimate universal video fallback
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }

            if (!stream) {
                throw new Error("Could not acquire video feed from device camera.");
            }

            cameraStreamRef.current = stream;
            setCameraStream(stream);
            setIsCameraActive(true);

            if (scannerVideoRef.current) {
                scannerVideoRef.current.srcObject = stream;
                scannerVideoRef.current.setAttribute('playsinline', 'true');
                scannerVideoRef.current.setAttribute('muted', 'true');
                scannerVideoRef.current.muted = true;
                scannerVideoRef.current.play().catch(e => console.warn('Video play warning:', e));
            }
        } catch (err: any) {
            console.error("Camera access failed:", err);
            let friendly = err?.message || "Could not activate camera.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                friendly = "Camera access denied. Please click the lock/camera icon in your browser URL bar and allow Camera permission.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                friendly = "No camera hardware detected on this device.";
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                friendly = "Camera is currently locked or in use by another tab or app. Please close other camera apps and retry.";
            }
            setCameraError(friendly);
            setIsCameraActive(false);
        }
    }, []);

    const toggleCameraFacing = useCallback(() => {
        setCameraFacingMode(prev => {
            const nextFacing = prev === 'environment' ? 'user' : 'environment';
            startCamera(nextFacing);
            return nextFacing;
        });
    }, [startCamera]);

    const handleScannerVideoRef = useCallback((node: HTMLVideoElement | null) => {
        scannerVideoRef.current = node;
        if (node && cameraStreamRef.current) {
            node.srcObject = cameraStreamRef.current;
            node.setAttribute('playsinline', 'true');
            node.setAttribute('muted', 'true');
            node.muted = true;
            node.play().catch(e => console.warn('Video play warning on mount:', e));
        }
    }, []);

    // Manage camera lifecycle and real QR detection & validation loop
    useEffect(() => {
        let scanInterval: any = null;
        let detector: any = null;
        let offscreenCanvas: HTMLCanvasElement | null = null;
        let jsQrScript: HTMLScriptElement | null = null;

        if (isScannerModalOpen) {
            setScannedBadgeSuccess(false);
            setScannedVerifiedPrefect(null);
            setQrValidationError(null);
            setIsProcessingSession(false);
            setScannerManualToken('');
            setCameraFacingMode('environment'); // Always default to rear camera on open
            startCamera('environment'); // Always launch with rear camera first

            // 1. Native BarcodeDetector if available
            if ('BarcodeDetector' in window) {
                try {
                    detector = new (window as any).BarcodeDetector({
                        formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix']
                    });
                } catch (e) {
                    console.warn('BarcodeDetector setup warning:', e);
                }
            }

            // 2. jsQR dynamic fallback for universal browser support (iOS Safari, Firefox, etc.)
            if (!('BarcodeDetector' in window) && !(window as any).jsQR) {
                jsQrScript = document.createElement('script');
                jsQrScript.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
                jsQrScript.async = true;
                document.body.appendChild(jsQrScript);
            }

            offscreenCanvas = document.createElement('canvas');

            let lastScannedRaw = '';
            let lastScanTime = 0;

            scanInterval = setInterval(async () => {
                const video = scannerVideoRef.current;
                if (!video || video.readyState < 2) return;

                let detectedRaw: string | null = null;

                // Engine 1: Native BarcodeDetector
                if (detector) {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                            detectedRaw = String(barcodes[0].rawValue).trim();
                        }
                    } catch (_) {}
                }

                // Engine 2: Canvas + jsQR Fallback
                if (!detectedRaw && (window as any).jsQR && offscreenCanvas) {
                    try {
                        const vw = video.videoWidth || 640;
                        const vh = video.videoHeight || 480;
                        offscreenCanvas.width = vw;
                        offscreenCanvas.height = vh;
                        const ctx = offscreenCanvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, vw, vh);
                            const imgData = ctx.getImageData(0, 0, vw, vh);
                            const code = (window as any).jsQR(imgData.data, imgData.width, imgData.height, {
                                inversionAttempts: "dontInvert"
                            });
                            if (code && code.data) {
                                detectedRaw = String(code.data).trim();
                            }
                        }
                    } catch (_) {}
                }

                if (!detectedRaw) return;

                // Debounce identical scans within 2.5s
                const now = Date.now();
                if (detectedRaw === lastScannedRaw && now - lastScanTime < 2500) {
                    return;
                }
                lastScannedRaw = detectedRaw;
                lastScanTime = now;

                // VALIDATE BEFORE PROCESSING
                const ctx = scannerContextRef.current;
                const expectedPrefix = `prefect_remedial_token_class_${ctx.courseId}`;
                let isValid = false;
                let matchedPrefect: any = null;
                let errorMsg = '';

                if (ctx.courseId && detectedRaw.includes(expectedPrefix)) {
                    isValid = true;
                    matchedPrefect = ctx.primaryPrefect || ctx.prefects[0] || { id: 'prefect_verified', name: 'Class Leader / Secretary' };
                } else if (detectedRaw.includes('prefect_remedial_token_class_')) {
                    isValid = false;
                    errorMsg = `Wrong Class Badge: This card belongs to another class, not ${ctx.courseName}.`;
                } else {
                    // Check if code matches an authorized prefect for this course
                    matchedPrefect = ctx.prefects.find(p => 
                        (p.id && detectedRaw === p.id) ||
                        (p.admissionNumber && detectedRaw.toLowerCase().includes(p.admissionNumber.toLowerCase())) ||
                        (p.name && detectedRaw.toLowerCase().includes(p.name.toLowerCase()))
                    );

                    if (matchedPrefect) {
                        isValid = true;
                    } else {
                        // Check JSON structure
                        try {
                            const parsed = JSON.parse(detectedRaw);
                            if (parsed.courseId === ctx.courseId || parsed.classId === ctx.courseId) {
                                isValid = true;
                                matchedPrefect = ctx.prefects.find(p => p.id === parsed.prefectId || p.id === parsed.studentId) || ctx.primaryPrefect || { id: 'prefect_verified', name: parsed.name || 'Class Leader' };
                            }
                        } catch (_) {}
                    }

                    if (!isValid) {
                        errorMsg = `QR Code Rejected: Not an authorized Prefect Badge or Student Card for ${ctx.courseName}.`;
                    }
                }

                if (isValid && matchedPrefect) {
                    if (scanInterval) {
                        clearInterval(scanInterval);
                        scanInterval = null;
                    }
                    setScannedBadgeSuccess(true);
                    setScannedVerifiedPrefect(matchedPrefect);
                    setQrValidationError(null);
                    setIsProcessingSession(true);
                    setScannerManualToken(detectedRaw);

                    // Auto-start after brief verification confirmation display
                    setTimeout(() => {
                        ctx.onStart({
                            courseId: ctx.courseId,
                            subjectId: ctx.subjectId,
                            prefectId: matchedPrefect.id
                        });
                    }, 800);
                } else {
                    setQrValidationError(errorMsg);
                    setTimeout(() => {
                        setQrValidationError(null);
                    }, 3500);
                }
            }, 250);
        } else {
            stopCamera();
        }

        return () => {
            if (scanInterval) clearInterval(scanInterval);
            if (jsQrScript && document.body.contains(jsQrScript)) {
                document.body.removeChild(jsQrScript);
            }
            stopCamera();
        };
    }, [isScannerModalOpen]);

    // Student Clearance Requests for Teacher Sign-off
    const [teacherClearances, setTeacherClearances] = useState<any[]>([]);
    const [isTeacherClearanceModalOpen, setIsTeacherClearanceModalOpen] = useState(false);
    const [lostItemInputs, setLostItemInputs] = useState<Record<string, string>>({});

    const loadTeacherClearances = useCallback(async () => {
        const instId = currentInstitution?.id || user?.institutionId;
        if (!instId) return;
        try {
            const local = JSON.parse(localStorage.getItem(`eduai_student_clearances_${instId}`) || '[]');
            setTeacherClearances(local);
        } catch (_) {}
    }, [currentInstitution?.id, user?.institutionId]);

    // Subject teacher allocations (from Lessons & Allocation manager)
    const [subjectAllocations, setSubjectAllocations] = useState<any[]>(() => {
        try {
            const instId = currentInstitution?.id || user?.institutionId;
            const saved = localStorage.getItem(`eduai_subject_allocations_${instId}`) ||
                          localStorage.getItem('eduai_subject_allocations');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [];
    });

    useEffect(() => {
        const instId = currentInstitution?.id || user?.institutionId;
        if (instId) {
            apiService.fetchModuleRecords<any>('subject_allocations', instId)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setSubjectAllocations(records);
                        try {
                            localStorage.setItem(`eduai_subject_allocations_${instId}`, JSON.stringify(records));
                            localStorage.setItem('eduai_subject_allocations', JSON.stringify(records));
                        } catch (_) {}
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution?.id, user?.institutionId]);

    // Student Enrollments Registry (from school enrollment records / localStorage / API)
    const effectiveInstId = currentInstitution?.id || user?.institutionId || (user as any)?.schoolId || (user as any)?.school_id;
    const [enrollments, setEnrollments] = useState<any[]>(() => {
        if (props.enrollments && Array.isArray(props.enrollments) && props.enrollments.length > 0) {
            return props.enrollments;
        }
        try {
            const keysToTry = [
                effectiveInstId ? `eduai_student_enrollments_${effectiveInstId}` : null,
                effectiveInstId ? `eduai_students_${effectiveInstId}` : null,
                'eduai_student_enrollments',
                'eduai_student_enrollments_default',
                'student_enrollments',
                'eduai_students',
                'eduai_students_default'
            ].filter(Boolean) as string[];

            for (const k of keysToTry) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            }

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('eduai_student_enrollments_') || key.startsWith('eduai_students_'))) {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    }
                }
            }
        } catch (_) {}
        return [];
    });

    useEffect(() => {
        if (props.enrollments && Array.isArray(props.enrollments) && props.enrollments.length > 0) {
            setEnrollments(props.enrollments);
            return;
        }
        let active = true;
        (async () => {
            try {
                let records: any[] = [];
                if (effectiveInstId) {
                    records = await apiService.fetchModuleRecords<any>('student_enrollments', effectiveInstId).catch(() => []);
                }
                if (!records || records.length === 0) {
                    records = await apiService.fetchModuleRecords<any>('student_enrollments').catch(() => []);
                }
                if (active && Array.isArray(records) && records.length > 0) {
                    setEnrollments(records);
                    if (effectiveInstId) {
                        try {
                            localStorage.setItem(`eduai_student_enrollments_${effectiveInstId}`, JSON.stringify(records));
                        } catch (_) {}
                    }
                }
            } catch (e) {
                console.warn('[LecturerView] Failed to fetch enrollments:', e);
            }
        })();
        return () => { active = false; };
    }, [props.enrollments, effectiveInstId]);

    // Role check for Director of Studies (DOS)
    const isDos = useMemo(() => {
        if (!user) return false;
        const role = ((props as any).activeRole || user.role || '').toLowerCase();
        const roles: string[] = Array.isArray((user as any)?.roles)
            ? (user as any).roles.map((r: any) => String(r).toLowerCase())
            : [];
        const title = ((user as any)?.jobTitle || (user as any)?.designation || (user as any)?.title || '').toLowerCase();
        return (
            role === 'dos' ||
            role === 'director_of_studies' ||
            role === 'academics_officer' ||
            role === 'admin' ||
            role === 'super_admin' ||
            role === 'head_teacher' ||
            role === 'deputy' ||
            roles.includes('dos') ||
            roles.includes('director_of_studies') ||
            roles.includes('academics_officer') ||
            roles.includes('admin') ||
            roles.includes('head_teacher') ||
            title.includes('director of studies') ||
            title.includes('dos') ||
            title.includes('academic officer')
        );
    }, [user, (props as any).activeRole]);

    // Class supervisor & leave out rights check (shared permissions)
    const canAccessLeaveOutAndSupervisor = useMemo(() => {
        if (!user) return false;
        if (isDos) return true;
        const role = ((props as any).activeRole || user.role || '').toLowerCase();
        const adminRoles = [
            'admin', 'super_admin', 'head_teacher', 'principal', 
            'deputy', 'dos', 'director_of_studies', 'academics_officer', 
            'academic_director', 'hoi', 'managing_director', 'boarding_master', 'matron'
        ];
        if (adminRoles.includes(role)) return true;
        const userRoles = Array.isArray((user as any).roles) 
            ? (user as any).roles.map((r: any) => String(r).toLowerCase()) 
            : [];
        if (userRoles.some((r: string) => adminRoles.includes(r))) return true;
        if ((user as any).isDos || (user as any).is_dos || (user as any).isAdmin || (user as any).is_admin) return true;
        if ((user as any).isClassSupervisor || (user as any).is_class_supervisor) return true;
        if ((user as any).supervisedClass || (user as any).supervised_class || (user as any).studentClass) return true;
        if (courses && courses.length > 0) {
            const isClassTeacher = courses.some(c => 
                (c.levels || []).some(l => 
                    l.classTeacherId === user.id || 
                    (l as any).supervisorId === user.id ||
                    ((l as any).classTeacher && user.name && (l as any).classTeacher.toLowerCase().trim() === user.name.toLowerCase().trim())
                )
            );
            if (isClassTeacher) return true;
        }
        if (subjectAllocations && subjectAllocations.length > 0) {
            const uId = user.id;
            const uName = (user.name || '').toLowerCase().trim();
            const isAllocatedSupervisor = subjectAllocations.some(a => 
                (a.teacherId === uId || (uName && a.teacherName && a.teacherName.toLowerCase().trim() === uName)) &&
                (a.isClassTeacher || a.is_class_teacher || a.isSupervisor || a.is_supervisor || a.role === 'class_teacher' || a.role === 'class_supervisor')
            );
            if (isAllocatedSupervisor) return true;
        }
        const perms: string[] = (user as any).permissions || [];
        if (perms.some(p => ['leave_out', 'student_leave_out', 'class_supervisor', 'class_supervisor_attendance', 'attendance'].includes(p.toLowerCase()))) {
            return true;
        }
        return false;
    }, [user, isDos, courses, subjectAllocations, (props as any).activeRole]);

    // Teacher's assigned subjects (only assigned subjects if teacher, all subjects if DOS)
    const teacherAllocatedSubjects = useMemo(() => {
        if (isDos) {
            return subjects || [];
        }

        const matchedSubjectIds = new Set<string>();
        const matchedSubjectNames = new Set<string>();
        const uId = user?.id;
        const uName = (user?.name || '').toLowerCase().trim();

        // 1. From subjectAllocations (Lessons & Allocations manager)
        (subjectAllocations || []).forEach(a => {
            const isMatch = a && (
                a.teacherId === uId ||
                (uName && a.teacherName && a.teacherName.toLowerCase().trim() === uName)
            );
            if (isMatch) {
                if (a.subjectId) matchedSubjectIds.add(a.subjectId);
                const sName = (a.subjectName || a.subject || '').trim().toLowerCase();
                if (sName) matchedSubjectNames.add(sName);
                if (a.subjectCode) matchedSubjectNames.add(a.subjectCode.trim().toLowerCase());
            }
        });

        // 2. From allocations (AllocationRequest records)
        (allocations || []).forEach((a: any) => {
            const isMatch = a && (a.lecturerId === uId || a.teacherId === uId);
            if (isMatch) {
                if (a.subjectId) matchedSubjectIds.add(a.subjectId);
                if (Array.isArray(a.subjectIds)) a.subjectIds.forEach((id: string) => matchedSubjectIds.add(id));
                const sName = (a.subjectName || a.subject || '').trim().toLowerCase();
                if (sName) matchedSubjectNames.add(sName);
            }
        });

        // 3. From user profile fields
        const directSubs: string[] = (user as any)?.allocatedSubjects || (user as any)?.teachingSubjects || (user as any)?.subjects || [];
        if (Array.isArray(directSubs)) {
            directSubs.forEach(s => {
                if (typeof s === 'string' && s.trim()) {
                    matchedSubjectIds.add(s);
                    matchedSubjectNames.add(s.trim().toLowerCase());
                }
            });
        }
        const singleSub = ((user as any)?.subject || '').trim().toLowerCase();
        if (singleSub) matchedSubjectNames.add(singleSub);

        // 4. From generatedTimetable
        (generatedTimetable || []).filter(e => e && e.lecturerId === uId).forEach(e => {
            if (e.subjectId) matchedSubjectIds.add(e.subjectId);
        });

        // Match against all available subjects
        const allocated = (subjects || []).filter(s =>
            matchedSubjectIds.has(s.id) ||
            matchedSubjectNames.has(s.name.trim().toLowerCase()) ||
            matchedSubjectNames.has((s.code || '').trim().toLowerCase())
        );

        return allocated;
    }, [isDos, subjects, subjectAllocations, allocations, user, generatedTimetable]);

    // Teacher's allocated grades (grades/classes based on allocated subjects)
    const teacherAllocatedGrades = useMemo(() => {
        if (isDos) {
            const allGrades = new Set<string>();
            (courses || []).forEach(c => {
                (c.levels || []).forEach(l => { if (l.name) allGrades.add(l.name.trim()); });
            });
            (props.users || []).filter(u => u.role === 'student').forEach(st => {
                const cls = resolveRealStudentClass(st, [], courses, '');
                if (cls && cls !== 'Unclassified') allGrades.add(cls);
            });
            (enrollments || []).forEach(enr => {
                const cls = enr.studentClass || enr.gradeLevel || enr.className || enr.class || enr.metadata?.gradeLevel || enr.metadata?.studentClass || '';
                if (cls && cls !== 'Unclassified') allGrades.add(cls);
            });
            return naturalClassSort(Array.from(allGrades));
        }

        const gradesSet = new Set<string>();
        const uId = user?.id;
        const uName = (user?.name || '').toLowerCase().trim();

        // 1. From subjectAllocations (className in Lessons & Allocations)
        (subjectAllocations || []).forEach(a => {
            const isMatch = a && (
                a.teacherId === uId ||
                (uName && a.teacherName && a.teacherName.toLowerCase().trim() === uName)
            );
            if (isMatch) {
                const cName = (a.className || a.class || '').trim();
                if (cName) gradesSet.add(cName);
            }
        });

        // 2. From allocations (AllocationRequest records)
        (allocations || []).forEach((a: any) => {
            if (a && (a.lecturerId === uId || a.teacherId === uId)) {
                const cName = (a.className || a.class || '').trim();
                if (cName) gradesSet.add(cName);
                if (a.courseLevelSelections && typeof a.courseLevelSelections === 'object') {
                    Object.values(a.courseLevelSelections).flat().forEach((lvl: any) => {
                        if (typeof lvl === 'string' && lvl.trim()) gradesSet.add(lvl.trim());
                    });
                }
            }
        });

        // 3. From courses whose levels include the teacher's allocated subjects
        const allocatedSubjectIds = new Set(teacherAllocatedSubjects.map(s => s.id));
        (courses || []).forEach(c => {
            (c.levels || []).forEach(l => {
                if (l.subjectIds && l.subjectIds.some(id => allocatedSubjectIds.has(id))) {
                    if (l.name) gradesSet.add(l.name.trim());
                }
            });
        });

        // 4. From students in users who have these subjects in their course/grade
        (props.users || []).filter(u => u.role === 'student').forEach(st => {
            const cls = resolveRealStudentClass(st, [], courses, '');
            if (cls && cls !== 'Unclassified') {
                const matchesCourse = (courses || []).some(c =>
                    c.id === st.courseId && (c.levels || []).some(l => l.id === st.courseLevelId && l.subjectIds && l.subjectIds.some(id => allocatedSubjectIds.has(id)))
                );
                if (matchesCourse) {
                    gradesSet.add(cls);
                }
            }
        });

        return naturalClassSort(Array.from(gradesSet));
    }, [isDos, courses, props.users, subjectAllocations, allocations, user, teacherAllocatedSubjects]);

    useEffect(() => {
        loadTeacherClearances();
    }, [loadTeacherClearances]);

    const pendingTeacherClearances = useMemo(() => {
        const list: Array<{ clearanceId: string; studentName: string; admissionNumber: string; grade: string; item: any }> = [];
        for (const clr of teacherClearances) {
            if (clr.status === 'cleared') continue;
            for (const item of (clr.clearanceItems || [])) {
                if (item.status === 'pending') {
                    list.push({
                        clearanceId: clr.id,
                        studentName: clr.studentName,
                        admissionNumber: clr.admissionNumber,
                        grade: clr.grade,
                        item
                    });
                }
            }
        }
        return list;
    }, [teacherClearances]);

    const handleTeacherSignClearance = async (clearanceId: string, sNo: number, itemLost: string) => {
        const instId = currentInstitution?.id || user?.institutionId || '';
        const todayStr = new Date().toLocaleDateString('en-GB');

        const updated = teacherClearances.map(clr => {
            if (clr.id !== clearanceId) return clr;
            const nextItems = (clr.clearanceItems || []).map((i: any) => {
                if (i.sNo === sNo) {
                    return {
                        ...i,
                        teacherName: user?.name || 'Subject Teacher',
                        itemLostOrDamaged: itemLost || 'None',
                        signature: `✓ Signed by ${user?.name || 'Teacher'} (${todayStr})`,
                        status: 'cleared',
                        signedAt: new Date().toISOString()
                    };
                }
                return i;
            });
            return {
                ...clr,
                clearanceItems: nextItems,
                status: nextItems.every((i: any) => i.status === 'cleared') ? 'cleared' : 'in_progress',
                updatedAt: new Date().toISOString()
            };
        });

        setTeacherClearances(updated);
        safeLocalStorage.setItem(`eduai_student_clearances_${instId}`, JSON.stringify(updated));
        try {
            const target = updated.find(c => c.id === clearanceId);
            if (target) {
                await apiService.saveModuleRecord('student_clearances', {
                    id: target.id,
                    institutionId: instId,
                    studentId: target.studentId,
                    payload: target,
                    status: target.status
                });
            }
        } catch (_) {}
    };

    const loadRemedialData = async () => {
        try {
            const instId = currentInstitution?.id || user?.institutionId || '';
            const [sessList, payList, allocList, ratesList] = await Promise.all([
                apiService.fetchRemedialSessions(instId),
                apiService.fetchRemedialPayouts(instId),
                apiService.fetchRemedialAllocations(instId).catch(() => []),
                apiService.fetchRemedialRateSettings(instId).catch(() => [])
            ]);
            setRemedialSessions((sessList || []).filter((s: RemedialSession) => s && s.teacherId === user?.id));
            setRemedialPayouts((payList || []).filter((p: RemedialPayout) => p && p.teacherId === user?.id));
            setRemedialAllocations(allocList || []);
            if (ratesList && ratesList.length > 0) {
                setRateSetting(ratesList[0]);
            }
        } catch (e) {
            console.error('Failed to load remedial data', e);
        }
    };

    useEffect(() => {
        loadRemedialData();
    }, [currentInstitution?.id, user?.institutionId]);

    useEffect(() => {
        if (activeTab === 'remedials') {
            loadRemedialData();
            setActiveTab('my_timetable');
            setTimetableSubTab('remedials');
        } else if (activeTab === 'my_timetable' && timetableSubTab === 'remedials') {
            loadRemedialData();
        }
    }, [activeTab, timetableSubTab]);

    // Teacher's own remedial allocations
    const myRemedialAllocations = useMemo(() => {
        return (remedialAllocations || []).filter(a =>
            a.teacherId === user?.id || (a.status === 'Substitute Pending' && a.originalTeacherId === user?.id)
        ).sort((a, b) => {
            const dateA = getNextOccurrenceDate(a.dayOfWeek, a.startTime);
            const dateB = getNextOccurrenceDate(b.dayOfWeek, b.startTime);
            return dateA.getTime() - dateB.getTime();
        });
    }, [remedialAllocations, user?.id]);

    // Incoming substitute requests targeted at this teacher
    const pendingSubstituteRequests = useMemo(() => {
        return (remedialAllocations || []).filter(a =>
            a.status === 'Substitute Pending' && a.substituteTeacherId === user?.id
        );
    }, [remedialAllocations, user?.id]);

    // End active remedial session directly without opening camera/scanner
    const handleEndRemedial = async (session: RemedialSession) => {
        try {
            // Explicitly ensure camera/scanner is turned off & modal is closed
            setIsScannerModalOpen(false);
            stopCamera();

            const end = new Date();
            const matchedAlloc = (remedialAllocations || []).find(a =>
                (session.allocationId && a.id === session.allocationId) ||
                (a.teacherId === session.teacherId &&
                    (a.courseId === session.courseId || a.className === session.className) &&
                    (a.subjectId === session.subjectId || a.subjectName === session.subjectName) &&
                    a.dayOfWeek?.toLowerCase() === new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase())
            ) || (myRemedialAllocations || []).find(a =>
                (a.courseId === session.courseId || a.className === session.className) &&
                (a.subjectId === session.subjectId || a.subjectName === session.subjectName)
            );

            const schedStart = session.scheduledStartTime || matchedAlloc?.startTime;
            const schedEnd = session.scheduledEndTime || matchedAlloc?.endTime;
            const schedDuration = session.scheduledDurationMinutes || (schedStart && schedEnd ? Math.max(1, timeToMinutes(schedEnd) - timeToMinutes(schedStart)) : 60);

            const calc = calculateRemedialSessionDuration(session.startTime, end, {
                startTime: schedStart,
                endTime: schedEnd,
                durationMinutes: schedDuration
            });

            const updated: RemedialSession = {
                ...session,
                endTime: end.toISOString(),
                hours: calc.hours,
                durationHours: calc.hours,
                duration_hours: calc.hours,
                durationMinutes: calc.durationMinutes,
                scheduledStartTime: schedStart,
                scheduledEndTime: schedEnd,
                scheduledDurationMinutes: calc.scheduledMinutes,
                allocationId: session.allocationId || matchedAlloc?.id,
                earlyLoginMinutesOmitted: calc.earlyMinutesOmitted,
                cappedAtTimetable: calc.isCappedAtTimetable,
                loggedOutEarly: calc.isLoggedOutEarly,
                status: 'Pending Duty Approval' as const
            };

            await apiService.saveRemedialSession(updated);

            // Clean up any duplicate orphaned in-progress sessions for the same teacher and course/subject today
            try {
                const todayStr = new Date(session.startTime).toDateString();
                const orphanDuplicates = (remedialSessions || []).filter(s =>
                    s.id !== session.id &&
                    s.teacherId === session.teacherId &&
                    s.status === 'In Progress' &&
                    new Date(s.startTime).toDateString() === todayStr &&
                    (s.courseId === session.courseId || s.className === session.className || s.subjectId === session.subjectId)
                );
                if (orphanDuplicates.length > 0) {
                    const orphanIds = orphanDuplicates.map(o => o.id);
                    await apiService.deleteRemedialSession(orphanIds);
                }
            } catch (_) {}

            let durationBreakdown = `• Verified Duration: ${calc.hours} hrs (${calc.durationMinutes} mins)`;
            if (calc.isEarlyLogin && calc.earlyMinutesOmitted > 0) {
                durationBreakdown += `\n• Early Login: Logged in early; ${calc.earlyMinutesOmitted} min(s) omitted before timetable start (${schedStart})`;
            }
            if (calc.isCappedAtTimetable) {
                durationBreakdown += `\n• Timetable Round-Off: Logged out at/after required duration; rounded off to timetable (${calc.scheduledMinutes} mins)`;
            } else if (calc.isLoggedOutEarly) {
                durationBreakdown += `\n• Early Conclude: Logged out earlier than required duration; calculated using exact minutes (${calc.durationMinutes} mins)`;
            }

            props.onLogAction?.(`Ended remedial lesson: ${session.subjectName} (${calc.hours} hrs, ${calc.durationMinutes} mins)`);
            alert(`✅ Remedial class completed!\n\n• Subject: ${session.subjectName}\n• Class: ${session.className}\n${durationBreakdown}\n• Concluded At: ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\nStatus: Pending Teacher on Duty approval before payout.`);
            loadRemedialData();
        } catch (err: any) {
            alert(err.message || 'Failed to end remedial session');
        }
    };
    const [myRequestsSubTab, setMyRequestsSubTab] = useState<'catalog' | 'pending' | 'allocations'>('catalog');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    const [deallocatingRequest, setDeallocatingRequest] = useState<AllocationRequest | null>(null);
    const [changingAllocation, setChangingAllocation] = useState<AllocationRequest | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);

    const useRequests = currentInstitution?.useAllocationRequests ?? true;

    const filteredSubjects = useMemo(() => {
        return (subjects || []).filter(s => {
            const matchesDept = selectedDepartment === 'all' || s.departmentId === selectedDepartment;
            const q = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
            return matchesDept && matchesSearch;
        });
    }, [subjects, selectedDepartment, searchQuery]);

    const lecturerTimetable = useMemo(() =>
        (generatedTimetable || []).filter(entry => entry && entry.lecturerId === user?.id),
        [generatedTimetable, user?.id]
    );

    const myPendingRequests = useMemo(() =>
        (requests || []).filter(r => r && r.lecturerId === user?.id && r.status !== 'approved' && r.status !== 'disapproved' && r.status !== 'change_request_pending' && r.status !== 'deallocation_pending'),
        [requests, user?.id]
    );

    const handleSubjectSelect = (subjectId: string) => {
        setSelectedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subjectId)) newSet.delete(subjectId);
            else newSet.add(subjectId);
            return newSet;
        });
    };

    const handleRequestSubmit = async (just: string, sig: string | null, prio: Priority, prefs: AllocationRequestPreferences, levels: Record<string, string[]>) => {
        setIsSubmitting(true);
        setSubmitSuccess(null);
        const success = await onSubmitRequest(Array.from(selectedSubjectIds), just, sig, prio, activeAcademicYear?.id || '', activeSemester?.id || '', prefs, levels);
        setIsSubmitting(false);
        setSubmitSuccess(success);

        if (success) {
            setIsRequestModalOpen(false);
            setSelectedSubjectIds(new Set());
            setMyRequestsSubTab('pending');
            setTimeout(() => setSubmitSuccess(null), 5000);
        } else {
            alert("Registry sync error. Attempted local update.");
            setTimeout(() => setSubmitSuccess(null), 5000);
        }
    };

    const menuTabs = useMemo(() => {
        const base = ['dashboard', 'lesson_plans'];
        if (canAccessLeaveOutAndSupervisor) {
            base.push('class_supervisor_attendance', 'student_leave_out');
        }
        base.push('academic_hub', 'my_timetable', 'scan_session', 'eduflow', 'synergy_hub', 'self_checkin');
        if (useRequests) base.push('my_requests');
        if (props.inventoryItems && props.inventoryItems.length > 0) base.push('inventory');
        return base;
    }, [canAccessLeaveOutAndSupervisor, useRequests, props.inventoryItems]);

    // Safety fallback: if user loses supervisor rights or navigates directly to supervisor tabs, reset to dashboard
    useEffect(() => {
        if (!canAccessLeaveOutAndSupervisor && (activeTab === 'class_supervisor_attendance' || activeTab === 'student_leave_out')) {
            setActiveTab('dashboard');
        }
    }, [canAccessLeaveOutAndSupervisor, activeTab]);


    const [showIssueModal, setShowIssueModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CountyInventoryItem | null>(null);
    const [issueForm, setIssueForm] = useState({ quantity: 1, recipientId: '' });

    const handleIssueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !props.onIssueInventoryItem) return;

        const recipient = props.users?.find(u => u.id === issueForm.recipientId);
        if (!recipient) return;

        if (issueForm.quantity > selectedItem.quantity) {
            alert(`Cannot issue more than available quantity (${selectedItem.quantity})`);
            return;
        }

        setIsSubmitting(true);
        await props.onIssueInventoryItem(selectedItem.id, issueForm.quantity, recipient.id, recipient.name);
        setIsSubmitting(false);
        setShowIssueModal(false);
        setSelectedItem(null);
        setIssueForm({ quantity: 1, recipientId: '' });
        alert('Item issued successfully');
    };

    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop Glassmorphic Sidebar */}
                <aside className="hidden lg:flex flex-col w-72 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2.5rem] p-6 shadow-xl shrink-0 h-fit sticky top-6 space-y-6 animate-fade-in no-print">
                    <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800/60">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Academic Portal
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white uppercase">Faculty Command</h2>
                    </div>
                    
                    <nav className="flex flex-col gap-2">
                        {menuTabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden group ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 relative z-10">
                                        {renderTabIcon(tab, "w-4.5 h-4.5")}
                                        <span>{tab.replace(/_/g, ' ')}</span>
                                        {tab === 'my_timetable' && pendingSubstituteRequests.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black animate-pulse">
                                                {pendingSubstituteRequests.length} Sub Req
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-6">
                    {submitSuccess === true && (
                        <div className="bg-green-50 dark:bg-green-955/20 border border-green-200 dark:border-green-900/40 p-5 rounded-3xl flex items-center gap-3.5 animate-fade-in shadow-sm">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                            <p className="text-xs font-black text-green-800 dark:text-green-200 uppercase tracking-wider">Registry database records updated successfully.</p>
                        </div>
                    )}

                    {/* Pending Student Clearance Banner */}
                    {pendingTeacherClearances.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 dark:border-amber-800/80 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                                        {pendingTeacherClearances.length} Student Clearance Line{pendingTeacherClearances.length > 1 ? 's' : ''} Awaiting Teacher Sign-Off
                                    </h4>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                                        Junior School leaving candidates require subject verification before certificate release.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTeacherClearanceModalOpen(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95 shrink-0"
                            >
                                Review & Sign Clearances
                            </button>
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="animate-fade-in-up">
                            <LecturerDashboard
                                user={user}
                                canAccessSupervisor={canAccessLeaveOutAndSupervisor}
                                requests={requests}
                                allocations={allocations}
                                subjects={subjects}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                setActiveTab={setActiveTab}
                                generatedTimetable={generatedTimetable}
                                onLessonCheckIn={props.onTeacherLessonCheckIn || (() => {})}
                                onAbsenceRequest={() => { }}
                                userTasks={userTasks}
                                onAddTask={onAddTask || (() => {})}
                                onUpdateTask={onUpdateTask || (() => {})}
                                onDeleteTask={onDeleteTask || (() => {})}
                                onNavigateToNearby={() => setActiveTab('my_timetable')}
                                currentInstitution={currentInstitution}
                                onRequestChange={(alloc) => {
                                    setChangingAllocation(alloc);
                                }}
                                studentAttendances={props.studentAttendances}
                                studentAbsenceRequests={props.studentAbsenceRequests}
                                onSaveAttendance={props.onSaveAttendance}
                                users={props.users}
                                onAccessAlumnaPortal={onAccessAlumnaPortal || (() => {})}
                                schoolRegistry={schoolRegistry}
                                myRemedialAllocations={myRemedialAllocations}
                                pendingSubstituteRequests={pendingSubstituteRequests}
                                remedialSessions={remedialSessions}
                                onEndRemedialSession={handleEndRemedial}
                            />
                        </div>
                    )}

                    {activeTab === 'class_supervisor_attendance' && canAccessLeaveOutAndSupervisor && (
                        <div className="animate-fade-in-up">
                            <ClassSupervisorAttendanceManager
                                currentUser={user}
                                students={props.users ? props.users.filter(u => u.role === 'student') : []}
                                users={props.users || []}
                                courses={courses}
                                allocatedGrades={teacherAllocatedGrades}
                                subjectAllocations={subjectAllocations}
                                currentInstitution={currentInstitution}
                                activeAcademicYear={props.activeAcademicYear}
                                activeSemester={props.activeSemester}
                                onSaveAttendance={props.onSaveAttendance}
                            />
                        </div>
                    )}

                    {activeTab === 'student_leave_out' && canAccessLeaveOutAndSupervisor && (
                        <div className="animate-fade-in-up">
                            <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Loading Student Leave Out & Exeat Hub...</div>}>
                                <StudentLeaveOutManager
                                    currentUser={user!}
                                    currentInstitution={currentInstitution || { id: user?.institutionId || '', name: 'Institution' } as any}
                                    companyDetails={{ smsConfig: {} } as any}
                                    users={props.users || []}
                                    academicYears={academicYears}
                                    semesters={semesters}
                                    courses={courses}
                                    departments={departments}
                                    onLogAction={async (msg) => { if (props.onLogAction) props.onLogAction(msg); }}
                                    onDataChange={() => {}}
                                />
                            </Suspense>
                        </div>
                    )}

                    {activeTab === 'academic_hub' && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 text-center md:text-left">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Academic Performance Hub</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage Marks, Assessments & Student Reports</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-[2rem] text-amber-600 shadow-inner">
                                        <ChartBarIcon className="w-10 h-10" />
                                    </div>
                                </div>

                                <div className="w-full">
                                    <AssessmentManager
                                        user={user}
                                        isDos={isDos}
                                        assessments={props.assessments || []}
                                        assessmentMarks={props.assessmentMarks || []}
                                        allocatedSubjects={teacherAllocatedSubjects}
                                        allocatedGrades={teacherAllocatedGrades}
                                        subjectAllocations={subjectAllocations}
                                        currentInstitution={currentInstitution}
                                        users={props.users || []}
                                        enrollments={enrollments}
                                        courses={courses}
                                        onAddAssessment={props.onAddAssessment || (() => { })}
                                        onUpdateAssessment={props.onUpdateAssessment}
                                        onDeleteAssessment={props.onDeleteAssessment || (() => { })}
                                        onSaveAssessmentMarks={props.onSaveAssessmentMarks || (async () => { })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'my_timetable' && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* Timetable Subtabs Switcher: Regular Timetable vs Remedials Hub */}
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm no-print">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setTimetableSubTab('regular')}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                            timetableSubTab === 'regular'
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        <ClockIcon className="w-4 h-4" />
                                        <span>Regular Timetable</span>
                                    </button>

                                    <button
                                        onClick={() => setTimetableSubTab('remedials')}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 relative ${
                                            timetableSubTab === 'remedials'
                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        <BookOpenIcon className="w-4 h-4" />
                                        <span>Remedials Hub</span>
                                        {pendingSubstituteRequests.length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black animate-pulse shadow-sm">
                                                {pendingSubstituteRequests.length} Sub Req
                                            </span>
                                        )}
                                        {myRemedialAllocations.length > 0 && (
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                timetableSubTab === 'remedials' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                            }`}>
                                                {myRemedialAllocations.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {timetableSubTab === 'regular' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Staff Schedule</h3>
                                    <TimetableGrid
                                        entries={lecturerTimetable}
                                        subjects={subjects || []}
                                        courses={courses || []}
                                        rooms={props.rooms || []}
                                        getSubjectById={getSubjectById}
                                        getLecturerById={id => user}
                                        getRoomById={getRoomById}
                                        timetableSettings={timetableSettings}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'scan_session' && (
                        <div className="animate-fade-in-up">
                            <AscScannerPanel
                                currentUser={user}
                                users={props.users || []}
                                subjects={subjects}
                                courses={courses}
                                allocations={(allocations || []).map(a => ({ subjectId: a?.subjectId, lecturerId: user?.id || '' }))}
                                activeAcademicYear={activeAcademicYear}
                                activeSemester={activeSemester}
                                onSaveSession={props.onSaveScanSession || (async () => { alert('Save handler not configured. Please contact admin.'); })}
                            />
                        </div>
                    )}

                    {activeTab === 'my_requests' && useRequests && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex space-x-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl w-fit shadow-sm border">
                                {[
                                    { id: 'catalog', label: 'Unit Catalog', count: filteredSubjects.length },
                                    { id: 'pending', label: 'In Review', count: myPendingRequests.length },
                                    { id: 'allocations', label: 'Active Load', count: allocations.length }
                                ].map((sub) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setMyRequestsSubTab(sub.id as any)}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${myRequestsSubTab === sub.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {sub.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${myRequestsSubTab === sub.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{sub.count}</span>
                                    </button>
                                ))}
                            </div>

                            {myRequestsSubTab === 'catalog' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Unit Search</label>
                                            <div className="relative">
                                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Code or Name..." className="form-input pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-xs text-slate-800 dark:text-slate-100" />
                                                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Department</label>
                                            <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="form-select bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 w-full outline-none">
                                                <option value="all">All Departments</option>
                                                {(departments || []).map(d => d && <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => setIsRequestModalOpen(true)}
                                            disabled={selectedSubjectIds.size === 0 || isSubmitting}
                                            className="btn-primary h-12 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-100 w-full"
                                        >
                                            <CalendarPlusIcon className="w-5 h-5" />
                                            {isSubmitting ? 'Syncing...' : `Submit Request (${selectedSubjectIds.size})`}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredSubjects.map(subject => (
                                            <SubjectCard
                                                key={subject.id}
                                                subject={subject}
                                                onSelect={() => handleSubjectSelect(subject.id)}
                                                isSelected={selectedSubjectIds.has(subject.id)}
                                                isRequested={requests.some(r => r && r.subjectId === subject.id && r.lecturerId === user?.id)}
                                                isAllocated={allocations.some(a => a && a.subjectId === subject.id && a.lecturerId === user?.id && a.status === 'approved')}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {myRequestsSubTab === 'pending' && (
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                                        <h4 className="font-black text-xs uppercase tracking-widest">Active Application Tracking</h4>
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {myPendingRequests.length > 0 ? myPendingRequests.map(req => {
                                            const subject = getSubjectById(req.subjectId);
                                            return (
                                                <li key={req.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex justify-between items-center transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 shadow-sm">
                                                            <BookOpenIcon className="w-7 h-7" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">{subject?.name}</p>
                                                            <div className="flex items-center gap-4 mt-1">
                                                                <span className="text-xs font-mono text-slate-400 font-black uppercase">{subject?.code}</span>
                                                                <StatusBadge status={req.status} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => { if (window.confirm('Withdraw this application?')) onWithdrawRequest(req.id) }} className="text-red-600 hover:text-red-800 text-[10px] font-black uppercase tracking-widest px-6 py-2 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">Withdraw</button>
                                                </li>
                                            );
                                        }) : <li className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No pending applications found</li>}
                                    </ul>
                                </div>
                            )}

                            {myRequestsSubTab === 'allocations' && (
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                                        <h4 className="font-black text-xs uppercase tracking-widest">Confirmed Academic Load</h4>
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {(allocations || []).length > 0 ? allocations.map(alloc => {
                                            const subject = getSubjectById(alloc.subjectId);
                                            const isLocked = alloc.status === 'change_request_pending' || alloc.status === 'deallocation_pending';

                                            return (
                                                <li key={alloc.id} className={`p-8 hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-all ${isLocked ? 'bg-slate-50/85 dark:bg-slate-800/80 font-medium' : ''}`}>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className={`p-5 rounded-[2rem] shadow-sm ${isLocked ? 'bg-amber-50 text-amber-600' : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'}`}>
                                                                {isLocked ? <ClockIcon className="w-10 h-10 text-amber-600 animate-pulse" /> : <CheckCircleIcon className="w-10 h-10" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{subject?.name}</p>
                                                                    {isLocked && <StatusBadge status={alloc.status} />}
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                                                                    {(academicYears || []).find(y => y && y.id === alloc.academicYearId)?.name || 'N/A'} • {(semesters || []).find(s => s && s.id === alloc.semesterId)?.name || 'N/A'}
                                                                </p>
                                                                {alloc.proposedChanges?.justification && (
                                                                    <p className="text-xs text-orange-600 mt-2 italic font-medium">Pending Justification: "{alloc.proposedChanges.justification}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 w-full sm:w-auto pt-4 sm:pt-0">
                                                            <button
                                                                onClick={() => !isLocked && setChangingAllocation(alloc)}
                                                                disabled={isLocked}
                                                                className={`flex-1 btn-secondary text-[10px] h-11 flex items-center justify-center gap-2 border-slate-200 uppercase tracking-widest shadow-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <ArrowsRightLeftIcon className="w-4 h-4" /> Request Change
                                                            </button>
                                                            <button
                                                                onClick={() => !isLocked && setDeallocatingRequest(alloc)}
                                                                disabled={isLocked}
                                                                className={`flex-1 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 h-11 px-6 rounded-2xl border border-red-100 transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                Request Removal
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        }) : <li className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No confirmed allocations for this period</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'inventory' && props.inventoryItems && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">School Inventory</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage & Issue Stock Items</p>
                                    </div>
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <ArchiveBoxIcon className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {props.inventoryItems.map(item => (
                                        <div key={item.id} className="group bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                    <ArchiveBoxIcon className="w-5 h-5" />
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.quantity > 10 ? 'bg-emerald-50 text-emerald-600' :
                                                    item.quantity > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                            </div>

                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{item.name}</h4>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-4">{item.category}</p>

                                            <button
                                                onClick={() => { setSelectedItem(item); setShowIssueModal(true); }}
                                                disabled={item.quantity <= 0}
                                                className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Issue Item
                                            </button>
                                        </div>
                                    ))}
                                    {props.inventoryItems.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                            No inventory items available to issue.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'eduflow' && (
                        <div className="animate-fade-in-up">
                            <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-350" /></div>}>
                                <EduFlowManager
                                    context="academic"
                                    currentUser={user}
                                    currentInstitution={currentInstitution || null}
                                    subjects={subjects}
                                    users={props.users || []}
                                    courses={courses}
                                />
                            </Suspense>
                        </div>
                    )}

                    {activeTab === 'synergy_hub' && (
                        <div className="animate-fade-in-up">
                            <SynergyHub
                                role="teacher"
                                currentUser={user!}
                                users={props.users || []}
                                subjects={subjects}
                                courses={courses}
                                studentAttendances={props.studentAttendances}
                                assessments={props.assessments}
                                assessmentMarks={props.assessmentMarks}
                            />
                        </div>
                    )}

                    {activeTab === 'self_checkin' && (
                        <div className="animate-fade-in-up bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <TeacherCheckInView
                                currentUser={user}
                                currentInstitution={currentInstitution || ({ id: user?.institutionId || '', name: 'Institution', checkinRadiusEnabled: false } as Institution)}
                                onLogAction={async (action: string) => {
                                    if (props.onLogAction) {
                                        await props.onLogAction(action);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {((activeTab === 'remedials') || (activeTab === 'my_timetable' && timetableSubTab === 'remedials')) && (() => {
                        const activeSession = remedialSessions.find(s => s.status === 'In Progress');

                        // Today's Day Name
                        const todayDayName = (() => {
                            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            return days[new Date().getDay()];
                        })();

                        // Active or upcoming lesson for this teacher today from myRemedialAllocations
                        const todaysScheduledRemedial = (() => {
                            const todayAllocs = myRemedialAllocations.filter(a => 
                                a.dayOfWeek?.toLowerCase() === todayDayName.toLowerCase() && 
                                a.status !== 'Substitute Pending' && a.status !== 'Cancelled'
                            );
                            if (todayAllocs.length === 0) return null;

                            const now = new Date();
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();

                            // 1. Check if within current slot window (-30min early to +30min after end)
                            const currentMatch = todayAllocs.find(a => {
                                const [sh, sm] = (a.startTime || '00:00').split(':').map(Number);
                                const [eh, em] = (a.endTime || '23:59').split(':').map(Number);
                                const startMin = (sh || 0) * 60 + (sm || 0) - 30;
                                const endMin = (eh || 0) * 60 + (em || 0) + 30;
                                return currentMinutes >= startMin && currentMinutes <= endMin;
                            });

                            if (currentMatch) return currentMatch;

                            // 2. Next upcoming today
                            const upcoming = todayAllocs.filter(a => {
                                const [sh, sm] = (a.startTime || '00:00').split(':').map(Number);
                                return ((sh || 0) * 60 + (sm || 0)) >= currentMinutes;
                            });
                            if (upcoming.length > 0) return upcoming[0];

                            // 3. Fallback to first allocation today
                            return todayAllocs[0];
                        })();

                        // Effective Course ID and Subject ID (auto-selected from schedule if not manually picked)
                        const effectiveCourseId = selectedCourseId || todaysScheduledRemedial?.courseId || '';
                        const effectiveSubjectId = selectedSubjectId || todaysScheduledRemedial?.subjectId || '';

                        // Eligible prefects for effective course
                        const targetCourse = courses?.find(c => c.id === effectiveCourseId);
                        const targetCourseName = targetCourse?.name?.toLowerCase().trim() || '';

                        const coursePrefects = (props.users || []).filter(u => {
                            const isStudentOrPrefect = u.role === 'student' || (u.role as string) === 'prefect';
                            if (!isStudentOrPrefect) return false;
                            const classMatch = u.courseId === effectiveCourseId || 
                                ((u as any).studentClass && targetCourseName && (u as any).studentClass.toLowerCase().trim() === targetCourseName);
                            return classMatch;
                        });

                        // Priority prefect (appointed leader or class secretary)
                        const primaryPrefect = (() => {
                            if (selectedPrefectId) {
                                const matched = coursePrefects.find(p => p.id === selectedPrefectId);
                                if (matched) return matched;
                            }
                            if (coursePrefects.length === 0) return null;
                            const leader = coursePrefects.find(u => {
                                const pos = ((u.metadata as any)?.leadershipPosition || (u as any).leadershipPosition || u.role || '').toLowerCase();
                                return pos.includes('prefect') || pos.includes('secretary') || pos.includes('captain') || pos.includes('leader');
                            });
                            return leader || coursePrefects[0];
                        })();

                        const effectivePrefectId = selectedPrefectId || primaryPrefect?.id || '';

                        const handleStartRemedial = async (override?: { courseId?: string; subjectId?: string; prefectId?: string }) => {
                            if (isStartingRemedialRef.current) return;
                            isStartingRemedialRef.current = true;
                            setIsProcessingSession(true);

                            const courseId = override?.courseId || effectiveCourseId;
                            const subjectId = override?.subjectId || effectiveSubjectId;
                            const prefectId = override?.prefectId || effectivePrefectId;

                            if (!subjectId || !courseId) {
                                isStartingRemedialRef.current = false;
                                setIsProcessingSession(false);
                                return alert('Please select subject and class stream before starting.');
                            }

                            // Prevent duplicate session start if teacher already has an active session in progress
                            const existingActiveSession = remedialSessions.find(s => s.teacherId === user?.id && s.status === 'In Progress');
                            if (existingActiveSession) {
                                isStartingRemedialRef.current = false;
                                setIsProcessingSession(false);
                                setIsScannerModalOpen(false);
                                stopCamera();
                                return alert(`Lesson Already In Progress:\nYou already have an active remedial session running for ${existingActiveSession.subjectName} (${existingActiveSession.className}).\n\nPlease conclude that lesson before starting a new one.`);
                            }

                            // Check daily max limit configuration
                            const todayStr = new Date().toDateString();
                            const existingTeacherSessionsToday = remedialSessions.filter(s =>
                                s.teacherId === user?.id && new Date(s.startTime).toDateString() === todayStr
                            );

                            try {
                                const ratesList = await apiService.fetchRemedialRateSettings(currentInstitution?.id || user?.institutionId || '');
                                const todayDow = new Date().getDay(); // 0 = Sun, 6 = Sat
                                const isTodayWeekend = todayDow === 0 || todayDow === 6;
                                const instId = currentInstitution?.id || user?.institutionId || '';
                                const rawRate: any = (ratesList && ratesList.length > 0) ? ratesList[0] : null;
                                const cachedWeekendLimit = safeLocalStorage.getItem(`eduai_remedial_weekend_max_${instId}`);
                                
                                const weekdayLimit = rawRate?.maxLessonsPerDay ?? rawRate?.max_lessons_per_day ?? 1;
                                const weekendLimit = rawRate?.maxWeekendLessonsPerDay ?? 
                                                     rawRate?.max_weekend_lessons_per_day ?? 
                                                     rawRate?.metadata?.maxWeekendLessonsPerDay ?? 
                                                     rawRate?.metadata?.max_weekend_lessons_per_day ?? 
                                                     (cachedWeekendLimit ? Number(cachedWeekendLimit) : undefined) ?? 
                                                     2;
                                const maxLimit = isTodayWeekend ? weekendLimit : weekdayLimit;
                                const limitLabel = isTodayWeekend ? 'weekend' : 'weekday';

                                if (existingTeacherSessionsToday.length >= maxLimit) {
                                    return alert(`Daily Remedial Limit Reached: You have already conducted the maximum ${limitLabel} limit of ${maxLimit} remedial lesson(s) allowed per day.`);
                                }

                                const prefect = props.users?.find(u => u.id === prefectId) || primaryPrefect;
                                const course = courses?.find(c => c.id === courseId);
                                const subject = subjects?.find(s => s.id === subjectId);

                                const courseName = course?.name || todaysScheduledRemedial?.className || 'Class';
                                const subjectName = subject?.name || todaysScheduledRemedial?.subjectName || 'Subject';
                                const stream = todaysScheduledRemedial?.stream || '';
                                const displayClassName = stream && stream !== 'All Streams' && !courseName.includes(stream) 
                                    ? `${courseName} (${stream})` 
                                    : courseName;

                                const matchedAlloc = todaysScheduledRemedial || (myRemedialAllocations || []).find(a =>
                                    (a.courseId === courseId || a.className === displayClassName) &&
                                    (a.subjectId === subjectId || a.subjectName === subjectName)
                                );
                                const schedStart = matchedAlloc?.startTime;
                                const schedEnd = matchedAlloc?.endTime;
                                const schedDurationMins = (schedStart && schedEnd)
                                    ? Math.max(1, timeToMinutes(schedEnd) - timeToMinutes(schedStart))
                                    : 60;

                                const newSession: RemedialSession = {
                                    id: `rem_${Date.now()}`,
                                    teacherId: user?.id || '',
                                    teacherName: user?.name || 'Teacher',
                                    subjectId: subjectId,
                                    subjectName: subjectName,
                                    courseId: courseId,
                                    className: displayClassName,
                                    prefectId: prefect?.id || 'prefect_verified',
                                    prefectName: prefect?.name || 'Class Leader / Secretary',
                                    prefectToken: `prefect_remedial_token_class_${courseId}`,
                                    startTime: new Date().toISOString(),
                                    hours: Math.round((schedDurationMins / 60) * 100) / 100,
                                    durationHours: Math.round((schedDurationMins / 60) * 100) / 100,
                                    duration_hours: Math.round((schedDurationMins / 60) * 100) / 100,
                                    durationMinutes: schedDurationMins,
                                    scheduledStartTime: schedStart,
                                    scheduledEndTime: schedEnd,
                                    scheduledDurationMinutes: schedDurationMins,
                                    allocationId: matchedAlloc?.id,
                                    status: 'In Progress',
                                    createdAt: new Date().toISOString(),
                                    institutionId: currentInstitution?.id || user?.institutionId || ''
                                };

                                await apiService.saveRemedialSession(newSession);
                                props.onLogAction?.(`Started remedial lesson: ${subjectName} for ${displayClassName}`);
                                setIsScannerModalOpen(false);
                                stopCamera();

                                const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                                const schedStartMins = schedStart ? timeToMinutes(schedStart) : null;
                                const isEarly = schedStartMins !== null && nowMins < schedStartMins;
                                const earlyMins = isEarly ? (schedStartMins - nowMins) : 0;
                                const earlyNote = isEarly
                                    ? `\n\nℹ️ Early Login Note: You logged in ${earlyMins} min(s) before scheduled start (${schedStart}). The early ${earlyMins} minute(s) will be omitted so teaching time counts from ${schedStart}.`
                                    : '';

                                alert(`⚡ Remedial Lesson Started!\n\n• Class: ${displayClassName}\n• Subject: ${subjectName}\n• Prefect Sign-off: ${newSession.prefectName}\n• Started: ${new Date().toLocaleTimeString()}${schedStart ? `\n• Timetable Slot: ${schedStart} - ${schedEnd}` : ''}${earlyNote}\n\nThe session timer is now running.`);
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to start remedial session');
                            } finally {
                                isStartingRemedialRef.current = false;
                                setIsProcessingSession(false);
                            }
                        };

                        // Synchronize active remedial context for real-time camera QR badge validation
                        scannerContextRef.current = {
                            courseId: effectiveCourseId,
                            courseName: courses?.find(c => c.id === effectiveCourseId)?.name || todaysScheduledRemedial?.className || 'Selected Class',
                            subjectId: effectiveSubjectId,
                            prefects: coursePrefects,
                            primaryPrefect: primaryPrefect,
                            onStart: handleStartRemedial
                        };

                        const handleSignVoucher = async (e: React.FormEvent) => {
                            e.preventDefault();
                            if (!signingPayout) return;
                            if (!anonymousToken.trim()) {
                                return alert('Please enter an anonymous signature token.');
                            }

                            try {
                                const updatedPayout = {
                                    ...signingPayout,
                                    status: 'Paid' as const,
                                    anonymousSignature: anonymousToken.trim(),
                                    signedAt: new Date().toISOString()
                                };
                                await apiService.saveRemedialPayout(updatedPayout);
                                alert('Payment voucher signed anonymously. Status updated to Paid!');
                                setSigningPayout(null);
                                setAnonymousToken('');
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to sign voucher');
                            }
                        };

                        const handleStartCancellation = (alloc: RemedialAllocation) => {
                            const cutoff = checkCancellationCutoff(
                                alloc.dayOfWeek,
                                alloc.startTime,
                                rateSetting?.cancellationCutoffHours ?? 3
                            );
                            if (!cutoff.canCancel) {
                                alert(cutoff.message || 'Cancellation is locked as the lesson start time is within the restricted cutoff window.');
                                return;
                            }
                            setCancellingAllocation(alloc);
                            setCancellationReason('Medical Emergency');
                            setCancellationNotes('');
                        };

                        const handleConfirmCancellation = async (e: React.FormEvent) => {
                            e.preventDefault();
                            if (!cancellingAllocation) return;

                            const cutoff = checkCancellationCutoff(
                                cancellingAllocation.dayOfWeek,
                                cancellingAllocation.startTime,
                                rateSetting?.cancellationCutoffHours ?? 3
                            );
                            if (!cutoff.canCancel) {
                                alert(cutoff.message || 'Cannot cancel: lesson start time is within restricted cutoff window.');
                                return;
                            }

                            const fullReason = cancellationNotes.trim()
                                ? `${cancellationReason}: ${cancellationNotes.trim()}`
                                : cancellationReason;

                            setIsCancelling(true);
                            try {
                                const timeoutMins = rateSetting?.confirmationTimeoutMinutes ?? 45;
                                const { bestCandidate } = rankSubstituteCandidates({
                                    allocation: cancellingAllocation,
                                    candidates: (props.users || []) as User[],
                                    allAllocations: remedialAllocations,
                                    declinedTeacherIds: cancellingAllocation.declinedTeacherIds || [],
                                    teacherPreferences: rateSetting?.teacherPreferences,
                                    classSubjectAllocations: (currentInstitution as any)?.classSubjectAllocations || {},
                                    maxLessonsPerDay: rateSetting?.maxLessonsPerDay ?? 1,
                                    maxWeekendLessonsPerDay: rateSetting?.maxWeekendLessonsPerDay ?? 2
                                });

                                const updatedAlloc: RemedialAllocation = {
                                    ...cancellingAllocation,
                                    status: bestCandidate ? 'Substitute Pending' : 'Escalated to DOS',
                                    originalTeacherId: user?.id,
                                    originalTeacherName: user?.name,
                                    substituteTeacherId: bestCandidate ? bestCandidate.id : undefined,
                                    substituteTeacherName: bestCandidate ? bestCandidate.name : undefined,
                                    cancellationReason: fullReason,
                                    cancelledAt: new Date().toISOString(),
                                    confirmationDeadline: bestCandidate 
                                        ? new Date(Date.now() + timeoutMins * 60000).toISOString() 
                                        : undefined,
                                    declinedTeacherIds: []
                                };

                                await apiService.saveRemedialAllocation(updatedAlloc);
                                props.onLogAction?.(`Teacher ${user?.name} cancelled remedial ${cancellingAllocation.subjectName} on ${cancellingAllocation.dayOfWeek} (Reason: ${fullReason}). Auto-assigned: ${bestCandidate ? bestCandidate.name : 'None - Escalated to DOS'}`);

                                if (bestCandidate) {
                                    alert(`Lesson cancellation requested successfully!\n\nSubstitute Selected: ${bestCandidate.name}\nConfirmation Deadline: ${timeoutMins} minutes.\n\nIf ${bestCandidate.name} declines or times out, the system will automatically cascade to the next ranked teacher.`);
                                } else {
                                    alert(`Lesson cancellation recorded.\n\nNotice: No qualified substitute teachers were currently available without timetable collisions or daily quota limits.\n\nThis request has been automatically escalated to the Director of Studies (DOS).`);
                                }

                                setCancellingAllocation(null);
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to cancel remedial lesson');
                            } finally {
                                setIsCancelling(false);
                            }
                        };

                        const handleAcceptSubstituteRequest = async (alloc: RemedialAllocation) => {
                            if (!window.confirm(`Confirm accepting substitute lesson for ${alloc.subjectName} (${alloc.className || ''} ${alloc.stream || ''}) on ${alloc.dayOfWeek} at ${alloc.startTime}?`)) return;

                            try {
                                const updated: RemedialAllocation = {
                                    ...alloc,
                                    status: 'Confirmed',
                                    teacherId: user?.id || '',
                                    teacherName: user?.name || 'Teacher',
                                    substituteTeacherId: undefined,
                                    substituteTeacherName: undefined,
                                    confirmationDeadline: undefined
                                };

                                await apiService.saveRemedialAllocation(updated);
                                props.onLogAction?.(`Teacher ${user?.name} accepted substitute lesson for ${alloc.subjectName} on ${alloc.dayOfWeek}`);
                                alert(`Great! You have accepted the lesson. It is now officially registered on your remedial schedule.`);
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to accept substitute request');
                            }
                        };

                        const handleDeclineSubstituteRequest = async (alloc: RemedialAllocation) => {
                            if (!window.confirm(`Decline substitute request for ${alloc.subjectName} on ${alloc.dayOfWeek}? The system will immediately cascade this request to the next available teacher.`)) return;

                            try {
                                const updatedDeclined = [...(alloc.declinedTeacherIds || []), user?.id || ''].filter(Boolean);
                                const timeoutMins = rateSetting?.confirmationTimeoutMinutes ?? 45;

                                const { bestCandidate: nextCandidate } = rankSubstituteCandidates({
                                    allocation: alloc,
                                    candidates: (props.users || []) as User[],
                                    allAllocations: remedialAllocations,
                                    declinedTeacherIds: updatedDeclined,
                                    teacherPreferences: rateSetting?.teacherPreferences,
                                    classSubjectAllocations: (currentInstitution as any)?.classSubjectAllocations || {},
                                    maxLessonsPerDay: rateSetting?.maxLessonsPerDay ?? 1,
                                    maxWeekendLessonsPerDay: rateSetting?.maxWeekendLessonsPerDay ?? 2
                                });

                                const updated: RemedialAllocation = {
                                    ...alloc,
                                    declinedTeacherIds: updatedDeclined,
                                    status: nextCandidate ? 'Substitute Pending' : 'Escalated to DOS',
                                    substituteTeacherId: nextCandidate ? nextCandidate.id : undefined,
                                    substituteTeacherName: nextCandidate ? nextCandidate.name : undefined,
                                    confirmationDeadline: nextCandidate 
                                        ? new Date(Date.now() + timeoutMins * 60000).toISOString() 
                                        : undefined
                                };

                                await apiService.saveRemedialAllocation(updated);
                                props.onLogAction?.(`Teacher ${user?.name} declined substitute lesson for ${alloc.subjectName}. Cascaded to: ${nextCandidate ? nextCandidate.name : 'Escalated to DOS'}`);
                                alert(`You have declined this substitution. The system has automatically forwarded the request to ${nextCandidate ? nextCandidate.name : 'the Director of Studies (DOS)'}.`);
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to decline substitute request');
                            }
                        };

                        const handleRecallSubstituteRequest = async (alloc: RemedialAllocation) => {
                            if (!window.confirm(`Recall your cancellation request for ${alloc.subjectName} on ${alloc.dayOfWeek}? The lesson will be restored directly to your active schedule.`)) return;

                            try {
                                const updated: RemedialAllocation = {
                                    ...alloc,
                                    status: 'Confirmed',
                                    teacherId: user?.id || '',
                                    teacherName: user?.name || 'Teacher',
                                    substituteTeacherId: undefined,
                                    substituteTeacherName: undefined,
                                    confirmationDeadline: undefined,
                                    cancellationReason: undefined,
                                    cancelledAt: undefined
                                };

                                await apiService.saveRemedialAllocation(updated);
                                props.onLogAction?.(`Teacher ${user?.name} recalled cancellation for remedial ${alloc.subjectName} on ${alloc.dayOfWeek}`);
                                alert(`Cancellation recalled! The lesson is restored to your active timetable.`);
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to recall cancellation');
                            }
                        };

                        return (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* 1. INCOMING SUBSTITUTE REQUESTS NOTIFICATION BANNER */}
                                {pendingSubstituteRequests.length > 0 && (
                                    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 rounded-[2.5rem] shadow-xl text-white space-y-4 border-2 border-white/20 animate-fade-in">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                                                    <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black uppercase tracking-wider">
                                                        Action Required: Incoming Substitute Request ({pendingSubstituteRequests.length})
                                                    </h3>
                                                    <p className="text-xs text-amber-100 font-medium">
                                                        You were auto-selected as priority substitute based on subject alignment and schedule availability.
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-white text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest shadow shrink-0">
                                                Priority Candidate
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            {pendingSubstituteRequests.map(req => {
                                                const remainingMins = getRemainingMinutes(req.confirmationDeadline);
                                                const isExpired = isConfirmationExpired(req.confirmationDeadline);
                                                return (
                                                    <div key={req.id} className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 space-y-3">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h4 className="text-sm font-black uppercase tracking-wide text-white">{req.subjectName}</h4>
                                                                <p className="text-xs font-bold text-amber-200 uppercase mt-0.5">
                                                                    {req.className} {req.stream && req.stream !== 'All Streams' ? `• ${req.stream}` : ''}
                                                                </p>
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 ${
                                                                isExpired ? 'bg-red-500 text-white' : 'bg-black/30 text-amber-200'
                                                            }`}>
                                                                <Clock className="w-3 h-3" /> {isExpired ? 'Expired' : `${remainingMins}m to respond`}
                                                            </span>
                                                        </div>

                                                        <div className="text-[11px] space-y-1 text-white/90">
                                                            <p className="flex items-center gap-1.5 font-medium">
                                                                <Calendar className="w-3.5 h-3.5 text-amber-200" />
                                                                <span>{req.dayOfWeek} • {req.startTime} – {req.endTime}</span>
                                                            </p>
                                                            <p className="flex items-center gap-1.5 text-amber-100">
                                                                <UserX className="w-3.5 h-3.5 text-amber-200" />
                                                                <span>Original Teacher: <strong className="text-white">{req.originalTeacherName || req.teacherName}</strong></span>
                                                            </p>
                                                            {req.cancellationReason && (
                                                                <p className="text-[10px] italic bg-black/20 p-2 rounded-xl text-amber-100">
                                                                    Reason: "{req.cancellationReason}"
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="pt-2 flex items-center gap-2 border-t border-white/15">
                                                            <button
                                                                onClick={() => handleAcceptSubstituteRequest(req)}
                                                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" /> Accept Lesson
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeclineSubstituteRequest(req)}
                                                                className="px-4 py-2.5 bg-white/20 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                            >
                                                                <X className="w-4 h-4" /> Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 2. MY REMEDIAL SCHEDULE & ALLOCATIONS */}
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                                        <div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-indigo-500" /> My Remedial Schedule &amp; Allocations
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Your assigned weekly timetable. If you cannot attend, request a substitute outside the restricted {rateSetting?.cancellationCutoffHours ?? 3}-hour cutoff window.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {myRemedialAllocations.length} Assigned Session{myRemedialAllocations.length === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    </div>

                                    {myRemedialAllocations.length === 0 ? (
                                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No remedial sessions currently allocated to you</p>
                                            <p className="text-[10px] text-slate-400 mt-1">Check back once the Director of Studies publishes the weekly timetable.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {myRemedialAllocations.map(alloc => {
                                                const nextDate = getNextOccurrenceDate(alloc.dayOfWeek, alloc.startTime);
                                                const cutoff = checkCancellationCutoff(alloc.dayOfWeek, alloc.startTime, rateSetting?.cancellationCutoffHours ?? 3);
                                                const isSubPending = alloc.status === 'Substitute Pending';
                                                const isEscalated = alloc.status === 'Escalated to DOS';

                                                return (
                                                    <div 
                                                        key={alloc.id}
                                                        className={`p-5 rounded-3xl border transition-all space-y-3 ${
                                                            isSubPending
                                                                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                                                                : isEscalated
                                                                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                                                                : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight">{alloc.subjectName}</h4>
                                                                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                                                                    {alloc.className} {alloc.stream && alloc.stream !== 'All Streams' ? `• ${alloc.stream}` : ''}
                                                                </p>
                                                            </div>
                                                            {alloc.priority === 'High' && (
                                                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[8px] font-black uppercase flex items-center gap-0.5">
                                                                    <Flame className="w-2.5 h-2.5 text-rose-500" /> High Prio
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                                                            <p className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200 font-bold">
                                                                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                <span>{alloc.dayOfWeek} • {alloc.startTime} - {alloc.endTime}</span>
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Next: {nextDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {alloc.startTime}
                                                            </p>
                                                        </div>

                                                        {/* Status Badges */}
                                                        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                                                            {isSubPending ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5 animate-spin" /> Sub: {alloc.substituteTeacherName || 'Pending'}
                                                                </span>
                                                            ) : isEscalated ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 text-[9px] font-black uppercase flex items-center gap-1">
                                                                    <AlertTriangle className="w-2.5 h-2.5" /> Escalated to DOS
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                                                                </span>
                                                            )}

                                                            {/* Cutoff Window Status */}
                                                            {cutoff.canCancel ? (
                                                                <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400" title={`Cancellation allowed until ${rateSetting?.cancellationCutoffHours || 3}h before start`}>
                                                                    Notice: {cutoff.hoursRemaining.toFixed(0)}h
                                                                </span>
                                                            ) : (
                                                                <span className="text-[8.5px] font-bold text-rose-500 flex items-center gap-0.5" title={cutoff.message}>
                                                                    <Lock className="w-2.5 h-2.5" /> Locked
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="pt-1">
                                                            {isSubPending ? (
                                                                <button
                                                                    onClick={() => handleRecallSubstituteRequest(alloc)}
                                                                    className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <RotateCcw className="w-3 h-3" /> Recall Cancellation
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleStartCancellation(alloc)}
                                                                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                                                        cutoff.canCancel
                                                                            ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300'
                                                                            : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                                    title={cutoff.canCancel ? 'Cancel and auto-assign next qualified substitute' : cutoff.message}
                                                                >
                                                                    {cutoff.canCancel ? (
                                                                        <>
                                                                            <UserX className="w-3 h-3" /> Cancel / Request Sub
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Lock className="w-3 h-3" /> Cutoff Passed (Locked)
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                                        <div className="flex items-center gap-2">
                                            <QrCode className="w-5 h-5 text-indigo-500" />
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                Prefect Card Scanner Control Panel
                                            </h3>
                                        </div>
                                        {todaysScheduledRemedial && !activeSession && (
                                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm">
                                                <Zap className="w-3 h-3 text-emerald-500" /> Today's Scheduled Lesson Linked
                                            </span>
                                        )}
                                    </div>
                                    
                                    {activeSession ? (
                                        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-slate-800 dark:to-violet-950/20 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/50 space-y-4 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                                                    <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider">Lesson Currently In Progress</h4>
                                                </div>
                                                <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                    Active Session
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">Subject</p>
                                                    <p className="text-slate-900 dark:text-white font-black text-sm mt-0.5">{activeSession.subjectName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">Class Stream</p>
                                                    <p className="text-slate-900 dark:text-white font-black text-sm mt-0.5">{activeSession.className}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">Prefect Verified</p>
                                                    <p className="text-slate-900 dark:text-white font-black text-sm mt-0.5">{activeSession.prefectName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">Started At</p>
                                                    <p className="text-slate-900 dark:text-white font-black text-sm mt-0.5">{new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    {activeSession.scheduledStartTime && (
                                                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                                                            Timetable: {activeSession.scheduledStartTime} - {activeSession.scheduledEndTime || 'End'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-indigo-100 dark:border-indigo-900/40">
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    Ready to conclude? Click below to immediately end this session and submit verified hours (no camera or scanner required).
                                                </p>
                                                <button 
                                                    onClick={() => handleEndRemedial(activeSession)}
                                                    className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 active:scale-95 shrink-0 cursor-pointer"
                                                >
                                                    <Square className="w-4 h-4" /> End Remedial Lesson Now
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {/* Auto-Detected Schedule Card */}
                                            {todaysScheduledRemedial && (
                                                <div className="bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 dark:from-slate-900/70 dark:via-slate-800 dark:to-indigo-950/30 p-6 sm:p-7 rounded-[2rem] border-2 border-indigo-200/80 dark:border-indigo-900/50 shadow-md space-y-5 animate-fade-in">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/40 pb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/30">
                                                                <Zap className="w-6 h-6 animate-pulse" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                                        ⚡ Auto-Selected from Timetable
                                                                    </span>
                                                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                                                                        {todaysScheduledRemedial.startTime} – {todaysScheduledRemedial.endTime}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                                                                    {todaysScheduledRemedial.subjectName} &bull; {todaysScheduledRemedial.className}
                                                                    {todaysScheduledRemedial.stream && todaysScheduledRemedial.stream !== 'All Streams' && !(todaysScheduledRemedial.className || '').includes(todaysScheduledRemedial.stream) ? ` (${todaysScheduledRemedial.stream})` : ''}
                                                                </h4>
                                                            </div>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class Prefect / Secretary</p>
                                                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                                {primaryPrefect?.name || 'Class Leader'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* 1-Tap Action Bar */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <button
                                                            onClick={() => setIsScannerModalOpen(true)}
                                                            className="flex-1 sm:flex-initial px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                        >
                                                            <Camera className="w-4 h-4" /> Launch Prefect Scanner to Start
                                                        </button>

                                                        <button
                                                            onClick={() => handleStartRemedial()}
                                                            className="flex-1 sm:flex-initial px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                                                            title="Immediately start lesson with auto-detected class and prefect"
                                                        >
                                                            <Play className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> 1-Tap Quick Start
                                                        </button>

                                                        <button
                                                            onClick={() => setShowManualOverride(prev => !prev)}
                                                            className="px-4 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                                            <span>{showManualOverride ? 'Hide Override' : 'Change Class / Subject'}</span>
                                                            {showManualOverride ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Manual Override Dropdowns (Always available when toggled or when no scheduled lesson exists today) */}
                                            {(showManualOverride || !todaysScheduledRemedial) && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 animate-fade-in">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Subject</label>
                                                        <select 
                                                            value={selectedSubjectId || effectiveSubjectId}
                                                            onChange={e => setSelectedSubjectId(e.target.value)}
                                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none dark:text-white"
                                                        >
                                                            <option value="">-- Subject --</option>
                                                            {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Class Stream</label>
                                                        <select 
                                                            value={selectedCourseId || effectiveCourseId}
                                                            onChange={e => { setSelectedCourseId(e.target.value); setSelectedPrefectId(''); }}
                                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none dark:text-white"
                                                        >
                                                            <option value="">-- Stream --</option>
                                                            {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Prefect Present</label>
                                                        <select 
                                                            value={selectedPrefectId || effectivePrefectId}
                                                            onChange={e => setSelectedPrefectId(e.target.value)}
                                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none dark:text-white"
                                                            disabled={!effectiveCourseId}
                                                        >
                                                            <option value="">-- Prefect --</option>
                                                            {coursePrefects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>

                                                    <div className="md:col-span-3 pt-3 flex items-center gap-3">
                                                        <button 
                                                            onClick={() => setIsScannerModalOpen(true)}
                                                            disabled={!effectiveSubjectId || !effectiveCourseId}
                                                            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Camera className="w-4 h-4" /> Launch Scanner
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStartRemedial()}
                                                            disabled={!effectiveSubjectId || !effectiveCourseId}
                                                            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Play className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Start Selected Lesson
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Prefect Card Scanner Modal Viewfinder with Real Camera Hardware */}
                                    {isScannerModalOpen && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                                            <div className="bg-slate-900 text-white w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
                                                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                                            <Scan className="w-5 h-5 animate-pulse" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-black uppercase tracking-wider text-white">Prefect Card Scanner</h3>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Remedial Lesson Attendance Verification</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={toggleCameraFacing}
                                                            title={cameraFacingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Rear Camera'}
                                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-700/60"
                                                        >
                                                            <SwitchCamera className="w-4 h-4 text-indigo-400" />
                                                            <span className="text-[10px] uppercase font-black text-slate-300">
                                                                {cameraFacingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={() => setIsScannerModalOpen(false)}
                                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Target Lesson Summary */}
                                                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between text-xs font-bold">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Class &amp; Subject</span>
                                                        <span className="text-white text-sm font-black">
                                                            {(courses?.find(c => c.id === effectiveCourseId)?.name || todaysScheduledRemedial?.className || 'Class')} &bull; {(subjects?.find(s => s.id === effectiveSubjectId)?.name || todaysScheduledRemedial?.subjectName || 'Subject')}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Prefect Sign-Off</span>
                                                        <span className="text-indigo-400 font-black">{primaryPrefect?.name || 'Class Leader'}</span>
                                                    </div>
                                                </div>

                                                {/* Live Camera Viewfinder with Laser Scanner */}
                                                <div className="relative aspect-video bg-black rounded-3xl border-2 border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden text-center shadow-2xl">
                                                    {/* Live Video Stream from Device Camera */}
                                                    <video
                                                        ref={handleScannerVideoRef}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                                                    />

                                                    {/* Camera Standby or Permission Denied Notification */}
                                                    {!isCameraActive && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950 text-center space-y-3">
                                                            {cameraError ? (
                                                                <>
                                                                    <AlertCircle className="w-10 h-10 text-rose-500 animate-pulse" />
                                                                    <p className="text-xs font-bold text-rose-400 max-w-xs">{cameraError}</p>
                                                                    <button
                                                                        onClick={() => startCamera(cameraFacingMode)}
                                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                                                                    >
                                                                        Grant Camera Access / Retry
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Camera className="w-10 h-10 text-indigo-400 animate-pulse" />
                                                                    <p className="text-xs font-bold text-slate-200">Opening Camera Hardware...</p>
                                                                    <p className="text-[10px] text-slate-400">Please tap "Allow" if your browser asks for camera permission.</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Reticle Viewfinder Corners */}
                                                    <div className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-indigo-400 rounded-tl-xl pointer-events-none" />
                                                    <div className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-indigo-400 rounded-tr-xl pointer-events-none" />
                                                    <div className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-indigo-400 rounded-bl-xl pointer-events-none" />
                                                    <div className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-indigo-400 rounded-br-xl pointer-events-none" />

                                                    {/* Laser Scan line animation across the camera view */}
                                                    {isCameraActive && (
                                                        <div 
                                                            className={`absolute inset-x-8 h-0.5 pointer-events-none transition-all duration-300 ${
                                                                qrValidationError
                                                                    ? 'bg-rose-500 shadow-[0_0_16px_#f43f5e]'
                                                                    : scannedBadgeSuccess 
                                                                        ? 'bg-emerald-400 shadow-[0_0_16px_#10b981]' 
                                                                        : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-bounce'
                                                            }`} 
                                                            style={{ animationDuration: '2s' }} 
                                                        />
                                                    )}

                                                    {/* Validation Error Alert Banner */}
                                                    {qrValidationError && (
                                                        <div className="absolute inset-x-4 top-14 p-3 bg-rose-950/95 border border-rose-500/80 rounded-2xl backdrop-blur-md flex items-center gap-2.5 text-left text-xs font-bold text-rose-200 z-20 shadow-2xl animate-fade-in">
                                                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-black text-rose-300 text-[10px] uppercase tracking-wider">Badge Rejected</p>
                                                                <p className="text-[11px] leading-tight text-white mt-0.5">{qrValidationError}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Success Popup when badge is detected and validated */}
                                                    {scannedBadgeSuccess && scannedVerifiedPrefect && (
                                                        <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
                                                            <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-scale-up mb-2" />
                                                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Prefect Card Verified!</h4>
                                                            <p className="text-xs font-bold text-emerald-200 mt-1">Prefect: {scannedVerifiedPrefect.name}</p>
                                                            <p className="text-[10px] text-emerald-300/80 mt-0.5">Authorized leader for {(courses?.find(c => c.id === effectiveCourseId)?.name || 'this class')}. Starting lesson...</p>
                                                        </div>
                                                    )}

                                                    {/* Camera Active Status Pill */}
                                                    {isCameraActive && (
                                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/85 border border-slate-700/80 rounded-full flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 backdrop-blur-xs pointer-events-none shadow-lg">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                            {cameraFacingMode === 'environment' ? 'Rear Camera (Default)' : 'Front Camera'} Active
                                                        </div>
                                                    )}

                                                    {/* Viewfinder Guidance Footer */}
                                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/80 border border-slate-700/60 rounded-full text-[9px] font-bold text-slate-300 pointer-events-none whitespace-nowrap">
                                                        Align Rear Camera with Prefect QR Badge
                                                    </div>
                                                </div>

                                                {/* Trigger Buttons */}
                                                <div className="space-y-3">
                                                    {scannedVerifiedPrefect ? (
                                                        <button
                                                            id="btn-verify-prefect-start"
                                                            onClick={() => handleStartRemedial({
                                                                courseId: effectiveCourseId,
                                                                subjectId: effectiveSubjectId,
                                                                prefectId: scannedVerifiedPrefect.id
                                                            })}
                                                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Start Lesson &bull; Verified: {scannedVerifiedPrefect.name}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            id="btn-verify-prefect-start"
                                                            disabled
                                                            className="w-full py-4 bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                                                        >
                                                            <Clock className="w-4 h-4 animate-spin text-amber-400" /> Awaiting Valid Prefect QR Scan...
                                                        </button>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Or paste / scan card token manually..."
                                                            value={scannerManualToken}
                                                            onChange={e => setScannerManualToken(e.target.value)}
                                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                                                        />
                                                        {scannerManualToken && (
                                                            <button
                                                                onClick={() => {
                                                                    const ctx = scannerContextRef.current;
                                                                    const raw = scannerManualToken.trim();
                                                                    const expectedPrefix = `prefect_remedial_token_class_${ctx.courseId}`;
                                                                    let matched = null;
                                                                    let err = '';

                                                                    if (raw.includes(expectedPrefix)) {
                                                                        matched = ctx.primaryPrefect || ctx.prefects[0] || { id: 'prefect_verified', name: 'Class Leader' };
                                                                    } else if (raw.includes('prefect_remedial_token_class_')) {
                                                                        err = `Wrong Class: This token belongs to another class, not ${ctx.courseName}.`;
                                                                    } else {
                                                                        matched = ctx.prefects.find(p => 
                                                                            (p.id && raw === p.id) ||
                                                                            (p.admissionNumber && raw.toLowerCase().includes(p.admissionNumber.toLowerCase())) ||
                                                                            (p.name && raw.toLowerCase().includes(p.name.toLowerCase()))
                                                                        );
                                                                        if (!matched) {
                                                                            err = `Token Rejected: Not an authorized Prefect for ${ctx.courseName}.`;
                                                                        }
                                                                    }

                                                                    if (err || !matched) {
                                                                        setQrValidationError(err);
                                                                        alert(`❌ Validation Failed:\n${err}`);
                                                                        return;
                                                                    }

                                                                    setScannedBadgeSuccess(true);
                                                                    setScannedVerifiedPrefect(matched);
                                                                    setQrValidationError(null);
                                                                    setIsProcessingSession(true);
                                                                    ctx.onStart({
                                                                        courseId: ctx.courseId,
                                                                        subjectId: ctx.subjectId,
                                                                        prefectId: matched.id
                                                                    });
                                                                }}
                                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                Validate &amp; Start
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Teacher Pre-Funded Earnings & M-Pesa Cash-Out Wallet */}
                                {user?.id && (currentInstitution?.id || user?.institutionId) && (
                                    <div className="mb-8">
                                        <TeacherWalletCard
                                            teacherId={user.id}
                                            institutionId={currentInstitution?.id || user?.institutionId || ''}
                                            teacherName={user.name || 'Teacher'}
                                            defaultPhone={user.phone || ''}
                                            onBalanceChange={loadRemedialData}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider italic flex items-center gap-2">
                                            <Clock className="w-4.5 h-4.5 text-indigo-500" /> Remedial Hours Logged
                                        </h4>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                                            {remedialSessions.length === 0 ? (
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider py-8 text-center">No logs recorded.</p>
                                            ) : (
                                                remedialSessions.map(s => (
                                                    <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                                                {s.subjectName || subjects?.find(sub => sub.id === s.subjectId)?.name || 'Remedial Subject'}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                                {(s.className || courses?.find(c => c.id === s.courseId)?.name || 'Class')} • pref. {s.prefectName || 'Verified'}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 font-medium">{new Date(s.startTime).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {s.status === 'In Progress' ? (
                                                                <p className="text-xs font-black text-amber-500 uppercase tracking-wider">In Progress</p>
                                                            ) : (
                                                                <p className="text-xs font-black text-slate-900 dark:text-white">
                                                                    {s.hours || (s as any).durationHours || (s as any).duration_hours || (s.endTime && s.startTime ? Math.max(1, Math.round(((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000) * 10) / 10) : 1)} hrs
                                                                </p>
                                                            )}
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest inline-block mt-1 ${
                                                                s.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                                s.status === 'Cash Issued to DOS' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' :
                                                                s.status === 'Pending Operations Payout' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                                                                s.status === 'Pending Headteacher Approval' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                                                s.status === 'Pending Duty Approval' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                                s.status === 'Duty Rejected - Forwarded to Headteacher' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                                                                s.status === 'Headteacher Rejected' ? 'bg-red-200 text-red-800 dark:bg-red-950/80 dark:text-red-300' :
                                                                s.status === 'Approved' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' :
                                                                s.status === 'Prefect Confirmed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {s.status}
                                                            </span>
                                                            {s.dutyRejectionReason && (
                                                                <p className="text-[8px] text-rose-500 font-bold mt-0.5 max-w-[160px] truncate" title={s.dutyRejectionReason}>
                                                                    TOD Rejected: {s.dutyRejectionReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider italic flex items-center gap-2">
                                            <DollarSign className="w-4.5 h-4.5 text-indigo-500" /> My Payout Vouchers
                                        </h4>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                                            {remedialPayouts.length === 0 ? (
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider py-8 text-center">No payout history.</p>
                                            ) : (
                                                remedialPayouts.map(p => (
                                                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <div>
                                                            <p className="text-xs font-black text-purple-650 font-mono">Voucher #{p.id.split('_')[1] || p.id}</p>
                                                            <p className="text-[10px] font-black text-indigo-650 font-mono mt-0.5">KES {p.totalAmount.toLocaleString()}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Period: {p.totalHours} hrs @ KES {p.hourlyRate}/hr</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {p.status === 'Pending' ? (
                                                                <button 
                                                                    onClick={() => setSigningPayout(p)}
                                                                    className="px-3.5 py-2 bg-indigo-650 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm"
                                                                >
                                                                    Sign Voucher
                                                                </button>
                                                            ) : (
                                                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed Anonymous
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {signingPayout && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Sign Payment Voucher Anonymously</h3>
                                                <button onClick={() => setSigningPayout(null)} className="text-slate-400 hover:text-slate-650">&times;</button>
                                            </div>
                                            <form onSubmit={handleSignVoucher} className="p-6 space-y-4">
                                                <div className="text-center p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payout Amount</p>
                                                    <p className="text-2xl font-black text-indigo-650 mt-0.5">KES {signingPayout.totalAmount.toLocaleString()}</p>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Anonymous Signature Token</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text"
                                                            value={anonymousToken}
                                                            onChange={e => setAnonymousToken(e.target.value)}
                                                            placeholder="Enter signature (e.g. SIG-XXXXXX)"
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white"
                                                            required
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setAnonymousToken(`SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)}
                                                            className="px-3 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
                                                        >
                                                            Generate
                                                        </button>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                                                        Your teacher identification details will **not** be recorded in the final signed voucher list to maintain complete anonymity.
                                                    </p>
                                                </div>

                                                <button 
                                                    type="submit"
                                                    className="w-full py-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all mt-4"
                                                >
                                                    Confirm & Sign Anonymously
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* ===== CANCELLATION & AUTO-SUBSTITUTION MODAL ===== */}
                                {cancellingAllocation && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <UserX className="w-4 h-4 text-rose-500" /> Cancel Remedial &amp; Auto-Assign Sub
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Priority substitute auto-reassignment engine</p>
                                                </div>
                                                <button onClick={() => setCancellingAllocation(null)} className="text-slate-400 hover:text-slate-650 text-xl font-bold">&times;</button>
                                            </div>

                                            <form onSubmit={handleConfirmCancellation} className="p-6 space-y-4">
                                                {/* Lesson Details */}
                                                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl space-y-1">
                                                    <p className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase">{cancellingAllocation.subjectName}</p>
                                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                        {cancellingAllocation.className} {cancellingAllocation.stream ? `• ${cancellingAllocation.stream}` : ''}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                        {cancellingAllocation.dayOfWeek} at {cancellingAllocation.startTime} – {cancellingAllocation.endTime}
                                                    </p>
                                                </div>

                                                {/* Priority System Notice */}
                                                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-[10px] text-indigo-900 dark:text-indigo-300 space-y-1">
                                                    <p className="font-bold flex items-center gap-1">
                                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                        How Auto-Reassignment Works:
                                                    </p>
                                                    <ul className="list-disc list-inside space-y-0.5 text-[9.5px] text-slate-600 dark:text-slate-400 pl-1">
                                                        <li>Evaluates qualified subject teachers and preferred day availability.</li>
                                                        <li>Verifies candidate timetable collisions and daily lesson quotas.</li>
                                                        <li>Auto-assigns top-ranked candidate with a {rateSetting?.confirmationTimeoutMinutes ?? 45}-min confirmation timer.</li>
                                                        <li>Cascades automatically to next candidate if declined or timed out.</li>
                                                    </ul>
                                                </div>

                                                {/* Cancellation Reason Selection */}
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                                        Reason for Cancellation
                                                    </label>
                                                    <select
                                                        value={cancellationReason}
                                                        onChange={e => setCancellationReason(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-rose-500 dark:text-white"
                                                        required
                                                    >
                                                        <option value="Medical Emergency">🏥 Medical Emergency / Illness</option>
                                                        <option value="Official School Duty">🏫 Official School Assignment / Duty</option>
                                                        <option value="Family Emergency">👨‍👩‍👧 Family Emergency</option>
                                                        <option value="Approved Academic Leave">📄 Approved Academic / Exam Leave</option>
                                                        <option value="Urgent Personal Matter">⏳ Urgent Personal Matter</option>
                                                        <option value="Other">📝 Other (Specify below)</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                                        Additional Notes for Substitute &amp; DOS (Optional)
                                                    </label>
                                                    <textarea
                                                        value={cancellationNotes}
                                                        onChange={e => setCancellationNotes(e.target.value)}
                                                        placeholder="e.g. Please cover Form 4 Quadratic Equations Chapter 5..."
                                                        rows={2}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:border-rose-500 dark:text-white"
                                                    />
                                                </div>

                                                <div className="pt-2 flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCancellingAllocation(null)}
                                                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200"
                                                    >
                                                        Keep Lesson
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={isCancelling}
                                                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {isCancelling ? 'Assigning...' : 'Cancel & Auto-Assign'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {activeTab === 'lesson_plans' && (
                        <div className="animate-fade-in space-y-6 w-full">
                            <TeacherLessonPlanManager
                                currentInstitution={currentInstitution}
                                currentUser={user}
                                subjects={subjects}
                                courses={courses}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Glassmorphic Bottom Navigation Bar */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 bg-white/80 dark:bg-slate-900/85 backdrop-blur-lg border border-slate-200/40 dark:border-slate-800/45 rounded-3xl p-2.5 shadow-2xl flex justify-around items-center no-print">
                {[
                    { id: 'dashboard', label: 'Home', icon: <CalendarPlusIcon className="w-5.5 h-5.5" /> },
                    { id: 'my_timetable', label: 'Schedule', icon: <ClockIcon className="w-5.5 h-5.5" /> },
                    { id: 'self_checkin', label: 'Check-In', icon: <ClockInIcon className="w-5.5 h-5.5" /> },
                    { id: 'eduflow', label: 'Tasks', icon: <ClipboardListIcon className="w-5.5 h-5.5" /> },
                    { id: 'more', label: 'More', icon: (
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    ) }
                ].map((item) => {
                    const isMore = item.id === 'more';
                    const mainTabs = ['dashboard', 'my_timetable', 'self_checkin', 'eduflow'];
                    const isActive = isMore 
                        ? !mainTabs.includes(activeTab) 
                        : activeTab === item.id;
                    
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (isMore) {
                                    setShowMoreDrawer(true);
                                } else {
                                    setActiveTab(item.id);
                                    setShowMoreDrawer(false);
                                }
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
                                isActive 
                                    ? 'text-indigo-600 dark:text-indigo-400 scale-110' 
                                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                            }`}
                        >
                            <div className="relative">
                                {item.icon}
                                {isActive && (
                                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500" />
                                )}
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Mobile Bottom Sheets - "More" Options Drawer */}
            {showMoreDrawer && (
                <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in flex items-end no-print">
                    <div className="absolute inset-0" onClick={() => setShowMoreDrawer(false)} />
                    
                    <div className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10 animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-250 dark:bg-slate-800 rounded-full mx-auto my-4 cursor-pointer shrink-0" onClick={() => setShowMoreDrawer(false)} />
                        
                        <div className="px-6 pb-2 shrink-0">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Additional Services</h3>
                            <p className="text-slate-850 dark:text-white text-md font-black uppercase tracking-tight mt-0.5 font-bold">Academic Control Panel</p>
                        </div>
                        
                        <div className="overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'academic_hub', label: 'Academic Hub' },
                                    { id: 'remedials', label: 'Remedials Hub' },
                                    { id: 'class_supervisor_attendance', label: 'Class Attendance', enabled: canAccessLeaveOutAndSupervisor },
                                    { id: 'student_leave_out', label: 'Student Leave Out', enabled: canAccessLeaveOutAndSupervisor },
                                    { id: 'scan_session', label: 'Scanner Module' },
                                    { id: 'synergy_hub', label: 'Synergy Hub' },
                                    { id: 'my_requests', label: 'Load Requests', enabled: useRequests },
                                    { id: 'inventory', label: 'Inventory Desk', enabled: props.inventoryItems && props.inventoryItems.length > 0 }
                                ]
                                .filter(x => x.enabled !== false)
                                .map((item) => {
                                    const isActive = item.id === 'remedials' 
                                        ? (activeTab === 'my_timetable' && timetableSubTab === 'remedials') 
                                        : (activeTab === item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                if (item.id === 'remedials') {
                                                    setActiveTab('my_timetable');
                                                    setTimetableSubTab('remedials');
                                                } else {
                                                    setActiveTab(item.id);
                                                }
                                                setShowMoreDrawer(false);
                                            }}
                                            className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-300 border ${
                                                isActive
                                                    ? 'bg-indigo-600/5 dark:bg-indigo-950/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 scale-102 font-bold'
                                                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-750">
                                                {renderTabIcon(item.id, "w-6 h-6")}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest mt-3 text-center">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <button
                                onClick={() => setShowMoreDrawer(false)}
                                className="w-full py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                Close Panels
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {isRequestModalOpen && (
                <RequestModal
                    subjects={Array.from(selectedSubjectIds).map(id => getSubjectById(id)!).filter(Boolean)}
                    user={user}
                    courses={courses || []}
                    timetableSettings={timetableSettings}
                    onClose={() => setIsRequestModalOpen(false)}
                    onSubmit={handleRequestSubmit}
                />
            )}

            {changingAllocation && (
                <ChangeRequestModal
                    allocation={changingAllocation}
                    subject={getSubjectById(changingAllocation.subjectId)!}
                    user={user}
                    onClose={() => setChangingAllocation(null)}
                    onSubmit={(id, just, prio) => { onAllocationChangeRequest?.(id, just, prio); setChangingAllocation(null); }}
                />
            )}

            {deallocatingRequest && (
                <DeallocationModal
                    subject={getSubjectById(deallocatingRequest.subjectId)!}
                    onClose={() => setDeallocatingRequest(null)}
                    onSubmit={(justification) => { onDeallocationRequest?.(deallocatingRequest.id, justification); setDeallocatingRequest(null); }}
                />
            )}

            {showIssueModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Issue Item</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedItem.name}</p>
                            </div>
                            <button onClick={() => setShowIssueModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleIssueSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Recipient (Student/Staff)</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={issueForm.recipientId}
                                        onChange={e => setIssueForm({ ...issueForm, recipientId: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                                    >
                                        <option value="">Select Recipient...</option>
                                        {(props.users || []).map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                                        ))}
                                    </select>
                                    <UserGroupIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Quantity to Issue</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedItem.quantity}
                                    required
                                    value={issueForm.quantity}
                                    onChange={e => setIssueForm({ ...issueForm, quantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                />
                                <p className="text-[10px] font-bold text-slate-400 mt-2 text-right uppercase tracking-wider">Available: {selectedItem.quantity} {selectedItem.unit}</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowIssueModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Issuing...' : 'Confirm Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Teacher Student Clearance Sign-off Modal */}
            {isTeacherClearanceModalOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight">
                                        Pending Student Clearance Requests
                                    </h3>
                                    <p className="text-xs text-white/90">
                                        Confirm that students have returned all books, equipment, and learning materials
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTeacherClearanceModalOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-white/20 transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-3 flex-1">
                            {pendingTeacherClearances.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                                    All student clearances signed! No pending requests.
                                </div>
                            ) : (
                                pendingTeacherClearances.map((req, idx) => {
                                    const inputKey = `${req.clearanceId}_${req.item.sNo}`;
                                    const lostText = lostItemInputs[inputKey] ?? '';

                                    return (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900 dark:text-white text-xs">
                                                        {req.studentName}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-[10px] uppercase">
                                                        {req.item.subjectArea}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-mono text-slate-400">
                                                    Adm: {req.admissionNumber} • {req.grade}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <input
                                                    type="text"
                                                    placeholder="Item lost/damaged (or None)"
                                                    value={lostText}
                                                    onChange={e => setLostItemInputs(prev => ({ ...prev, [inputKey]: e.target.value }))}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-400 flex-1 sm:w-48"
                                                />
                                                <button
                                                    onClick={() => handleTeacherSignClearance(req.clearanceId, req.item.sNo, lostText || 'None')}
                                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase cursor-pointer shrink-0 shadow-sm"
                                                >
                                                    Sign & Clear ✓
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setIsTeacherClearanceModalOpen(false)}
                                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .btn-primary { background: var(--color-primary); color: white; padding: 0.5rem 1rem; border-radius: 0.75rem; border: none; transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .btn-secondary { background: white; color: #475569; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .dark .btn-secondary { background: #0f172a; color: #f1f5f9; border-color: #334155; }
      `}</style>
        </div>
    );
};

