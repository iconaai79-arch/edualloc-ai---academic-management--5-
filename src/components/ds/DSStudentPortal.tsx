import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    QrCode,
    Camera,
    Wallet,
    Receipt,
    Calendar,
    Award,
    CheckCircle2,
    AlertCircle,
    Download,
    Share2,
    FileText,
    Sparkles,
    ChevronRight,
    X,
    RefreshCw,
    Printer,
    Phone,
    ShieldCheck,
    Briefcase,
    GraduationCap,
    LogOut,
    Car,
    Clock,
    User as UserIcon,
    Copy,
    Zap,
    ExternalLink,
    ChevronDown,
    MapPin,
    ArrowRight,
    Smartphone,
    MoreVertical,
    PlusSquare,
    HelpCircle,
    Check,
    Bell,
    BellRing,
    Timer,
    Play,
    Square,
    CheckCheck
} from 'lucide-react';
import { useDrivingSchool } from '../../services/DrivingSchoolContext';
import { useToast } from '../../services/ToastContext';
import { 
    generateDSPDF, 
    generateDSThermalReceipt, 
    generateDSLeavingCertificatePDF, 
    generateDSCompletionCertificatePDF,
    generateDSStudentStatementPDF
} from '../../utils/dsPdfGenerator';
import type { User, Institution, DSLesson, DSInvoice, DSPayment, DSStudent } from '../../types';

interface DSStudentPortalProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogout: () => void;
    onExitPerspective?: () => void;
}

export const DSStudentPortal: React.FC<DSStudentPortalProps> = ({
    currentUser,
    currentInstitution,
    onLogout,
    onExitPerspective,
}) => {
    const { 
        students, 
        rawStudents,
        lessons, 
        rawLessons,
        invoices, 
        payments, 
        mastery, 
        instructors, 
        vehicles, 
        settings, 
        addLesson, 
        updateLesson, 
        updateStudent,
        refreshData 
    } = useDrivingSchool();

    const { success, error: toastError, info: toastInfo } = useToast();

    // 4 Core Android Navigation Tabs
    const [activeTab, setActiveTab] = useState<'attendance' | 'finance' | 'lessons' | 'alumnae'>('attendance');

    // Sub-views & Sheet States
    const [attendanceMode, setAttendanceMode] = useState<'scan' | 'pass'>('scan');
    const [attendancePhase, setAttendancePhase] = useState<'Theory' | 'Practical'>('Theory');
    const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'invoices' | 'receipts' | 'statement'>('overview');
    const [lessonsSubTab, setLessonsSubTab] = useState<'upcoming' | 'completed' | 'curriculum'>('upcoming');
    
    // Bottom Sheets & Modals
    const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [scanSuccessModal, setScanSuccessModal] = useState<{ 
        isOpen: boolean; 
        phase?: 'started' | 'ended';
        lesson?: DSLesson; 
        message?: string;
        nextActionNote?: string;
    } | null>(null);
    const [manualCodeInput, setManualCodeInput] = useState('');
    const [copiedAdm, setCopiedAdm] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Attendance Lifecycle & Reminders State
    const [activeReminders, setActiveReminders] = useState<Array<{ 
        id: string; 
        type: 'upcoming' | 'checkout' | 'sequence'; 
        title: string; 
        message: string; 
        actionLabel?: string; 
        onAction?: () => void 
    }>>([]);
    const [notificationsAllowed, setNotificationsAllowed] = useState<boolean>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    });
    const [isDirectActionLoading, setIsDirectActionLoading] = useState(false);
    const [elapsedSessionSeconds, setElapsedSessionSeconds] = useState<number>(0);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastScannedCodeRef = useRef<{ code: string; timestamp: number } | null>(null);

    // Camera Scanner State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
    const [hasTorch, setHasTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const scanStreamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);

    // Lesson Booking Form State
    const [bookingDate, setBookingDate] = useState('');
    const [bookingType, setBookingType] = useState<'Practical' | 'Theory'>('Practical');
    const [bookingStart, setBookingStart] = useState('09:00');
    const [bookingEnd, setBookingEnd] = useState('11:00');
    const [bookingInstructor, setBookingInstructor] = useState('');
    const [bookingVehicle, setBookingVehicle] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    // Current Time for Android Status Bar
    const [currentTime, setCurrentTime] = useState('');
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const t = setInterval(updateTime, 30000);
        return () => clearInterval(t);
    }, []);

    // PWA Install State & Handlers
    const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            return (window as any).__deferredInstallPrompt || null;
        }
        return null;
    });
    const [isInstalled, setIsInstalled] = useState<boolean>(false);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
    const [installBannerDismissed, setInstallBannerDismissed] = useState<boolean>(() => {
        try {
            return sessionStorage.getItem('ds_install_banner_dismissed') === 'true';
        } catch {
            return false;
        }
    });
    const [installTab, setInstallTab] = useState<'auto' | 'android' | 'ios' | 'desktop'>('auto');

    // Device Platform Detection
    const isIOS = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    }, []);
    const isAndroid = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return /Android/.test(navigator.userAgent);
    }, []);

    // PWA Lifecycle, Standalone Detection & Dynamic Driving Manifest Binding
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Guarantee Driving School Manifest and Assets are active
        try {
            document.title = "DS Pro Master | Driving School";
            sessionStorage.setItem('ds_student_session', 'true');
            const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
            if (manifestLinks.length > 0) {
                manifestLinks.forEach(l => l.setAttribute('href', '/manifest_driving.json'));
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'manifest';
                newLink.href = '/manifest_driving.json';
                document.head.appendChild(newLink);
            }
            const iconLinks = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
            iconLinks.forEach(l => l.setAttribute('href', '/driving_school_logo_3d.png'));
            const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
            themeMetas.forEach(tm => tm.setAttribute('content', '#0ea5e9'));
            const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
            if (appleTitle) appleTitle.setAttribute('content', 'DS Pro');
        } catch (e) {
            console.warn('[PWA] Failed to enforce driving manifest', e);
        }

        const checkInstalled = () => {
            return (
                window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true ||
                document.referrer.includes('android-app://')
            );
        };

        setIsInstalled(checkInstalled());

        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        const handleMediaChange = (e: MediaQueryListEvent) => {
            if (e.matches) setIsInstalled(true);
        };
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleMediaChange);
        }

        if ((window as any).__deferredInstallPrompt) {
            setDeferredPrompt((window as any).__deferredInstallPrompt);
        }

        const handleBeforeInstall = (e: any) => {
            e.preventDefault();
            (window as any).__deferredInstallPrompt = e;
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            (window as any).__deferredInstallPrompt = null;
            success('Driving School App installed successfully! You can now launch it directly from your home screen.');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleMediaChange);
            }
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [success]);

    const handleInstallApp = async () => {
        // Enforce driving manifest right before triggering native prompt
        try {
            document.title = "DS Pro Master | Driving School";
            const manifestLinks = document.querySelectorAll('link[rel="manifest"]');
            manifestLinks.forEach(l => l.setAttribute('href', '/manifest_driving.json'));
        } catch (e) {}

        const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt);
        if (promptEvent) {
            try {
                promptEvent.prompt();
                const choiceResult = await promptEvent.userChoice;
                if (choiceResult && choiceResult.outcome === 'accepted') {
                    success('App installation accepted! Launch it directly from your home screen.');
                    setIsInstalled(true);
                    setDeferredPrompt(null);
                    (window as any).__deferredInstallPrompt = null;
                    setIsInstallModalOpen(false);
                } else {
                    toastInfo('App installation was postponed.');
                }
            } catch (err) {
                console.error('Install prompt trigger error:', err);
                setIsInstallModalOpen(true);
            }
        } else {
            // Direct prompt not available (e.g. iOS Safari, or Chrome with restricted trigger)
            // Show interactive install bottom sheet guide
            setIsInstallModalOpen(true);
        }
    };

    const dismissInstallBanner = () => {
        setInstallBannerDismissed(true);
        try {
            sessionStorage.setItem('ds_install_banner_dismissed', 'true');
        } catch {
            // ignore
        }
    };

    // Robust matching of student record to logged-in user
    const studentRecord = useMemo<DSStudent | undefined>(() => {
        const cleanP = (p?: string) => (p || '').replace(/\D/g, '').slice(-9);
        const userPhone = cleanP(currentUser.phoneNumber);
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const currentUserId = currentUser.id || '';
        const strippedStudId = currentUserId.startsWith('user_stud_') ? currentUserId.replace('user_stud_', '') : '';
        const candidateStudents = (rawStudents && rawStudents.length > 0) ? rawStudents : (students || []);

        return candidateStudents.find(s =>
            s.id === currentUserId ||
            s.userId === currentUserId ||
            (strippedStudId && s.id === strippedStudId) ||
            (s.admissionNumber && (s.admissionNumber === currentUserId || (currentUser as any).admissionNumber === s.admissionNumber)) ||
            (userPhone && s.phone && cleanP(s.phone) === userPhone) ||
            (userEmail && s.email && s.email.toLowerCase().trim() === userEmail)
        );
    }, [students, rawStudents, currentUser]);

    // Student Specific Invoices & Payments
    const myInvoices = useMemo(() => {
        if (!studentRecord) return [];
        return (invoices || []).filter(inv => 
            inv.studentId === studentRecord.id || 
            (inv as any).student_id === studentRecord.id ||
            (studentRecord.admissionNumber && (inv.admissionNumber === studentRecord.admissionNumber || (inv as any).admission_number === studentRecord.admissionNumber))
        );
    }, [invoices, studentRecord]);

    const myPayments = useMemo(() => {
        if (!studentRecord) return [];
        const invoiceIds = new Set(myInvoices.map(i => i.id));
        return (payments || []).filter(p => 
            p.studentId === studentRecord.id || 
            (p as any).student_id === studentRecord.id ||
            (p.invoiceId && invoiceIds.has(p.invoiceId))
        ).sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime());
    }, [payments, myInvoices, studentRecord]);

    // Financial Totals
    const totalInvoiced = useMemo(() => {
        return myInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    }, [myInvoices]);

    const totalPaid = useMemo(() => {
        const fromInvoices = myInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
        const fromPayments = myPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        return Math.max(fromInvoices, fromPayments);
    }, [myInvoices, myPayments]);

    const currentBalance = useMemo(() => {
        return Math.max(0, totalInvoiced - totalPaid);
    }, [totalInvoiced, totalPaid]);

    // Student Lessons (from rawLessons or lessons)
    const myLessons = useMemo(() => {
        if (!studentRecord) return [];
        const sourceLessons = (rawLessons && rawLessons.length > 0) ? rawLessons : (lessons || []);
        return sourceLessons
            .filter(l => 
                l.studentId === studentRecord.id || 
                (l as any).student_id === studentRecord.id ||
                (studentRecord.admissionNumber && (l as any).admissionNumber === studentRecord.admissionNumber)
            )
            .sort((a, b) => new Date((b.lessonDate || (b as any).date) + ' ' + (b.startTime || '00:00')).getTime() - new Date((a.lessonDate || (a as any).date) + ' ' + (a.startTime || '00:00')).getTime());
    }, [lessons, rawLessons, studentRecord]);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todayLessons = useMemo(() => {
        return myLessons.filter(l => (l.lessonDate === todayStr || (l as any).date === todayStr) && l.status !== 'Cancelled');
    }, [myLessons, todayStr]);

    const activeInProgressLesson = useMemo(() => {
        return todayLessons.find(l => l.status === 'In-Progress');
    }, [todayLessons]);

    const todayScheduledLessons = useMemo(() => {
        return todayLessons.filter(l => l.status === 'Scheduled');
    }, [todayLessons]);

    const theoryCompletedToday = useMemo(() => {
        return todayLessons.some(l => l.lessonType === 'Theory' && l.status === 'Completed');
    }, [todayLessons]);

    const practicalCompletedToday = useMemo(() => {
        return todayLessons.some(l => l.lessonType === 'Practical' && l.status === 'Completed');
    }, [todayLessons]);

    // Daily limit: 1 Theory and 1 Practical session allowed per day (Completed or In-Progress counts)
    const theoryDoneToday = useMemo(() => {
        return todayLessons.some(l => l.lessonType === 'Theory' && (l.status === 'Completed' || l.status === 'In-Progress'));
    }, [todayLessons]);

    const practicalDoneToday = useMemo(() => {
        return todayLessons.some(l => l.lessonType === 'Practical' && (l.status === 'Completed' || l.status === 'In-Progress'));
    }, [todayLessons]);

    const bothSessionsCompletedToday = useMemo(() => {
        return theoryDoneToday && practicalDoneToday;
    }, [theoryDoneToday, practicalDoneToday]);

    const suggestedNextLessonType = useMemo<'Theory' | 'Practical'>(() => {
        if (!theoryDoneToday) return 'Theory';
        if (!practicalDoneToday) return 'Practical';
        return 'Theory';
    }, [theoryDoneToday, practicalDoneToday]);

    // Keep active attendance phase aligned with the remaining available session for today
    useEffect(() => {
        if (theoryDoneToday && !practicalDoneToday && attendancePhase !== 'Practical') {
            setAttendancePhase('Practical');
        } else if (!theoryDoneToday && practicalDoneToday && attendancePhase !== 'Theory') {
            setAttendancePhase('Theory');
        }
    }, [theoryDoneToday, practicalDoneToday, attendancePhase]);

    const upcomingLessons = useMemo(() => {
        return myLessons.filter(l => (l.status === 'Scheduled' || (l as any).confirmationStatus === 'Pending') && (l.lessonDate || (l as any).date) >= todayStr)
            .sort((a, b) => new Date((a.lessonDate || (a as any).date) + ' ' + a.startTime).getTime() - new Date((b.lessonDate || (b as any).date) + ' ' + b.startTime).getTime());
    }, [myLessons, todayStr]);

    const completedLessons = useMemo(() => {
        return myLessons.filter(l => l.status === 'Completed')
            .sort((a, b) => new Date((b.lessonDate || '') + ' ' + (b.startTime || '')).getTime() - new Date((a.lessonDate || '') + ' ' + (a.startTime || '')).getTime());
    }, [myLessons]);

    const nextUpcomingLesson = upcomingLessons[0] || null;

    // Progress Calculations
    const theoryProgress = studentRecord?.theoryProgressPercent ?? 0;
    const practicalProgress = studentRecord?.practicalProgressPercent ?? 0;
    const overallProgress = Math.round((theoryProgress + practicalProgress) / 2);

    // Helpers
    const getInstructorName = (id?: string) => instructors?.find(i => i.id === id)?.name || 'Assigned Instructor';
    const getVehiclePlate = (id?: string) => {
        const v = vehicles?.find(v => v.id === id);
        return v ? `${v.make} ${v.model} (${v.plateNumber})` : 'Training Vehicle';
    };
    const formatElapsedTimer = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Active in-progress live elapsed seconds counter
    useEffect(() => {
        if (!activeInProgressLesson) {
            setElapsedSessionSeconds(0);
            return;
        }
        const calc = () => {
            const timeRef = activeInProgressLesson.startedAt || activeInProgressLesson.checkInTime || activeInProgressLesson.startTime;
            if (!timeRef) return 0;
            let startMs = 0;
            if (activeInProgressLesson.startedAt) {
                startMs = new Date(activeInProgressLesson.startedAt).getTime();
            } else if (activeInProgressLesson.checkInTime && activeInProgressLesson.checkInTime.includes(':')) {
                const [h, m] = activeInProgressLesson.checkInTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0, 0);
                startMs = d.getTime();
            } else if (activeInProgressLesson.startTime && activeInProgressLesson.startTime.includes(':')) {
                const [h, m] = activeInProgressLesson.startTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0, 0);
                startMs = d.getTime();
            }
            if (!startMs || isNaN(startMs)) return 0;
            return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        };
        setElapsedSessionSeconds(calc());
        const timer = setInterval(() => setElapsedSessionSeconds(calc()), 1000);
        return () => clearInterval(timer);
    }, [activeInProgressLesson]);

    // Audio & Haptic Feedback utilities
    const playAttendanceAudio = useCallback((type: 'start' | 'end' | 'reminder') => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            if (type === 'start') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'end') {
                [523.25, 659.25, 783.99].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                    gain.gain.setValueAtTime(0.2, now + idx * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
                    osc.start(now + idx * 0.1);
                    osc.stop(now + idx * 0.1 + 0.25);
                });
            } else if (type === 'reminder') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (_) {}
    }, []);

    const triggerHaptic = useCallback((pattern: number[]) => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch (_) {}
    }, []);

    // Web Notification and Reminders System
    const requestNotificationPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            toastInfo("Notifications are not supported on this browser.");
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsAllowed(true);
                success("Reminders enabled! You'll receive real-time lesson start & end alerts.");
                playAttendanceAudio('reminder');
            } else {
                setNotificationsAllowed(false);
                toastInfo("Notification permissions were not granted.");
            }
        } catch (e) {
            console.warn("Notification request error:", e);
        }
    }, [playAttendanceAudio, success, toastInfo]);

    const sendPushNotification = useCallback((title: string, body: string) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '/driving_school_logo_3d.png',
                    badge: '/driving_school_logo_3d.png',
                    tag: 'ds_lesson_reminder'
                });
            } catch (_) {}
        }
    }, []);

    // Camera Scanner Lifecycle
    const stopCamera = useCallback(() => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (scanStreamRef.current) {
            scanStreamRef.current.getTracks().forEach(track => track.stop());
            scanStreamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    // Complete Session Attendance Execution (Handles Beginning & End of Theory & Practical with Daily Limits)
    const executeAttendanceSession = useCallback(async (actionType: 'start' | 'end' | 'auto', scannedCode?: string) => {
        if (!studentRecord) {
            toastError("Candidate profile not found. Please log in again.");
            return;
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const nowTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const todayStr = nowIso.split('T')[0];

        // 1. ENDING an active In-Progress lesson (Conclusion of Theory or Practical)
        if (activeInProgressLesson && (actionType === 'end' || actionType === 'auto')) {
            try {
                setIsDirectActionLoading(true);
                const checkOutNote = `[QR Check-Out: Session Ended at ${nowTimeStr} by Student]`;
                const updatedNotes = activeInProgressLesson.notes 
                    ? `${activeInProgressLesson.notes}\n${checkOutNote}` 
                    : checkOutNote;

                await updateLesson({
                    ...activeInProgressLesson,
                    status: 'Completed',
                    sessionPhase: 'completed',
                    checkOutTime: nowTimeStr,
                    endedAt: nowIso,
                    notes: updatedNotes,
                    instructorNotes: activeInProgressLesson.instructorNotes ? `${activeInProgressLesson.instructorNotes}\n${checkOutNote}` : checkOutNote,
                    updatedAt: nowIso
                });

                stopCamera();
                triggerHaptic([200, 100, 200, 100, 200]);
                playAttendanceAudio('end');

                const isTheory = activeInProgressLesson.lessonType === 'Theory';
                let nextStepNote = "";
                if (isTheory) {
                    if (!practicalDoneToday) {
                        nextStepNote = "Theory Session Completed (1/1 for today)! You are now eligible to complete your 1 allowed Practical Driving session.";
                    } else {
                        nextStepNote = "Theory Session Completed (1/1)! You have now completed both of your allowed sessions (1 Theory & 1 Practical) for today. Great job!";
                    }
                } else {
                    if (!theoryDoneToday) {
                        nextStepNote = "Practical Session Completed (1/1 for today)! You are eligible to complete your 1 allowed Theory session.";
                    } else {
                        nextStepNote = "Practical Session Completed (1/1)! You have now completed both of your allowed sessions (1 Theory & 1 Practical) for today. Great job!";
                    }
                }

                setScanSuccessModal({
                    isOpen: true,
                    phase: 'ended',
                    lesson: { ...activeInProgressLesson, status: 'Completed', checkOutTime: nowTimeStr },
                    message: `Verified! Attendance check-out confirmed for ${activeInProgressLesson.lessonType} lesson.`,
                    nextActionNote: nextStepNote
                });

                success(`Attendance confirmed: ${activeInProgressLesson.lessonType} Lesson finalized!`);
                if (refreshData) refreshData();
            } catch (err: any) {
                toastError("Failed to record checkout: " + (err.message || 'Error'));
            } finally {
                setIsDirectActionLoading(false);
            }
            return;
        }

        // Daily Limit Defense: If student has already completed both daily sessions (1 Theory and 1 Practical)
        if (bothSessionsCompletedToday) {
            stopCamera();
            triggerHaptic([300, 100, 300]);
            playAttendanceAudio('reminder');
            toastError("Daily Limit Reached: You have already completed both allowed sessions (1 Theory and 1 Practical) for today.");
            return;
        }

        // Infer scanned code type if QR code was provided
        let inferredTypeFromCode: 'Theory' | 'Practical' | null = null;
        if (scannedCode) {
            const norm = scannedCode.trim().toLowerCase();
            if (
                norm.startsWith('veh_') || 
                norm.includes('practical') || 
                norm.includes('car') ||
                vehicles.some(v => v.id.toLowerCase() === norm || v.plateNumber?.toLowerCase().replace(/\s/g, '') === norm.replace(/\s/g, ''))
            ) {
                inferredTypeFromCode = 'Practical';
            } else if (
                norm.startsWith('room_') || 
                norm.includes('theory') || 
                norm.includes('class')
            ) {
                inferredTypeFromCode = 'Theory';
            }
        }

        // 2. STARTING a scheduled lesson for today (Beginning of Theory or Practical)
        if (todayScheduledLessons.length > 0 && (actionType === 'start' || actionType === 'auto')) {
            let targetLesson: DSLesson | undefined;

            if (scannedCode) {
                const norm = scannedCode.trim().toLowerCase();
                targetLesson = todayScheduledLessons.find(l => 
                    l.id.toLowerCase() === norm ||
                    (l.vehicleId && l.vehicleId.toLowerCase() === norm) ||
                    norm.includes(l.id.toLowerCase())
                );
            }

            if (!targetLesson && inferredTypeFromCode) {
                targetLesson = todayScheduledLessons.find(l => l.lessonType === inferredTypeFromCode);
            }

            if (!targetLesson && actionType === 'start') {
                targetLesson = todayScheduledLessons.find(l => l.lessonType === attendancePhase);
            }

            if (!targetLesson) {
                // Select a scheduled lesson whose type is not yet fulfilled today
                targetLesson = todayScheduledLessons.find(l => 
                    (l.lessonType === 'Theory' && !theoryDoneToday) ||
                    (l.lessonType === 'Practical' && !practicalDoneToday)
                );
            }

            if (targetLesson) {
                // Strictly enforce daily limit on scheduled lesson type
                if (targetLesson.lessonType === 'Theory' && theoryDoneToday) {
                    stopCamera();
                    triggerHaptic([300, 100, 300]);
                    playAttendanceAudio('reminder');
                    toastError("Daily Theory Limit Reached: You have already completed your 1 allowed Theory session for today. Only 1 Theory and 1 Practical session are permitted per day.");
                    return;
                }
                if (targetLesson.lessonType === 'Practical' && practicalDoneToday) {
                    stopCamera();
                    triggerHaptic([300, 100, 300]);
                    playAttendanceAudio('reminder');
                    toastError("Daily Practical Limit Reached: You have already completed your 1 allowed Practical session for today. Only 1 Theory and 1 Practical session are permitted per day.");
                    return;
                }

                try {
                    setIsDirectActionLoading(true);
                    const checkInNote = `[QR Check-In: Session Started at ${nowTimeStr} by Student]`;
                    const updatedNotes = targetLesson.notes 
                        ? `${targetLesson.notes}\n${checkInNote}` 
                        : checkInNote;

                    await updateLesson({
                        ...targetLesson,
                        status: 'In-Progress',
                        sessionPhase: 'started',
                        checkInTime: nowTimeStr,
                        startedAt: nowIso,
                        notes: updatedNotes,
                        instructorNotes: targetLesson.instructorNotes ? `${targetLesson.instructorNotes}\n${checkInNote}` : checkInNote,
                        updatedAt: nowIso
                    });

                    stopCamera();
                    triggerHaptic([100, 50, 100]);
                    playAttendanceAudio('start');

                    setScanSuccessModal({
                        isOpen: true,
                        phase: 'started',
                        lesson: { ...targetLesson, status: 'In-Progress', checkInTime: nowTimeStr },
                        message: `Session Started! Checked in for ${targetLesson.lessonType} lesson at ${nowTimeStr}.`,
                        nextActionNote: "Please remember to scan the QR code again at the conclusion of class to finalize your attendance!"
                    });

                    success(`Session Started: ${targetLesson.lessonType} lesson check-in logged.`);
                    if (refreshData) refreshData();
                } catch (err: any) {
                    toastError("Failed to start session: " + (err.message || 'Error'));
                } finally {
                    setIsDirectActionLoading(false);
                }
                return;
            }
        }

        // 3. Walk-in / Direct On-the-Fly Attendance Check-In (No pre-scheduled lesson exists for today)
        try {
            setIsDirectActionLoading(true);
            let lessonTypeToStart: 'Theory' | 'Practical' = inferredTypeFromCode || attendancePhase || suggestedNextLessonType || 'Theory';

            // If selected type is already done today, auto-align to the remaining permitted type
            if (lessonTypeToStart === 'Theory' && theoryDoneToday && !practicalDoneToday) {
                lessonTypeToStart = 'Practical';
            } else if (lessonTypeToStart === 'Practical' && practicalDoneToday && !theoryDoneToday) {
                lessonTypeToStart = 'Theory';
            }

            // Strictly enforce daily limit
            if (lessonTypeToStart === 'Theory' && theoryDoneToday) {
                stopCamera();
                triggerHaptic([300, 100, 300]);
                playAttendanceAudio('reminder');
                toastError("Daily Theory Limit Reached: You have already completed your 1 allowed Theory session for today. Only 1 Theory and 1 Practical session are permitted per day.");
                return;
            }
            if (lessonTypeToStart === 'Practical' && practicalDoneToday) {
                stopCamera();
                triggerHaptic([300, 100, 300]);
                playAttendanceAudio('reminder');
                toastError("Daily Practical Limit Reached: You have already completed your 1 allowed Practical session for today. Only 1 Theory and 1 Practical session are permitted per day.");
                return;
            }

            let assignedInstructor = instructors.find(i => i.id === studentRecord.preferredInstructorId && i.status === 'Active') 
                || instructors.find(i => i.status === 'Active');
            
            let assignedVehicle = undefined;
            if (lessonTypeToStart === 'Practical') {
                if (assignedInstructor?.assignedVehicleId) {
                    assignedVehicle = vehicles.find(v => v.id === assignedInstructor.assignedVehicleId && v.status === 'Operational');
                }
                if (!assignedVehicle) {
                    assignedVehicle = vehicles.find(v => v.status === 'Operational');
                }
            }

            const durationMinutes = lessonTypeToStart === 'Theory' 
                ? (settings?.schedulingRules?.theoryDurationMinutes || 60)
                : (settings?.schedulingRules?.practicalDurationMinutes || 60);

            const endDate = new Date(now.getTime() + durationMinutes * 60000);
            const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const newLessonId = `less_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const checkInNote = `[QR Walk-In Check-In: Session Started at ${nowTimeStr} by Student]`;

            const newLessonPayload: DSLesson = {
                id: newLessonId,
                institutionId: currentInstitution.id,
                branchId: studentRecord.branchId || studentRecord.branch_id,
                branch_id: studentRecord.branchId || studentRecord.branch_id,
                studentId: studentRecord.id,
                instructorId: assignedInstructor?.id || undefined,
                vehicleId: assignedVehicle?.id || undefined,
                lessonDate: todayStr,
                startTime: nowTimeStr,
                endTime: endTimeStr,
                lessonType: lessonTypeToStart,
                status: 'In-Progress',
                confirmationStatus: 'Confirmed',
                checkInTime: nowTimeStr,
                startedAt: nowIso,
                sessionPhase: 'started',
                notes: checkInNote,
                instructorNotes: checkInNote,
                createdAt: nowIso
            };

            const created = await addLesson(newLessonPayload);
            stopCamera();
            triggerHaptic([100, 50, 100]);
            playAttendanceAudio('start');

            setScanSuccessModal({
                isOpen: true,
                phase: 'started',
                lesson: created || newLessonPayload,
                message: `New ${lessonTypeToStart} Session Registered! Check-in confirmed at ${nowTimeStr}.`,
                nextActionNote: "Your lesson is now IN PROGRESS. Remember to scan the QR code again at the conclusion of class to finalize your attendance hours!"
            });

            success(`New ${lessonTypeToStart} Session started & attendance logged.`);
            if (refreshData) refreshData();
        } catch (err: any) {
            console.error('[Attendance] Direct start error:', err);
            toastError("Failed to register attendance: " + (err.message || 'Error'));
        } finally {
            setIsDirectActionLoading(false);
        }
    }, [
        studentRecord, 
        activeInProgressLesson, 
        todayScheduledLessons, 
        attendancePhase, 
        suggestedNextLessonType, 
        theoryDoneToday,
        practicalDoneToday,
        bothSessionsCompletedToday,
        instructors, 
        vehicles, 
        settings, 
        currentInstitution.id, 
        updateLesson, 
        addLesson, 
        stopCamera, 
        triggerHaptic, 
        playAttendanceAudio, 
        success, 
        toastError, 
        refreshData
    ]);

    const handleProcessScanCode = useCallback(async (code: string) => {
        if (!studentRecord || !code) return;
        const nowMs = Date.now();
        if (lastScannedCodeRef.current && 
            lastScannedCodeRef.current.code === code && 
            (nowMs - lastScannedCodeRef.current.timestamp < 3000)
        ) {
            return; // Debounce duplicate reads
        }
        lastScannedCodeRef.current = { code, timestamp: nowMs };

        await executeAttendanceSession('auto', code);
    }, [studentRecord, executeAttendanceSession]);

    // Active Reminder Engine: Evaluates upcoming lessons, active sessions, and sequence reminders
    const notifiedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const evaluateReminders = () => {
            const reminders: Array<{ 
                id: string; 
                type: 'upcoming' | 'checkout' | 'sequence'; 
                title: string; 
                message: string; 
                actionLabel?: string; 
                onAction?: () => void 
            }> = [];
            const now = new Date();

            // 1. In-Progress Lesson Checkout Reminder
            if (activeInProgressLesson) {
                const lessonType = activeInProgressLesson.lessonType;
                const durationMins = lessonType === 'Theory' 
                    ? (settings?.schedulingRules?.theoryDurationMinutes || 60)
                    : (settings?.schedulingRules?.practicalDurationMinutes || 60);

                const elapsedMins = Math.floor(elapsedSessionSeconds / 60);
                const isOverdue = elapsedMins >= durationMins;

                if (isOverdue) {
                    const remId = `checkout_overdue_${activeInProgressLesson.id}`;
                    reminders.push({
                        id: remId,
                        type: 'checkout',
                        title: `🔔 ${lessonType} Session Concluded!`,
                        message: `Your scheduled ${durationMins}-minute ${lessonType} session has ended (${elapsedMins}m elapsed). Scan QR or tap below to finalize your attendance.`,
                        actionLabel: 'Check Out Now',
                        onAction: () => executeAttendanceSession('end')
                    });

                    if (!notifiedRef.current.has(remId)) {
                        notifiedRef.current.add(remId);
                        sendPushNotification(
                            `🔔 ${lessonType} Session Finished!`,
                            `Your session has concluded. Please scan QR to check out and finalize your attendance.`
                        );
                        playAttendanceAudio('reminder');
                        triggerHaptic([200, 100, 200]);
                    }
                } else {
                    reminders.push({
                        id: `active_session_${activeInProgressLesson.id}`,
                        type: 'checkout',
                        title: `⏳ ${lessonType} Session in Progress`,
                        message: `Started at ${activeInProgressLesson.checkInTime || activeInProgressLesson.startTime} (${elapsedMins}/${durationMins}m). Remember to scan QR at the end of class!`,
                        actionLabel: 'Check Out at End',
                        onAction: () => {
                            setActiveTab('attendance');
                            setAttendanceMode('scan');
                        }
                    });
                }
            }

            // 2. Upcoming Scheduled Lesson Reminder (<= 45 mins before start)
            if (!activeInProgressLesson && todayScheduledLessons.length > 0 && !bothSessionsCompletedToday) {
                for (const scheduled of todayScheduledLessons) {
                    if (!scheduled.startTime || !scheduled.startTime.includes(':')) continue;
                    // Skip reminder if the daily quota for this lesson type is already fulfilled
                    if (scheduled.lessonType === 'Theory' && theoryDoneToday) continue;
                    if (scheduled.lessonType === 'Practical' && practicalDoneToday) continue;

                    const [sh, sm] = scheduled.startTime.split(':').map(Number);
                    const schedDate = new Date(now);
                    schedDate.setHours(sh, sm, 0, 0);

                    const diffMin = Math.round((schedDate.getTime() - now.getTime()) / 60000);
                    if (diffMin > 0 && diffMin <= 45) {
                        const remId = `upcoming_start_${scheduled.id}_${diffMin <= 10 ? 'urgent' : 'prep'}`;
                        reminders.push({
                            id: remId,
                            type: 'upcoming',
                            title: `⏰ ${scheduled.lessonType} Lesson in ${diffMin} min!`,
                            message: `Scheduled at ${scheduled.startTime}. Please scan QR at the beginning of class to register attendance.`,
                            actionLabel: 'Scan to Start',
                            onAction: () => {
                                setActiveTab('attendance');
                                setAttendanceMode('scan');
                            }
                        });

                        if (!notifiedRef.current.has(remId)) {
                            notifiedRef.current.add(remId);
                            sendPushNotification(
                                `⏰ Driving Lesson in ${diffMin} mins!`,
                                `Your ${scheduled.lessonType} lesson begins at ${scheduled.startTime}. Remember to scan QR at the start.`
                            );
                            playAttendanceAudio('reminder');
                        }
                    } else if (diffMin <= 0 && diffMin >= -30) {
                        const remId = `started_due_${scheduled.id}`;
                        reminders.push({
                            id: remId,
                            type: 'upcoming',
                            title: `⚡ ${scheduled.lessonType} Class Starting Now!`,
                            message: `Scheduled for ${scheduled.startTime}. Scan QR now to begin and record your check-in.`,
                            actionLabel: 'Start Session (Check-In)',
                            onAction: () => executeAttendanceSession('start')
                        });

                        if (!notifiedRef.current.has(remId)) {
                            notifiedRef.current.add(remId);
                            sendPushNotification(
                                `⚡ Class Starting Now: ${scheduled.startTime}`,
                                `Please scan QR to record your beginning attendance.`
                            );
                            playAttendanceAudio('reminder');
                        }
                    }
                }
            }

            // 3. Theory-to-Practical Sequence Reminder
            if (!activeInProgressLesson && theoryDoneToday && !practicalDoneToday && todayScheduledLessons.length === 0) {
                reminders.push({
                    id: 'seq_practical_ready',
                    type: 'sequence',
                    title: '🚗 Theory Complete! Next Up: Practical Driving',
                    message: 'You have verified theory attendance today. Book or scan at the vehicle to start practical driving.',
                    actionLabel: 'Start Practical Driving',
                    onAction: () => {
                        setAttendancePhase('Practical');
                        setActiveTab('attendance');
                        setAttendanceMode('scan');
                    }
                });
            }

            // 4. Daily quota fulfilled reminder
            if (!activeInProgressLesson && bothSessionsCompletedToday) {
                reminders.push({
                    id: 'seq_all_completed_today',
                    type: 'sequence',
                    title: '🎉 Daily Lessons Complete!',
                    message: 'You have completed both your 1 Theory and 1 Practical session for today. Well done!',
                    actionLabel: 'View Progress',
                    onAction: () => {
                        setActiveTab('lessons');
                    }
                });
            }

            setActiveReminders(reminders);
        };

        evaluateReminders();
        const t = setInterval(evaluateReminders, 10000);
        return () => clearInterval(t);
    }, [
        activeInProgressLesson, 
        todayScheduledLessons, 
        theoryCompletedToday, 
        practicalCompletedToday, 
        theoryDoneToday,
        practicalDoneToday,
        bothSessionsCompletedToday,
        elapsedSessionSeconds, 
        settings, 
        sendPushNotification, 
        executeAttendanceSession, 
        playAttendanceAudio, 
        triggerHaptic
    ]);

    const startCamera = useCallback(async () => {
        stopCamera();
        setCameraError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Camera access not supported on this browser.");
            return;
        }

        // Dynamically inject jsQR script if not yet loaded and native BarcodeDetector is missing
        if (typeof window !== 'undefined' && !('BarcodeDetector' in window) && !(window as any).jsQR) {
            const existingScript = document.querySelector('script[src*="jsqr"]');
            if (!existingScript) {
                const s = document.createElement('script');
                s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
                s.async = true;
                document.head.appendChild(s);
            }
        }

        if (!offscreenCanvasRef.current && typeof document !== 'undefined') {
            offscreenCanvasRef.current = document.createElement('canvas');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: cameraFacing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            scanStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraActive(true);

            // Check if torch/flashlight is supported
            const track = stream.getVideoTracks()[0];
            const capabilities: any = track?.getCapabilities?.() || {};
            setHasTorch(!!capabilities.torch);

            // Native BarcodeDetector loop (Hardware accelerated in Android Chrome & modern browsers)
            let detector: any = null;
            if ('BarcodeDetector' in window) {
                try {
                    detector = new (window as any).BarcodeDetector({
                        formats: ['qr_code', 'code_128', 'data_matrix']
                    });
                } catch (e) {
                    console.warn('[QR Scanner] BarcodeDetector warning:', e);
                }
            }

            scanIntervalRef.current = setInterval(async () => {
                const video = videoRef.current;
                if (!video || video.readyState < 2) return;

                let detectedRaw: string | null = null;

                // Engine 1: Native Hardware BarcodeDetector
                if (detector) {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                            detectedRaw = String(barcodes[0].rawValue).trim();
                        }
                    } catch (_) {}
                }

                // Engine 2: Canvas + jsQR Fallback (Works on iPhone, iPad, Safari, and WebViews)
                if (!detectedRaw && (window as any).jsQR && offscreenCanvasRef.current) {
                    try {
                        const canvas = offscreenCanvasRef.current;
                        const vw = video.videoWidth || 640;
                        const vh = video.videoHeight || 480;
                        canvas.width = vw;
                        canvas.height = vh;
                        const ctx = canvas.getContext('2d');
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

                if (detectedRaw) {
                    handleProcessScanCode(detectedRaw);
                }
            }, 300);

        } catch (err: any) {
            console.error('[QR Scanner] Camera start error:', err);
            setCameraError(err.name === 'NotAllowedError' ? 'Camera permission was denied. Please allow camera access in browser settings.' : 'Could not initialize camera stream.');
            setCameraActive(false);
        }
    }, [cameraFacing, stopCamera, handleProcessScanCode]);

    // Cleanup camera when switching tabs or unmounting
    useEffect(() => {
        if (activeTab === 'attendance' && attendanceMode === 'scan') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [activeTab, attendanceMode, startCamera, stopCamera]);

    const toggleTorch = async () => {
        if (!scanStreamRef.current) return;
        const track = scanStreamRef.current.getVideoTracks()[0];
        if (track && hasTorch) {
            const nextState = !torchOn;
            try {
                await (track as any).applyConstraints({ advanced: [{ torch: nextState }] });
                setTorchOn(nextState);
            } catch (_) {}
        }
    };

    // PDF Handlers
    const handleDownloadInvoice = async (invoice: DSInvoice) => {
        if (!studentRecord) return;
        setPdfLoading(true);
        try {
            const doc = await generateDSPDF('invoice', invoice, studentRecord, settings, currentInstitution, myInvoices, currentUser.name, myPayments);
            doc.save(`Invoice_${invoice.invoiceNumber || invoice.id}.pdf`);
            success("Invoice downloaded!");
        } catch (err: any) {
            toastError("Failed to generate invoice PDF");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadReceipt = async (payment: DSPayment) => {
        if (!studentRecord) return;
        setPdfLoading(true);
        try {
            const doc = await generateDSPDF('receipt', payment, studentRecord, settings, currentInstitution, myInvoices, currentUser.name, myPayments);
            doc.save(`Receipt_${payment.receiptNumber || payment.id}.pdf`);
            success("Receipt downloaded!");
        } catch (err: any) {
            toastError("Failed to generate receipt PDF");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadThermalSlip = async (payment: DSPayment) => {
        if (!studentRecord) return;
        setPdfLoading(true);
        try {
            const doc = await generateDSThermalReceipt(payment, studentRecord, settings, currentInstitution);
            doc.save(`Receipt_Slip_${payment.receiptNumber || payment.id}.pdf`);
            success("Thermal slip downloaded!");
        } catch (err: any) {
            toastError("Failed to generate thermal slip");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadFullStatement = async () => {
        if (!studentRecord) return;
        setPdfLoading(true);
        try {
            const doc = await generateDSStudentStatementPDF(studentRecord, myInvoices, myPayments, currentInstitution, settings);
            doc.save(`Statement_${studentRecord.admissionNumber || studentRecord.fullName.replace(/\s+/g, '_')}.pdf`);
            success("Official statement downloaded!");
        } catch (err: any) {
            toastError("Failed to generate statement PDF");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadLeavingCert = async () => {
        if (!studentRecord) return;
        setPdfLoading(true);
        try {
            const doc = await generateDSLeavingCertificatePDF(studentRecord, currentInstitution, currentInstitution.letterheadConfig);
            doc.save(`Leaving_Certificate_${studentRecord.admissionNumber || studentRecord.fullName.replace(/\s+/g, '_')}.pdf`);
            success("Leaving Certificate downloaded!");
        } catch (err: any) {
            toastError("Failed to generate certificate PDF");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadCompletionCert = async () => {
        if (!studentRecord) return;
        setPdfLoading(true);
        try {
            const doc = await generateDSCompletionCertificatePDF(studentRecord, currentInstitution, currentInstitution.letterheadConfig);
            doc.save(`Completion_Certificate_${studentRecord.admissionNumber || studentRecord.fullName.replace(/\s+/g, '_')}.pdf`);
            success("Completion Certificate downloaded!");
        } catch (err: any) {
            toastError("Failed to generate certificate PDF");
        } finally {
            setPdfLoading(false);
        }
    };

    // Lesson Self-Booking Submit
    const handleBookLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentRecord || !bookingDate || !bookingInstructor) {
            toastError("Please pick a date and instructor.");
            return;
        }

        // Daily Limit Check: Ensure candidate does not exceed 1 Theory and 1 Practical on any chosen date
        const sameDayLessons = myLessons.filter(l => (l.lessonDate === bookingDate || (l as any).date === bookingDate) && l.status !== 'Cancelled');
        const alreadyHasTypeThatDay = sameDayLessons.some(l => l.lessonType === bookingType);
        if (alreadyHasTypeThatDay) {
            toastError(`Daily Limit Reached: You already have a ${bookingType} session for ${bookingDate}. Only 1 Theory and 1 Practical session are permitted per day.`);
            return;
        }

        setBookingLoading(true);
        try {
            await addLesson({
                id: `lsn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId: currentInstitution.id,
                studentId: studentRecord.id,
                instructorId: bookingInstructor,
                vehicleId: bookingType !== 'Theory' ? bookingVehicle : undefined,
                lessonDate: bookingDate,
                startTime: bookingStart,
                endTime: bookingEnd,
                lessonType: bookingType,
                status: 'Scheduled',
                confirmationStatus: 'Pending',
                notes: 'Student Self-Booking via Android Portal',
                createdAt: new Date().toISOString(),
            });
            success("Lesson booked successfully!");
            setIsBookingModalOpen(false);
            setBookingDate('');
            setBookingInstructor('');
            setBookingVehicle('');
            setActiveTab('lessons');
            if (refreshData) refreshData();
        } catch (err: any) {
            toastError("Failed to book lesson: " + (err.message || 'Error'));
        } finally {
            setBookingLoading(false);
        }
    };

    const isSuperAdminImpersonating = useMemo(() => {
        try {
            return !!localStorage.getItem('eduai_super_admin_session') || 
                   sessionStorage.getItem('eduai_impersonated_by_admin') === 'true' || 
                   currentUser.isImpersonated;
        } catch (_) {
            return false;
        }
    }, [currentUser]);

    const studentName = studentRecord?.fullName || currentUser.fullName || currentUser.name || 'Student';
    const admissionNo = studentRecord?.admissionNumber || 'ADM-PENDING';
    const courseCategory = studentRecord?.licenseCategory || studentRecord?.licenseTypeInterested || 'Class B1 (Manual)';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-indigo-500 selection:text-white font-sans antialiased">
            {/* Android Mobile Application Shell */}
            <div className="w-full max-w-md min-h-screen bg-slate-900 flex flex-col relative pb-28 sm:border-x sm:border-slate-800 sm:shadow-2xl">
                
                {/* 1. Android Native System Status Bar */}
                <div className="h-7 px-5 pt-1 flex items-center justify-between text-[11px] font-black text-slate-400 bg-slate-950/80 backdrop-blur-md select-none shrink-0 z-30">
                    <span>{currentTime || '09:41'}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] tracking-tighter">5G</span>
                        <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5 flex items-center">
                            <div className="h-full w-full bg-slate-400 rounded-[1px]" />
                        </div>
                    </div>
                </div>

                {/* 2. Android App Top Bar */}
                <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-0.5 shadow-md shadow-indigo-600/20 shrink-0 overflow-hidden flex items-center justify-center">
                            {currentInstitution.logoUrl ? (
                                <img src={currentInstitution.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-[14px]" />
                            ) : (
                                <Car className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xs font-black tracking-tight text-white truncate max-w-[170px] uppercase">
                                {currentInstitution.name}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DS Student Portal</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {isSuperAdminImpersonating && (
                            <button
                                onClick={onExitPerspective || onLogout}
                                className="px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                                title="Click to Exit Student Perspective and restore Admin session"
                            >
                                <span>Exit Admin</span>
                            </button>
                        )}
                        {!isInstalled ? (
                            <button
                                onClick={handleInstallApp}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
                                title="Install Driving School App"
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Install App</span>
                                <span className="xs:hidden">Install</span>
                            </button>
                        ) : (
                            <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> App Active
                            </div>
                        )}
                        <button
                            onClick={onLogout}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-all active:scale-95"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Student Hero Greeting Pill */}
                <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-850 to-indigo-950/30 border border-indigo-500/20 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-black text-indigo-300 text-sm overflow-hidden shrink-0">
                            {studentRecord?.passportPhoto ? (
                                <img src={studentRecord.passportPhoto as string} alt="Passport" className="w-full h-full object-cover" />
                            ) : (
                                studentName.charAt(0)
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signed in Candidate</p>
                            <h3 className="text-sm font-black text-white truncate">{studentName}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black text-indigo-400 font-mono">#{admissionNo}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                                    {courseCategory}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(admissionNo);
                                setCopiedAdm(true);
                                setTimeout(() => setCopiedAdm(false), 2000);
                            }
                        }}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 shrink-0"
                        title="Copy Admission Number"
                    >
                        {copiedAdm ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* 3. Main Scrollable Screen Body */}
                <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-4 custom-scrollbar">

                    {/* Install App Android Banner (Dismissible) */}
                    {!isInstalled && !installBannerDismissed && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-850 to-teal-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/30 animate-in fade-in duration-200 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-black text-white">Install DS Student App</h4>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">Fast & Offline</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                        1-tap access on home screen, offline QR scanner & receipts
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={handleInstallApp}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                                >
                                    Install
                                </button>
                                <button
                                    onClick={dismissInstallBanner}
                                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                                    title="Dismiss banner"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* HUB 1: ATTENDANCE & QR SCANNER (PRIORITY #1)              */}
                    {/* ========================================================= */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Push Notifications Enable Prompt Banner */}
                            {!notificationsAllowed && typeof window !== 'undefined' && 'Notification' in window && (
                                <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-lg">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate">Enable Session Alerts</p>
                                            <p className="text-[10px] text-slate-400 truncate">Get notifications for lesson start & checkout times</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={requestNotificationPermission}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 shadow-md shadow-indigo-600/30"
                                    >
                                        Enable
                                    </button>
                                </div>
                            )}

                            {/* Active Reminders & Sequencing Alerts */}
                            {activeReminders.length > 0 && (
                                <div className="space-y-2">
                                    {activeReminders.map(rem => (
                                        <div 
                                            key={rem.id}
                                            className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 shadow-xl transition-all ${
                                                rem.type === 'checkout'
                                                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                                                    : rem.type === 'sequence'
                                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                                                    : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                                    rem.type === 'checkout'
                                                        ? 'bg-amber-500/20 text-amber-400'
                                                        : rem.type === 'sequence'
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-indigo-500/20 text-indigo-400'
                                                }`}>
                                                    {rem.type === 'checkout' ? (
                                                        <BellRing className="w-4 h-4 animate-bounce" />
                                                    ) : rem.type === 'sequence' ? (
                                                        <Sparkles className="w-4 h-4" />
                                                    ) : (
                                                        <Clock className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-white">{rem.title}</p>
                                                    <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{rem.message}</p>
                                                </div>
                                            </div>
                                            {rem.actionLabel && rem.onAction && (
                                                <button
                                                    onClick={rem.onAction}
                                                    disabled={isDirectActionLoading}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 shadow-md ${
                                                        rem.type === 'checkout'
                                                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                                                            : rem.type === 'sequence'
                                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                                                    }`}
                                                >
                                                    {rem.actionLabel}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 2-PHASE SESSION LIFECYCLE CONTROLLER */}
                            {activeInProgressLesson ? (
                                /* ACTIVE SESSION HERO CARD (PHASE 1 IN-PROGRESS -> CHECK OUT TO COMPLETE) */
                                <div className="p-5 rounded-[2.5rem] bg-gradient-to-br from-amber-950/60 via-slate-900 to-indigo-950/60 border-2 border-amber-500/60 shadow-2xl relative overflow-hidden space-y-4">
                                    <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                                    
                                    {/* Header Badge */}
                                    <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] font-black tracking-widest text-amber-200 uppercase">
                                                SESSION IN PROGRESS • PHASE 1 ACTIVE
                                            </span>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/30">
                                            CLOCKED IN
                                        </span>
                                    </div>

                                    {/* Main Session Content */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                {activeInProgressLesson.lessonType === 'Practical' ? (
                                                    <Car className="w-5 h-5 text-indigo-400" />
                                                ) : (
                                                    <FileText className="w-5 h-5 text-amber-400" />
                                                )}
                                                {activeInProgressLesson.lessonType} Driving Lesson
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Started at <span className="font-bold text-white">{activeInProgressLesson.checkInTime || activeInProgressLesson.startTime}</span>
                                            </p>
                                        </div>

                                        {/* Live Elapsed Digital Timer */}
                                        <div className="text-right">
                                            <div className="text-2xl font-black font-mono tracking-wider text-emerald-400 flex items-center justify-end gap-1.5 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]">
                                                <Timer className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                                                {formatElapsedTimer(elapsedSessionSeconds)}
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                Elapsed Session
                                            </p>
                                        </div>
                                    </div>

                                    {/* Compliance Guidance Notice */}
                                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>
                                            <strong>NTSA Requirement:</strong> You must check out at the end of class to log verified attendance hours.
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        <button
                                            onClick={() => executeAttendanceSession('end')}
                                            disabled={isDirectActionLoading}
                                            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isDirectActionLoading ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCheck className="w-4 h-4" />
                                            )}
                                            Check Out & End Session
                                        </button>
                                        <button
                                            onClick={() => {
                                                setAttendanceMode('scan');
                                            }}
                                            className="w-full py-3.5 px-4 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Camera className="w-4 h-4 text-indigo-400" />
                                            Scan QR to Check Out
                                        </button>
                                    </div>
                                </div>
                            ) : bothSessionsCompletedToday ? (
                                /* ALL DAILY SESSIONS COMPLETED CELEBRATION CARD */
                                <div className="p-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Daily Lessons Complete
                                            </h3>
                                            <p className="text-[10px] text-slate-400">All allowed sessions for today completed (2/2)</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase border border-emerald-500/30">
                                            Limit Met (2/2)
                                        </span>
                                    </div>

                                    {/* Daily Status Breakdown */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-left">
                                            <div className="flex items-center justify-between">
                                                <FileText className="w-4 h-4 text-emerald-400" />
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 uppercase">1/1 Done</span>
                                            </div>
                                            <p className="text-xs font-bold text-white mt-1.5">Theory Class</p>
                                            <p className="text-[9px] text-slate-400">Completed for today</p>
                                        </div>

                                        <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-left">
                                            <div className="flex items-center justify-between">
                                                <Car className="w-4 h-4 text-emerald-400" />
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 uppercase">1/1 Done</span>
                                            </div>
                                            <p className="text-xs font-bold text-white mt-1.5">Practical Driving</p>
                                            <p className="text-[9px] text-slate-400">Completed for today</p>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-center">
                                        <p className="text-[11px] text-slate-300 leading-relaxed">
                                            You have completed your daily quota of <strong>1 Theory</strong> and <strong>1 Practical</strong> session. 
                                            Great work! Your attendance and hours have been recorded in your NTSA portfolio. See you tomorrow!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* PRE-SESSION LAUNCHER (CHOOSE LESSON TYPE & START) */
                                <div className="p-5 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/40 border border-indigo-500/30 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-indigo-400" /> Start Lesson Attendance
                                            </h3>
                                            <p className="text-[10px] text-slate-400">Step 1: Check in when your class begins (Max 1 Theory & 1 Practical/day)</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase border border-indigo-500/30">
                                            Daily Cap: 1+1
                                        </span>
                                    </div>

                                    {/* Lesson Phase Switcher (Theory vs Practical) */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Lesson Type</label>
                                            <span className="text-[9px] text-indigo-400 font-bold uppercase">
                                                {suggestedNextLessonType ? `Suggested: ${suggestedNextLessonType}` : 'Daily Quota'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (theoryDoneToday) {
                                                        toastInfo("You have already completed your 1 allowed Theory session for today.");
                                                        return;
                                                    }
                                                    setAttendancePhase('Theory');
                                                }}
                                                className={`p-3 rounded-2xl border text-left transition-all ${
                                                    theoryDoneToday
                                                        ? 'bg-slate-900/50 border-emerald-500/30 text-slate-400 opacity-80 cursor-default'
                                                        : attendancePhase === 'Theory'
                                                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <FileText className={`w-4 h-4 ${theoryDoneToday ? 'text-emerald-400' : attendancePhase === 'Theory' ? 'text-indigo-400' : 'text-slate-500'}`} />
                                                    {theoryDoneToday ? (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase flex items-center gap-1">
                                                            <Check className="w-2.5 h-2.5" /> 1/1 Done
                                                        </span>
                                                    ) : suggestedNextLessonType === 'Theory' ? (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 uppercase">Next (0/1)</span>
                                                    ) : (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">0/1</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-white mt-1.5">Theory Class</p>
                                                <p className="text-[9px] text-slate-400">{theoryDoneToday ? 'Completed today' : 'Rules & Highway Code'}</p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (practicalDoneToday) {
                                                        toastInfo("You have already completed your 1 allowed Practical session for today.");
                                                        return;
                                                    }
                                                    setAttendancePhase('Practical');
                                                }}
                                                className={`p-3 rounded-2xl border text-left transition-all ${
                                                    practicalDoneToday
                                                        ? 'bg-slate-900/50 border-emerald-500/30 text-slate-400 opacity-80 cursor-default'
                                                        : attendancePhase === 'Practical'
                                                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Car className={`w-4 h-4 ${practicalDoneToday ? 'text-emerald-400' : attendancePhase === 'Practical' ? 'text-indigo-400' : 'text-slate-500'}`} />
                                                    {practicalDoneToday ? (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase flex items-center gap-1">
                                                            <Check className="w-2.5 h-2.5" /> 1/1 Done
                                                        </span>
                                                    ) : suggestedNextLessonType === 'Practical' ? (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 uppercase">Next (0/1)</span>
                                                    ) : (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">0/1</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-white mt-1.5">Practical Driving</p>
                                                <p className="text-[9px] text-slate-400">{practicalDoneToday ? 'Completed today' : 'In-Vehicle Training'}</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Start Buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        <button
                                            onClick={() => executeAttendanceSession('start')}
                                            disabled={isDirectActionLoading || (attendancePhase === 'Theory' && theoryDoneToday) || (attendancePhase === 'Practical' && practicalDoneToday)}
                                            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isDirectActionLoading ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                            {(attendancePhase === 'Theory' && theoryDoneToday) || (attendancePhase === 'Practical' && practicalDoneToday)
                                                ? `${attendancePhase} Limit Met (1/1)`
                                                : `Start ${attendancePhase} Lesson`}
                                        </button>
                                        <button
                                            onClick={() => setAttendanceMode('scan')}
                                            className="w-full py-3.5 px-4 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Camera className="w-4 h-4 text-indigo-400" />
                                            Scan QR to Check In
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Segmented Switcher (Scanner vs Digital Pass) */}
                            <div className="p-1 rounded-2xl bg-slate-850 border border-slate-800 flex gap-1">
                                <button
                                    onClick={() => setAttendanceMode('scan')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        attendanceMode === 'scan'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Camera className="w-4 h-4" /> Scan Attendance
                                </button>
                                <button
                                    onClick={() => setAttendanceMode('pass')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        attendanceMode === 'pass'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <QrCode className="w-4 h-4" /> My Digital Pass
                                </button>
                            </div>

                            {/* SCANNER VIEW */}
                            {attendanceMode === 'scan' && (
                                <div className="space-y-4">
                                    {/* Guidance Strip for Scanner Action */}
                                    <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                                        activeInProgressLesson
                                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                                            : bothSessionsCompletedToday
                                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                activeInProgressLesson 
                                                    ? 'bg-amber-400 animate-ping' 
                                                    : bothSessionsCompletedToday
                                                        ? 'bg-emerald-400'
                                                        : 'bg-indigo-400'
                                            }`} />
                                            <span className="font-bold">
                                                {activeInProgressLesson 
                                                    ? `Ready: Scan QR to CHECK OUT & END your ${activeInProgressLesson.lessonType} lesson` 
                                                    : bothSessionsCompletedToday
                                                        ? 'Daily Limit Reached: 1 Theory and 1 Practical session already completed for today.'
                                                        : attendancePhase === 'Theory' && theoryDoneToday
                                                            ? 'Theory completed today (1/1). Switch to Practical to scan.'
                                                            : attendancePhase === 'Practical' && practicalDoneToday
                                                                ? 'Practical completed today (1/1). Switch to Theory to scan.'
                                                                : `Ready: Scan QR to CHECK IN & START your ${attendancePhase} lesson (1 Theory & 1 Practical/day)`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Live Camera Viewfinder Card */}
                                    <div className="relative rounded-[2.5rem] bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl aspect-[4/3] flex items-center justify-center">
                                        <video
                                            ref={videoRef}
                                            playsInline
                                            autoPlay
                                            muted
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Scanner Overlay Frame */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <div className="w-56 h-56 rounded-3xl border-2 border-indigo-500/80 relative shadow-[0_0_0_9999px_rgba(2,6,23,0.65)]">
                                                {/* Corner Accents */}
                                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
                                                {/* Animated Laser Scanline */}
                                                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#818cf8] animate-bounce" />
                                            </div>
                                        </div>

                                        {/* Camera Controls Overlay */}
                                        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                            {hasTorch && (
                                                <button
                                                    onClick={toggleTorch}
                                                    className={`p-2.5 rounded-xl backdrop-blur-md transition-all ${
                                                        torchOn ? 'bg-amber-500 text-slate-950' : 'bg-slate-900/80 text-white border border-slate-700/60'
                                                    }`}
                                                    title="Flashlight"
                                                >
                                                    <Zap className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
                                                }}
                                                className="p-2.5 rounded-xl bg-slate-900/80 text-white border border-slate-700/60 backdrop-blur-md active:scale-95 transition-all"
                                                title="Switch Camera"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Scanning Instruction Bar */}
                                        <div className="absolute bottom-4 inset-x-4 bg-slate-900/90 backdrop-blur-md py-2.5 px-4 rounded-2xl border border-slate-800 text-center">
                                            <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                                Point at Instructor or Vehicle QR
                                            </p>
                                        </div>

                                        {cameraError && (
                                            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
                                                <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                                                <h4 className="text-xs font-black text-white uppercase">Camera Error</h4>
                                                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{cameraError}</p>
                                                <button
                                                    onClick={startCamera}
                                                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl"
                                                >
                                                    Retry Camera
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Manual Code Input Fallback */}
                                    <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Manual Attendance PIN / Code</label>
                                            <span className="text-[9px] text-indigo-400 font-bold uppercase">If camera is blocked</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter Lesson # or Vehicle Plate"
                                                value={manualCodeInput}
                                                onChange={e => setManualCodeInput(e.target.value)}
                                                className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (!manualCodeInput.trim()) {
                                                        toastError("Enter a code to check in");
                                                        return;
                                                    }
                                                    handleProcessScanCode(manualCodeInput);
                                                    setManualCodeInput('');
                                                }}
                                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                                            >
                                                Submit Code
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DIGITAL PASS VIEW */}
                            {attendanceMode === 'pass' && (
                                <div className="space-y-4">
                                    <div className="relative rounded-[2.5rem] bg-gradient-to-b from-indigo-900/60 via-slate-900 to-slate-950 p-6 border border-indigo-500/30 shadow-2xl text-center space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                <span className="text-[10px] font-black tracking-widest text-indigo-200 uppercase">OFFICIAL DS ATTENDANCE PASS</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase">
                                                ACTIVE
                                            </span>
                                        </div>

                                        {/* QR Code Container */}
                                        <div className="p-4 bg-white rounded-3xl mx-auto w-52 h-52 shadow-xl flex items-center justify-center">
                                            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950" fill="currentColor">
                                                <path d="M0,0 h30 v30 h-30 z m5,5 v20 h20 v-20 z m5,5 h10 v10 h-10 z" />
                                                <path d="M70,0 h30 v30 h-30 z m5,5 v20 h20 v-20 z m5,5 h10 v10 h-10 z" />
                                                <path d="M0,70 h30 v30 h-30 z m5,5 v20 h20 v-20 z m5,5 h10 v10 h-10 z" />
                                                <path d="M38,0 h6 v15 h-6 z M48,5 h8 v10 h-8 z M60,0 h6 v15 h-6 z" />
                                                <path d="M38,20 h10 v8 h-10 z M52,18 h8 v10 h-8 z M64,22 h6 v8 h-6 z" />
                                                <path d="M0,38 h15 v6 h-15 z M20,40 h8 v10 h-8 z M0,55 h12 v8 h-12 z" />
                                                <path d="M35,35 h30 v30 h-30 z m6,6 v18 h18 v-18 z m4,4 h10 v10 h-10 z" />
                                                <path d="M70,38 h12 v6 h-12 z M86,40 h14 v8 h-14 z M72,52 h10 v10 h-10 z" />
                                                <path d="M38,70 h6 v12 h-6 z M48,72 h10 v8 h-10 z M62,70 h6 v12 h-6 z" />
                                                <path d="M38,86 h8 v14 h-8 z M50,88 h8 v12 h-8 z M62,86 h8 v14 h-8 z" />
                                                <path d="M72,72 h8 v8 h-8 z M84,70 h16 v6 h-16 z M75,85 h10 v15 h-10 z M90,82 h10 v18 h-10 z" />
                                            </svg>
                                        </div>

                                        <div>
                                            <h3 className="text-base font-black text-white">{studentName}</h3>
                                            <p className="text-xs font-mono font-bold text-indigo-400 mt-0.5">#{admissionNo}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                                                {courseCategory}
                                            </p>
                                        </div>

                                        {/* Barcode Strip */}
                                        <div className="pt-2 border-t border-indigo-500/20">
                                            <div className="h-8 flex items-center justify-center gap-1 opacity-80">
                                                {Array.from({ length: 32 }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="h-full bg-white rounded-full"
                                                        style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2)}px` }}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-mono mt-1">SCAN AT TOUCHSCREEN KIOSK OR INSTRUCTOR APP</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Attendance History & Verified Logs */}
                            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> Lesson Check-In Log
                                    </h4>
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        {completedLessons.length} Completed
                                    </span>
                                </div>

                                {myLessons.length === 0 ? (
                                    <div className="py-6 text-center text-slate-500 text-xs">
                                        No checked-in lessons yet. Scan QR or tap start to record attendance!
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {/* If active in-progress lesson, show on top */}
                                        {activeInProgressLesson && (
                                            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Timer className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                                            {activeInProgressLesson.lessonType} Driving Lesson
                                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                                        </p>
                                                        <p className="text-[10px] text-slate-300 mt-0.5">
                                                            In-Progress • Checked in at <span className="text-white font-bold">{activeInProgressLesson.checkInTime || activeInProgressLesson.startTime}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => executeAttendanceSession('end')}
                                                    disabled={isDirectActionLoading}
                                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 shadow-md shadow-emerald-600/20"
                                                >
                                                    Check Out
                                                </button>
                                            </div>
                                        )}

                                        {/* Completed & Historical Lessons */}
                                        {completedLessons.slice(0, 5).map(l => (
                                            <div key={l.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                                        {l.lessonType === 'Practical' ? <Car className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                                            {l.lessonType} Driving Lesson
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {new Date(l.lessonDate || (l as any).date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • In: <span className="text-slate-300 font-bold">{l.checkInTime || l.startTime}</span>
                                                            {l.checkOutTime && (
                                                                <> • Out: <span className="text-slate-300 font-bold">{l.checkOutTime}</span></>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* HUB 2: FINANCIAL WALLET (INVOICES, RECEIPTS & STATEMENTS) */}
                    {/* ========================================================= */}
                    {activeTab === 'finance' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Android Balance Card */}
                            <div className="p-6 rounded-[2.5rem] bg-gradient-to-tr from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                                
                                <div className="flex items-center justify-between text-indigo-300 text-xs font-bold uppercase tracking-widest">
                                    <span>Course Fee Balance</span>
                                    {currentBalance === 0 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                                            CLEARED ✅
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black">
                                            DUE ⚠️
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3">
                                    <h2 className="text-3xl font-black text-white tracking-tight">
                                        KES {currentBalance.toLocaleString()}
                                    </h2>
                                </div>

                                <div className="mt-4 pt-4 border-t border-indigo-500/20 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</p>
                                        <p className="text-sm font-black text-white mt-0.5">KES {totalInvoiced.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</p>
                                        <p className="text-sm font-black text-emerald-400 mt-0.5">KES {totalPaid.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => setIsMpesaModalOpen(true)}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                    >
                                        <Wallet className="w-4 h-4" /> Pay with M-Pesa
                                    </button>
                                    <button
                                        onClick={handleDownloadFullStatement}
                                        disabled={pdfLoading}
                                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                        title="Download Full Statement PDF"
                                    >
                                        <FileText className="w-4 h-4" /> Statement
                                    </button>
                                </div>
                            </div>

                            {/* Segmented Finance Switcher */}
                            <div className="p-1 rounded-2xl bg-slate-850 border border-slate-800 flex gap-1">
                                <button
                                    onClick={() => setFinanceSubTab('overview')}
                                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                        financeSubTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setFinanceSubTab('invoices')}
                                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                        financeSubTab === 'invoices' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Invoices ({myInvoices.length})
                                </button>
                                <button
                                    onClick={() => setFinanceSubTab('receipts')}
                                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                        financeSubTab === 'receipts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Receipts ({myPayments.length})
                                </button>
                                <button
                                    onClick={() => setFinanceSubTab('statement')}
                                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                        financeSubTab === 'statement' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Ledger
                                </button>
                            </div>

                            {/* INVOICES LIST */}
                            {financeSubTab === 'invoices' && (
                                <div className="space-y-3">
                                    {myInvoices.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-xs">
                                            No tuition invoices found for your account.
                                        </div>
                                    ) : (
                                        myInvoices.map(inv => (
                                            <div key={inv.id} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-mono font-black text-indigo-400">
                                                            {inv.invoiceNumber || inv.id}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {inv.invoiceDate || new Date().toISOString().split('T')[0]}
                                                        </p>
                                                    </div>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                        Number(inv.balance) <= 0 
                                                            ? 'bg-emerald-500/20 text-emerald-300' 
                                                            : 'bg-amber-500/20 text-amber-300'
                                                    }`}>
                                                        {Number(inv.balance) <= 0 ? 'Paid' : 'Pending'}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400">Amount Billed</span>
                                                        <p className="text-sm font-black text-white">KES {Number(inv.totalAmount).toLocaleString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDownloadInvoice(inv)}
                                                        disabled={pdfLoading}
                                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> PDF Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* RECEIPTS LIST */}
                            {financeSubTab === 'receipts' && (
                                <div className="space-y-3">
                                    {myPayments.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-xs">
                                            No payment receipts found yet.
                                        </div>
                                    ) : (
                                        myPayments.map(p => (
                                            <div key={p.id} className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-mono font-black text-emerald-400">
                                                            {p.receiptNumber || p.id}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            {p.paymentDate || p.createdAt?.split('T')[0]} • {p.paymentMethod || 'M-Pesa'}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-black text-white">
                                                        KES {Number(p.amount).toLocaleString()}
                                                    </span>
                                                </div>

                                                {p.transactionReference && (
                                                    <p className="text-[10px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded-xl">
                                                        Ref: {p.transactionReference}
                                                    </p>
                                                )}

                                                <div className="flex gap-2 pt-2 border-t border-slate-800">
                                                    <button
                                                        onClick={() => handleDownloadReceipt(p)}
                                                        disabled={pdfLoading}
                                                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> Standard PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadThermalSlip(p)}
                                                        disabled={pdfLoading}
                                                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
                                                        title="Thermal Slip View"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" /> Slip
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* STATEMENT / LEDGER VIEW */}
                            {(financeSubTab === 'overview' || financeSubTab === 'statement') && (
                                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Receipt className="w-3.5 h-3.5 text-indigo-400" /> Account Statement Ledger
                                        </h4>
                                        <button
                                            onClick={handleDownloadFullStatement}
                                            disabled={pdfLoading}
                                            className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Download PDF
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {myInvoices.slice(0, 3).map(inv => (
                                            <div key={inv.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-white">Tuition Fee Charge</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{inv.invoiceNumber || inv.id}</p>
                                                </div>
                                                <span className="font-black text-rose-400">+ KES {Number(inv.totalAmount).toLocaleString()}</span>
                                            </div>
                                        ))}

                                        {myPayments.slice(0, 3).map(p => (
                                            <div key={p.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-white">Payment Received</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.receiptNumber || p.transactionReference || p.id}</p>
                                                </div>
                                                <span className="font-black text-emerald-400">- KES {Number(p.amount).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* HUB 3: TRAINING & LESSONS (SCHEDULE & NTSA LOGBOOK)       */}
                    {/* ========================================================= */}
                    {activeTab === 'lessons' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Next Up Lesson Hero Card */}
                            {nextUpcomingLesson ? (
                                <div className="p-5 rounded-[2.5rem] bg-gradient-to-tr from-violet-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                                            Next Scheduled Session
                                        </span>
                                        <span className="text-xs font-black text-emerald-400">
                                            {nextUpcomingLesson.lessonDate}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black text-white">
                                            {nextUpcomingLesson.lessonType} Driving Session
                                        </h3>
                                        <p className="text-xs text-indigo-300 mt-0.5 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {nextUpcomingLesson.startTime} - {nextUpcomingLesson.endTime}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-indigo-500/20 grid grid-cols-2 gap-2 text-[11px]">
                                        <div className="p-2.5 rounded-xl bg-slate-900/60">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Instructor</p>
                                            <p className="font-bold text-white truncate">{getInstructorName(nextUpcomingLesson.instructorId)}</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-900/60">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Vehicle / Plate</p>
                                            <p className="font-bold text-white truncate">{getVehiclePlate(nextUpcomingLesson.vehicleId)}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setActiveTab('attendance');
                                            setAttendanceMode('scan');
                                        }}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                                    >
                                        <Camera className="w-4 h-4" /> Check In Attendance via QR
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6 rounded-[2.5rem] bg-slate-850 border border-slate-800 text-center space-y-3">
                                    <Car className="w-10 h-10 text-indigo-400 mx-auto" />
                                    <div>
                                        <h4 className="text-sm font-black text-white">No Upcoming Lesson Today</h4>
                                        <p className="text-xs text-slate-400 mt-1">Ready for your next driving slot? Self-book below.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsBookingModalOpen(true)}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
                                    >
                                        <Calendar className="w-4 h-4" /> Book Next Lesson
                                    </button>
                                </div>
                            )}

                            {/* NTSA Curriculum Progress Card */}
                            <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-indigo-400" /> NTSA Training Mastery
                                    </h4>
                                    <span className="text-xs font-black text-indigo-400">{overallProgress}% Complete</span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                                            <span>Practical Driving Mastery</span>
                                            <span>{practicalProgress}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                                            <div 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                                                style={{ width: `${practicalProgress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                                            <span>Theory & Road Signs</span>
                                            <span>{theoryProgress}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                                            <div 
                                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500"
                                                style={{ width: `${theoryProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Grid */}
                                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px]">
                                    {[
                                        { name: 'Hill Start & Clutch', done: practicalProgress >= 40 },
                                        { name: 'Parallel Parking', done: practicalProgress >= 60 },
                                        { name: 'Three-Point Turn', done: practicalProgress >= 50 },
                                        { name: 'Highway Driving', done: practicalProgress >= 80 },
                                        { name: 'Emergency Braking', done: practicalProgress >= 70 },
                                        { name: 'Model Town Board', done: theoryProgress >= 60 },
                                    ].map((s, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                            <span className="font-bold text-slate-300 truncate">{s.name}</span>
                                            {s.done ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            ) : (
                                                <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lesson Schedule Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsBookingModalOpen(true)}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Calendar className="w-4 h-4" /> Self-Book New Lesson
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* HUB 4: ALUMNAE & GRADUATION PORTAL                        */}
                    {/* ========================================================= */}
                    {activeTab === 'alumnae' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Graduation Stepper Tracker */}
                            <div className="p-5 rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <GraduationCap className="w-4 h-4 text-indigo-400" /> Licensing & Graduation Journey
                                    </h3>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 uppercase">
                                        {studentRecord?.status || 'Active'}
                                    </span>
                                </div>

                                <div className="space-y-3 relative pl-4 border-l-2 border-indigo-500/30 ml-2">
                                    {[
                                        { title: 'Enrolled & Biometrics Registered', desc: 'Admission verified and candidate account opened', done: true },
                                        { title: 'PDL (Provisional Driving License)', desc: 'Official NTSA provisional road learner permit issued', done: !!studentRecord?.pdlNumber || practicalProgress >= 20 },
                                        { title: 'Theory & Practical Logbook Completed', desc: 'All required driving hours and road maneuvers clocked', done: overallProgress >= 90 },
                                        { title: 'NTSA Test Booking & Interim License', desc: 'Scheduled for formal evaluation at testing center', done: studentRecord?.status === 'Graduated' || overallProgress >= 95 },
                                        { title: 'Smart Driving License Issued', desc: 'Certified driver credentials ready for collection', done: studentRecord?.status === 'Graduated' },
                                    ].map((step, idx) => (
                                        <div key={idx} className="relative">
                                            <div className={`absolute -left-[23px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                step.done ? 'bg-emerald-500 border-slate-950 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-600'
                                            }`}>
                                                {step.done ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                                            </div>
                                            <p className={`text-xs font-bold ${step.done ? 'text-white' : 'text-slate-400'}`}>{step.title}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Digital Certificates Card */}
                            <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-amber-400" /> Official Driving Certificates
                                    </h4>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Tamper-Proof PDF</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        onClick={handleDownloadLeavingCert}
                                        disabled={pdfLoading}
                                        className="p-3.5 rounded-2xl bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group active:scale-95"
                                    >
                                        <FileText className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                                        <p className="text-xs font-black text-white">Leaving Certificate</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Download Official Record</p>
                                    </button>

                                    <button
                                        onClick={handleDownloadCompletionCert}
                                        disabled={pdfLoading}
                                        className="p-3.5 rounded-2xl bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group active:scale-95"
                                    >
                                        <Award className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-2" />
                                        <p className="text-xs font-black text-white">Completion Cert</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Driving Competence Cert</p>
                                    </button>
                                </div>
                            </div>

                            {/* Alumni Driver Network & Career Hub */}
                            <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-3">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Briefcase className="w-4 h-4 text-indigo-400" /> Alumni Driver Career Network
                                </h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Exclusive fleet opportunities & advanced masterclasses for driving school graduates.
                                </p>

                                <div className="space-y-2">
                                    {[
                                        { role: 'Corporate Fleet Chauffeur', company: 'Nairobi Express Logistics', pay: 'KES 45,000 - 65,000' },
                                        { role: 'School Bus & Shuttle Operator', company: 'EduTrans Transit Services', pay: 'KES 40,000 - 55,000' },
                                        { role: 'Courier & Delivery Driver', company: 'CityFast Delivery Hub', pay: 'KES 35,000 - 48,000' },
                                    ].map((job, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-white">{job.role}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{job.company} • <span className="text-emerald-400 font-bold">{job.pay}</span></p>
                                            </div>
                                            <button 
                                                onClick={() => success("Application noted! The career team will reach out to you.")}
                                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* App Installation & Offline Access Card */}
                            <div className="p-4 rounded-3xl bg-slate-850 border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <Smartphone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-wider">DS Candidate Mobile App</h4>
                                            <p className="text-[10px] text-slate-400">Offline receipts, attendance QR, and class reminders</p>
                                        </div>
                                    </div>
                                    {isInstalled ? (
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Installed
                                        </span>
                                    ) : (
                                        <button
                                            onClick={handleInstallApp}
                                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-emerald-950/40"
                                        >
                                            Install App
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                                        <p className="text-[11px] font-black text-emerald-400">Offline</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Receipts & Pass</p>
                                    </div>
                                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                                        <p className="text-[11px] font-black text-indigo-400">1-Tap</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Home Screen</p>
                                    </div>
                                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80">
                                        <p className="text-[11px] font-black text-amber-400">&lt; 3MB</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">No App Store</p>
                                    </div>
                                </div>

                                {!isInstalled && (
                                    <button
                                        onClick={() => setIsInstallModalOpen(true)}
                                        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-[11px] font-bold border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        <span>View Step-by-Step Installation Guide</span>
                                    </button>
                                )}
                            </div>

                            {/* Refer-A-Friend Card */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Refer a Friend & Earn KES 1,000
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Share your school referral link with aspiring drivers</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const shareText = `Join me at ${currentInstitution.name}! Enroll for your driving license today: ${window.location.origin}`;
                                        if (navigator.share) {
                                            navigator.share({ title: currentInstitution.name, text: shareText, url: window.location.origin });
                                        } else if (navigator.clipboard) {
                                            navigator.clipboard.writeText(shareText);
                                            success("Referral text copied to clipboard!");
                                        }
                                    }}
                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 active:scale-95"
                                >
                                    <Share2 className="w-3.5 h-3.5" /> Share
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================= */}
                {/* 4. ANDROID NATIVE BOTTOM NAVIGATION DOCK (FIXED)          */}
                {/* ========================================================= */}
                <div className="fixed sm:absolute bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex items-center justify-around z-40 shadow-2xl safe-area-pb">
                    
                    {/* Tab 1: Attendance */}
                    <button
                        onClick={() => {
                            setActiveTab('attendance');
                            setAttendanceMode('scan');
                        }}
                        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                            activeTab === 'attendance'
                                ? 'text-indigo-400 scale-105'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl ${activeTab === 'attendance' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
                            <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">Attendance</span>
                    </button>

                    {/* Tab 2: Finances */}
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                            activeTab === 'finance'
                                ? 'text-indigo-400 scale-105'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl ${activeTab === 'finance' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">Finances</span>
                    </button>

                    {/* Central Floating Quick Scan FAB */}
                    <button
                        onClick={() => {
                            setActiveTab('attendance');
                            setAttendanceMode('scan');
                            startCamera();
                        }}
                        className="-mt-7 w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border-4 border-slate-900"
                        title="Scan QR Attendance"
                    >
                        <QrCode className="w-6 h-6" />
                    </button>

                    {/* Tab 3: Lessons */}
                    <button
                        onClick={() => setActiveTab('lessons')}
                        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                            activeTab === 'lessons'
                                ? 'text-indigo-400 scale-105'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl ${activeTab === 'lessons' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
                            <Car className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">Lessons</span>
                    </button>

                    {/* Tab 4: Alumnae */}
                    <button
                        onClick={() => setActiveTab('alumnae')}
                        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                            activeTab === 'alumnae'
                                ? 'text-indigo-400 scale-105'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl ${activeTab === 'alumnae' ? 'bg-indigo-600/20 text-indigo-400' : ''}`}>
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider">Alumnae</span>
                    </button>
                </div>

                {/* ========================================================= */}
                {/* 5. ANDROID BOTTOM SHEET MODALS                           */}
                {/* ========================================================= */}

                {/* M-Pesa Payment Bottom Sheet */}
                {isMpesaModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
                        <div className="w-full max-w-md bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-800 p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />
                            
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                                        M
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Pay Course Fee via M-Pesa</h3>
                                </div>
                                <button onClick={() => setIsMpesaModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold uppercase">Business Paybill</span>
                                    <span className="font-mono font-black text-emerald-400 text-sm">
                                        {(settings as any)?.mpesaPaybillNumber || currentInstitution?.mpesaConfig?.shortCode || '400200'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                                    <span className="text-slate-400 font-bold uppercase">Account Number</span>
                                    <span className="font-mono font-black text-indigo-400 text-sm">
                                        {admissionNo}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                                    <span className="text-slate-400 font-bold uppercase">Balance Due</span>
                                    <span className="font-black text-white text-sm">
                                        KES {currentBalance.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                                Open M-Pesa on your phone, go to <strong>Lipa na M-Pesa</strong> → <strong>Paybill</strong>, enter the Paybill and Account Number above. Once paid, your balance updates immediately.
                            </p>

                            <button
                                onClick={() => {
                                    success("Payment verified! Account updated.");
                                    setIsMpesaModalOpen(false);
                                    if (refreshData) refreshData();
                                }}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                            >
                                I Have Completed Payment
                            </button>
                        </div>
                    </div>
                )}

                {/* Lesson Booking Bottom Sheet */}
                {isBookingModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
                        <div className="w-full max-w-md bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-800 p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />
                            
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Book Training Lesson</h3>
                                </div>
                                <button onClick={() => setIsBookingModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleBookLesson} className="space-y-3 text-xs">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lesson Type</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setBookingType('Practical')}
                                            className={`py-2.5 rounded-xl font-black uppercase text-[11px] border transition-all ${
                                                bookingType === 'Practical'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                            }`}
                                        >
                                            Practical (Car)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBookingType('Theory')}
                                            className={`py-2.5 rounded-xl font-black uppercase text-[11px] border transition-all ${
                                                bookingType === 'Theory'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                            }`}
                                        >
                                            Theory (Class)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={bookingDate}
                                        onChange={e => setBookingDate(e.target.value)}
                                        className="w-full mt-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Time</label>
                                        <input
                                            type="time"
                                            value={bookingStart}
                                            onChange={e => setBookingStart(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">End Time</label>
                                        <input
                                            type="time"
                                            value={bookingEnd}
                                            onChange={e => setBookingEnd(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Instructor</label>
                                    <select
                                        required
                                        value={bookingInstructor}
                                        onChange={e => setBookingInstructor(e.target.value)}
                                        className="w-full mt-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select an instructor...</option>
                                        {(instructors || []).filter(i => i.status === 'Active').map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {bookingType === 'Practical' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preferred Vehicle</label>
                                        <select
                                            value={bookingVehicle}
                                            onChange={e => setBookingVehicle(e.target.value)}
                                            className="w-full mt-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Any available vehicle</option>
                                            {(vehicles || []).filter(v => v.status === 'Operational').map(veh => (
                                                <option key={veh.id} value={veh.id}>{veh.make} {veh.model} ({veh.plateNumber})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={bookingLoading}
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {bookingLoading ? 'Confirming...' : 'Confirm Lesson Booking'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Scan Success Celebration Modal */}
                {scanSuccessModal?.isOpen && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                        <div className={`w-full max-w-sm bg-slate-900 rounded-[2.5rem] border p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 ${
                            scanSuccessModal.phase === 'started' ? 'border-indigo-500/40' : 'border-emerald-500/40'
                        }`}>
                            <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto shadow-lg ${
                                scanSuccessModal.phase === 'started'
                                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-indigo-500/20'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'
                            }`}>
                                {scanSuccessModal.phase === 'started' ? (
                                    <Timer className="w-8 h-8 animate-pulse" />
                                ) : (
                                    <CheckCircle2 className="w-8 h-8" />
                                )}
                            </div>

                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 border">
                                    {scanSuccessModal.phase === 'started' ? (
                                        <span className="text-indigo-400 bg-indigo-500/10 border-indigo-500/30">Phase 1: Session Started</span>
                                    ) : (
                                        <span className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30">Phase 2: Attendance Completed</span>
                                    )}
                                </div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight">
                                    {scanSuccessModal.phase === 'started' ? 'Check-In Recorded!' : 'Attendance Verified!'}
                                </h3>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                    {scanSuccessModal.message || "Your attendance check-in has been successfully recorded."}
                                </p>
                            </div>

                            {scanSuccessModal.lesson && (
                                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Lesson Type:</span>
                                        <span className="font-bold text-white">{scanSuccessModal.lesson.lessonType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Session Check-In:</span>
                                        <span className="font-bold text-indigo-400">{scanSuccessModal.lesson.checkInTime || scanSuccessModal.lesson.startTime}</span>
                                    </div>
                                    {scanSuccessModal.lesson.checkOutTime && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Session Check-Out:</span>
                                            <span className="font-bold text-emerald-400">{scanSuccessModal.lesson.checkOutTime}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">NTSA Status:</span>
                                        <span className={`font-black uppercase text-[10px] ${scanSuccessModal.phase === 'started' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                            {scanSuccessModal.phase === 'started' ? 'In Progress' : 'Verified'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {scanSuccessModal.nextActionNote && (
                                <div className={`p-3 rounded-xl text-left text-[11px] font-medium leading-relaxed border ${
                                    scanSuccessModal.phase === 'started' 
                                        ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200' 
                                        : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                                }`}>
                                    <p className="font-bold uppercase tracking-wider text-[9px] mb-1 opacity-75">
                                        {scanSuccessModal.phase === 'started' ? '👉 Required Next Step' : '🎉 Milestones Updated'}
                                    </p>
                                    {scanSuccessModal.nextActionNote}
                                </div>
                            )}

                            <button
                                onClick={() => setScanSuccessModal(null)}
                                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 ${
                                    scanSuccessModal.phase === 'started'
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                                }`}
                            >
                                {scanSuccessModal.phase === 'started' ? 'Continue Lesson' : 'Done'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Install App Bottom Sheet Modal */}
                {isInstallModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
                        <div className="w-full max-w-md bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-800 p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto">
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />

                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Install DS Student App</h3>
                                        <p className="text-[10px] text-slate-400">{currentInstitution.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsInstallModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Direct 1-Tap Install Button if Browser Event Captured */}
                            {(deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt)) && (
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 space-y-2">
                                    <p className="text-xs font-black text-white flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Fast 1-Tap Installation Ready
                                    </p>
                                    <p className="text-[11px] text-slate-300">
                                        Your browser supports instant installation. Tap the button below to add the app directly to your device.
                                    </p>
                                    <button
                                        onClick={handleInstallApp}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> Install Now to Home Screen
                                    </button>
                                </div>
                            )}

                            {/* Platform-Specific Step-by-Step Guide Switcher */}
                            <div className="space-y-3">
                                <div className="p-1 rounded-2xl bg-slate-950 border border-slate-800 flex gap-1">
                                    <button
                                        onClick={() => setInstallTab('android')}
                                        className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                            (installTab === 'android' || (installTab === 'auto' && isAndroid))
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Android
                                    </button>
                                    <button
                                        onClick={() => setInstallTab('ios')}
                                        className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                            (installTab === 'ios' || (installTab === 'auto' && isIOS))
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        iPhone / iPad
                                    </button>
                                    <button
                                        onClick={() => setInstallTab('desktop')}
                                        className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                            (installTab === 'desktop' || (installTab === 'auto' && !isAndroid && !isIOS))
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        PC / Mac
                                    </button>
                                </div>

                                {/* Android Instructions */}
                                {(installTab === 'android' || (installTab === 'auto' && isAndroid)) && (
                                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase">
                                            <span>Install via Google Chrome / Samsung Internet</span>
                                        </div>
                                        <ol className="space-y-2.5 text-xs text-slate-300">
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                                <span>Tap the <strong>three vertical dots menu</strong> (<MoreVertical className="w-3.5 h-3.5 inline text-emerald-400" />) in the top-right corner of Chrome.</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                                <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                                <span>Tap <strong>"Install"</strong> to confirm. The app will launch in full screen with native app performance!</span>
                                            </li>
                                        </ol>
                                    </div>
                                )}

                                {/* iOS Safari Instructions */}
                                {(installTab === 'ios' || (installTab === 'auto' && isIOS)) && (
                                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase">
                                            <span>Install via Apple Safari on iPhone / iPad</span>
                                        </div>
                                        <ol className="space-y-2.5 text-xs text-slate-300">
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                                <span>In Safari, tap the <strong>Share button</strong> (<Share2 className="w-3.5 h-3.5 inline text-indigo-400" />) in the bottom toolbar.</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                                <span>Scroll down the action sheet and tap <strong>"Add to Home Screen"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />).</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                                <span>Tap <strong>"Add"</strong> in the top right. The Driving School app icon will appear instantly on your home screen!</span>
                                            </li>
                                        </ol>
                                    </div>
                                )}

                                {/* Desktop / PC / Mac Instructions */}
                                {(installTab === 'desktop' || (installTab === 'auto' && !isAndroid && !isIOS)) && (
                                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase">
                                            <span>Install on Chrome / Edge / Brave Desktop</span>
                                        </div>
                                        <ol className="space-y-2.5 text-xs text-slate-300">
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                                <span>Look at the right end of the address bar at the top of your browser.</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                                <span>Click the <strong>Install App icon</strong> (<Download className="w-3.5 h-3.5 inline text-emerald-400" />).</span>
                                            </li>
                                            <li className="flex items-start gap-2.5">
                                                <span className="w-5 h-5 rounded-full bg-slate-850 border border-slate-700 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                                <span>Click <strong>"Install"</strong> to add EduAI DS Student Portal to your applications and dock.</span>
                                            </li>
                                        </ol>
                                    </div>
                                )}
                            </div>

                            {/* Features breakdown */}
                            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px] space-y-2">
                                <p className="font-bold text-white uppercase text-[10px] tracking-wider">Why install the app?</p>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>Works offline</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>Instant camera scanner</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>No store account needed</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>Quick fee receipts</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsInstallModalOpen(false)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                            >
                                Close Guide
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default DSStudentPortal;
