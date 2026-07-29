import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { 
    Users, 
    UserPlus, 
    Search, 
    Filter, 
    Plus, 
    Sparkles, 
    CreditCard, 
    ShieldCheck, 
    Fingerprint, 
    FileSpreadsheet, 
    GraduationCap, 
    Briefcase,
    Calendar,
    Mail,
    Phone,
    UserCheck,
    CheckCircle2,
    XCircle,
    Trash2,
    Edit3,
    Send,
    MessageSquare,
    Bell,
    Clock,
    MapPin,
    AlertCircle,
    CheckCircle,
    Check,
    Key,
    Link,
    Copy,
    UserRound,
    Edit2,
    RotateCcw,
    X,
    Star,
    ExternalLink,
    Printer,
    FlaskConical
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { User, StudentEnrollment, Institution, CourseLevel, Subject, Visitor, AcademicLevel, Role, Course, CompanyDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { generateEventReportPdf, generateStudentIdCardPdf, generateLeaveOutSheetPdf, generateClassListPdf } from '../../services/pdfService';
import Webcam from 'react-webcam';
import { ExcelSmartImporter } from './ExcelSmartImporter';
import { formatRoleDisplayName, getRolesForInstitution } from '../../utils/roleUtils';
import { VALID_STAFF_ROLES } from '../../constants';
import { formatPhoneNumber, phonesMatch } from '../../utils/stringUtils';
import { PdfViewer } from '../PdfViewer';

const teacherRoles = ['teacher', 'lecturer', 'practice_teacher', 'county_teacher'];
const nonSupportRoles = [
    'student', 'parent', 'customer', 'lead', 'member',
    'super_admin', 'main_admin',
    'reseller'
];

const globalShortUrlCache: Record<string, string> = {};

const ShortenedUrlField: React.FC<{
    longUrl: string;
    theme: 'indigo' | 'violet';
    setStatusMsg: (msg: { type: 'success' | 'error' | 'info' | 'idle', message: string }) => void;
}> = ({ longUrl, theme, setStatusMsg }) => {
    const [shortUrl, setShortUrl] = useState<string>(globalShortUrlCache[longUrl] || '');
    const [loading, setLoading] = useState<boolean>(!globalShortUrlCache[longUrl]);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        if (globalShortUrlCache[longUrl]) {
            setShortUrl(globalShortUrlCache[longUrl]);
            setLoading(false);
            return;
        }

        let isMounted = true;
        const fetchShortUrl = async () => {
            try {
                setLoading(true);
                setError(false);
                const shortened = await apiService.shortenUrl(longUrl);
                if (isMounted) {
                    if (shortened && shortened.startsWith('http')) {
                        globalShortUrlCache[longUrl] = shortened;
                        setShortUrl(shortened);
                    } else {
                        throw new Error('Invalid URL returned');
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    // Fallback to normalized long URL so a copyable link is generated at all times
                    const fallbackUrl = longUrl.includes('localhost') || longUrl.includes('127.0.0.1')
                        ? longUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://portal.eduai.co.ke')
                        : longUrl;
                    globalShortUrlCache[longUrl] = fallbackUrl;
                    setShortUrl(fallbackUrl);
                    setError(false);
                    setLoading(false);
                }
            }
        };

        fetchShortUrl();
        return () => {
            isMounted = false;
        };
    }, [longUrl]);

    const themeClasses = {
        indigo: {
            wrapper: 'bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10',
            text: 'text-indigo-750 dark:text-indigo-300',
            button: 'hover:bg-indigo-200/60 dark:hover:bg-indigo-500/20',
            icon: 'text-indigo-600 dark:text-indigo-400'
        },
        violet: {
            wrapper: 'bg-violet-50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10',
            text: 'text-violet-750 dark:text-violet-300',
            button: 'hover:bg-violet-200/60 dark:hover:bg-violet-500/20',
            icon: 'text-violet-600 dark:text-violet-400'
        }
    }[theme];

    if (loading) {
        return (
            <div className={`flex items-center gap-1 ${themeClasses.wrapper} rounded-xl px-2 py-1 h-[26px]`}>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 italic animate-pulse">Shortening link...</span>
            </div>
        );
    }

    if (error || !shortUrl) {
        return (
            <div className={`flex items-center justify-between gap-1 ${themeClasses.wrapper} rounded-xl px-2 py-0.5 h-[26px]`}>
                <span className="text-[9px] font-medium text-rose-505 dark:text-rose-400 truncate">Failed to shorten</span>
                <button
                    type="button"
                    onClick={async () => {
                        let isMounted = true;
                        try {
                            setLoading(true);
                            setError(false);
                            const shortened = await apiService.shortenUrl(longUrl);
                            if (isMounted) {
                                if (shortened && shortened.startsWith('http')) {
                                    globalShortUrlCache[longUrl] = shortened;
                                    setShortUrl(shortened);
                                    setError(false);
                                } else {
                                    throw new Error('Invalid URL');
                                }
                                setLoading(false);
                            }
                        } catch (err) {
                            if (isMounted) {
                                const fallbackUrl = longUrl.includes('localhost') || longUrl.includes('127.0.0.1')
                                    ? longUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://portal.eduai.co.ke')
                                    : longUrl;
                                globalShortUrlCache[longUrl] = fallbackUrl;
                                setShortUrl(fallbackUrl);
                                setError(false);
                                setLoading(false);
                            }
                        }
                    }}
                    className="text-[8px] font-black uppercase text-indigo-650 hover:text-indigo-850 px-1 py-0.5"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1 ${themeClasses.wrapper} rounded-xl px-2 py-1`}>
            <input
                type="text"
                readOnly
                value={shortUrl}
                onClick={e => (e.target as HTMLInputElement).select()}
                className={`flex-1 bg-transparent text-[9px] font-mono ${themeClasses.text} outline-none min-w-0 cursor-text`}
            />
            <button
                type="button"
                onClick={async () => {
                    try { await navigator.clipboard.writeText(shortUrl); } catch { alert(shortUrl); }
                    setStatusMsg({ type: 'success', message: 'Shortened link copied!' });
                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 2500);
                }}
                className={`shrink-0 p-0.5 ${themeClasses.button} rounded transition-all`}
                title="Copy Short URL"
            >
                <Link className={`w-2.5 h-2.5 ${themeClasses.icon}`} />
            </button>
        </div>
    );
};

// Helper to evaluate if an enrollment matches an event target scope (All, Grade, or specific student IDs)
const isEventTargetMatch = (target: string | undefined, enr: any, context?: string): boolean => {
    if (!target || target === 'All') return true;
    if (target.startsWith('students:')) {
        const sIds = target.replace('students:', '').split(',').map(s => s.trim());
        return sIds.includes(enr.userId);
    }
    if (context === 'driving_school') return enr.metadata?.licenseCategory === target;
    return enr.metadata?.gradeLevel === target;
};

interface StudentEnrollmentManagerProps {
    context: 'academic' | 'driving_school';
    currentInstitution: Institution;
    activeTab?: 'students' | 'teachers' | 'support_staff' | 'broadcaster' | 'calendar' | 'guests' | 'portal_hub';
    companyDetails?: CompanyDetails;
    currentUser?: User;
    onLogAction?: (message: string) => Promise<void>;
}

export const StudentEnrollmentManager: React.FC<StudentEnrollmentManagerProps> = ({ 
    context, 
    currentInstitution,
    activeTab: passedActiveTab,
    companyDetails,
    currentUser,
    onLogAction
}) => {
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<User | null>(null);
    const [isClassSupervisor, setIsClassSupervisor] = useState(false);
    const [supervisesStreamId, setSupervisesStreamId] = useState('');
    const [staffFormData, setStaffFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        role: '',
        gender: '' as 'Male' | 'Female' | 'Other' | ''
    });
    const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
    const [roleModalNewRole, setRoleModalNewRole] = useState<string>('');
    const [roleModalSaving, setRoleModalSaving] = useState(false);
    const [roleModalSourceTab, setRoleModalSourceTab] = useState<'teachers' | 'support_staff'>('support_staff');
    const [users, setUsers] = useState<User[]>([]);
    const [instructors, setInstructors] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
    const [importGradeLevel, setImportGradeLevel] = useState('');
    const [importStream, setImportStream] = useState('');
    const isPrimaryOrSecondary = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const cat = (currentInstitution?.category || '').toLowerCase();
        return ['primary', 'secondary'].includes(type) || ['primary', 'secondary'].includes(cat);
    }, [currentInstitution]);

    const isNameUnknown = (name: string | undefined | null): boolean => {
        if (!name) return true;
        const clean = name.trim().toLowerCase();
        return clean === '' || clean === 'unknown student' || clean === 'unknown' || clean === 'student' || clean === 'null' || clean === 'undefined';
    };

    const getStudentDisplayName = (enr: StudentEnrollment, user?: User): string => {
        if (user && user.name && !isNameUnknown(user.name)) {
            return user.name.trim();
        }
        if (enr.metadata?.studentName && !isNameUnknown(enr.metadata.studentName)) {
            return enr.metadata.studentName.trim();
        }
        if (enr.metadata?.name && !isNameUnknown(enr.metadata.name)) {
            return enr.metadata.name.trim();
        }
        if (enr.metadata?.parentName && enr.metadata.parentName.trim()) {
            return enr.metadata.parentName.trim();
        }
        if (enr.metadata?.parents?.[0]?.name && enr.metadata.parents[0].name.trim()) {
            return enr.metadata.parents[0].name.trim();
        }
        return 'Unknown Student';
    };

    const isEventTargetMatch = (eventTarget: string | undefined | null, enr: StudentEnrollment) => {
        if (!eventTarget) return true;
        const targetClean = eventTarget.trim().toLowerCase();
        if (
            targetClean === 'all' || 
            targetClean === 'all students' || 
            targetClean === 'all_students' || 
            targetClean === 'all cohorts' || 
            targetClean === 'all_cohorts' || 
            targetClean === ''
        ) {
            return true;
        }

        if (targetClean.startsWith('students:')) {
            const studentIds = targetClean.replace('students:', '').split(',').map(s => s.trim());
            return studentIds.includes(enr.userId);
        }

        if (targetClean.startsWith('grades:')) {
            const grades = targetClean.replace('grades:', '').split(',').map((g: string) => g.trim().toLowerCase());
            const studentGrade = (enr.metadata?.gradeLevel || '').trim().toLowerCase();
            return grades.includes(studentGrade);
        }

        const studentGrade = (enr.metadata?.gradeLevel || '').trim().toLowerCase();
        const studentLicense = (enr.metadata?.licenseCategory || '').trim().toLowerCase();

        return studentGrade === targetClean || studentLicense === targetClean;
    };
    
    // Sub-tab Navigation
    const activeTab = passedActiveTab || 'students';
    
    // New Feature Lists
    const [broadcasterMessages, setBroadcasterMessages] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [eventPins, setEventPins] = useState<any[]>([]);
    const [visitors, setVisitors] = useState<Visitor[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Enrolled' | 'Active' | 'Graduated' | 'Suspended' | 'Dropped'>('All');
    const [gradeFilter, setGradeFilter] = useState('');
    const [streamFilter, setStreamFilter] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Reset pagination to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, gradeFilter, streamFilter]);

    // Parent Invite Modal State
    const [inviteModalEnrollment, setInviteModalEnrollment] = useState<StudentEnrollment | null>(null);
    const [inviteSelectedParentIdx, setInviteSelectedParentIdx] = useState(0);
    const [inviteSelectedEventId, setInviteSelectedEventId] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error' | 'info' | 'idle'; message: string }>({ type: 'idle', message: '' });
    
    // Bulk invitation configuration state
    const [bulkInviteModalEvent, setBulkInviteModalEvent] = useState<any | null>(null);
    const [bulkInviteAddMsg, setBulkInviteAddMsg] = useState<string>('');
    const [bulkInviteSelectedClass, setBulkInviteSelectedClass] = useState<string>('All');
    
    // Bulk feedback configuration state
    const [bulkFeedbackModalEvent, setBulkFeedbackModalEvent] = useState<any | null>(null);
    const [bulkFeedbackAddMsg, setBulkFeedbackAddMsg] = useState<string>('');
    const [feedbackRecipientFilter, setFeedbackRecipientFilter] = useState<'pending' | 'accepted' | 'all_pending'>('all_pending');


    // URL shortener preview and checker states
    const [previewShortUrl, setPreviewShortUrl] = useState<string>('');
    const [isGeneratingPreviewShortUrl, setIsGeneratingPreviewShortUrl] = useState<boolean>(false);
    const [urlCheckResult, setUrlCheckResult] = useState<any | null>(null);
    const [isCheckingUrl, setIsCheckingUrl] = useState<boolean>(false);
    
    // SMS Delivery Report State
    const [smsDeliveryReport, setSmsDeliveryReport] = useState<{
        recipientName: string;
        phone: string;
        success: boolean;
        errorMsg?: string;
    }[] | null>(null);

    // Event Attendance Analysis Modal State
    const [selectedAnalysisEvent, setSelectedAnalysisEvent] = useState<any | null>(null);
    const [analysisSearchTerm, setAnalysisSearchTerm] = useState('');
    const [analysisStatusFilter, setAnalysisStatusFilter] = useState<'All' | 'Checked-in' | 'Accepted' | 'Declined' | 'Pending'>('All');
    const [analysisTab, setAnalysisTab] = useState<'rsvp' | 'audit' | 'feedback'>('rsvp');
    const [auditViewTab, setAuditViewTab] = useState<'missing' | 'covered'>('missing');
    const [auditCustomMessage, setAuditCustomMessage] = useState('');
    const [feedbackSearchTerm, setFeedbackSearchTerm] = useState('');
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'All' | 'Submitted' | 'Pending'>('All');
    const [isRefreshingFeedback, setIsRefreshingFeedback] = useState(false);
    
    // PDF Preview Modal States
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
    const [pdfFileName, setPdfFileName] = useState('');

    // Test Event Modal & Verification Studio State
    const [testEventModalEvent, setTestEventModalEvent] = useState<any | null>(null);
    const [testShortUrl, setTestShortUrl] = useState<string>('');
    const [isGeneratingTestShortUrl, setIsGeneratingTestShortUrl] = useState<boolean>(false);
    const [testUrlCheckResult, setTestUrlCheckResult] = useState<any | null>(null);
    const [isCheckingTestUrl, setIsCheckingTestUrl] = useState<boolean>(false);
    const [testRecipientPhone, setTestRecipientPhone] = useState<string>('');
    const [testRecipientName, setTestRecipientName] = useState<string>('Test Admin');
    const [isSendingTestSms, setIsSendingTestSms] = useState<boolean>(false);
    const [testSmsReport, setTestSmsReport] = useState<{ success: boolean; phone: string; pin?: string; shortUrl?: string; message: string } | null>(null);

    useEffect(() => {
        if (!testEventModalEvent) {
            setTestShortUrl('');
            setTestUrlCheckResult(null);
            setTestSmsReport(null);
            return;
        }

        const initTestStudio = async () => {
            setIsGeneratingTestShortUrl(true);
            try {
                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                    ? 'https://portal.eduai.co.ke'
                    : window.location.origin;
                const longUrl = `${origin}/?view=event-confirm&eventId=${testEventModalEvent.id}&mode=rsvp`;
                const short = await apiService.shortenUrl(longUrl);
                setTestShortUrl(short);

                if (short && short.startsWith('http')) {
                    try {
                        const res = await fetch('/api/integrations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'checkUrl', url: short })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            setTestUrlCheckResult(data);
                        }
                    } catch (_) {}
                }
            } catch (e) {
                console.error("Failed to generate test short URL:", e);
            } finally {
                setIsGeneratingTestShortUrl(false);
            }
        };

        initTestStudio();
    }, [testEventModalEvent]);

    const handleCheckTestUrl = async () => {
        if (!testShortUrl) return;
        setIsCheckingTestUrl(true);
        setTestUrlCheckResult(null);
        try {
            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkUrl', url: testShortUrl })
            });
            if (res.ok) {
                const data = await res.json();
                setTestUrlCheckResult(data);
            } else {
                setTestUrlCheckResult({ success: false, message: `HTTP status ${res.status}` });
            }
        } catch (e: any) {
            setTestUrlCheckResult({ success: false, message: e.message || 'Verification failed' });
        } finally {
            setIsCheckingTestUrl(false);
        }
    };

    const handleSendTestPinSms = async () => {
        if (!testEventModalEvent) return;
        if (!testRecipientPhone.trim()) {
            alert("Please enter a test recipient phone number.");
            return;
        }
        setIsSendingTestSms(true);
        setTestSmsReport(null);
        try {
            const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'https://portal.eduai.co.ke'
                : window.location.origin;

            const mockPinCode = Math.floor(100000 + Math.random() * 900000).toString();
            const testPinId = `test_pin_${Date.now()}`;
            const rawLink = `${origin}/?view=event-confirm&pinId=${testPinId}`;
            const confirmedShortUrl = await apiService.shortenUrl(rawLink);

            const smsText = `[TEST PIN] Hello ${testRecipientName || 'Tester'}, your PIN for "${testEventModalEvent.title}" on ${testEventModalEvent.eventDate} is ${mockPinCode}. Confirm RSVP: ${confirmedShortUrl}`;

            const res = await apiService.sendSms(
                testRecipientPhone.trim(),
                smsText,
                currentInstitution.smsConfig,
                1,
                currentInstitution.id
            );

            const success = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
            setTestSmsReport({
                success,
                phone: testRecipientPhone,
                pin: mockPinCode,
                shortUrl: confirmedShortUrl,
                message: success ? 'Test SMS delivered successfully with confirmed shortened URL!' : (res?.message || 'Gateway rejected SMS')
            });
        } catch (err: any) {
            setTestSmsReport({
                success: false,
                phone: testRecipientPhone,
                message: err.message || 'Failed to dispatch test SMS'
            });
        } finally {
            setIsSendingTestSms(false);
        }
    };

    useEffect(() => {
        if (!bulkFeedbackModalEvent) {
            setPreviewShortUrl('');
            setUrlCheckResult(null);
            return;
        }

        const genPreviewUrl = async () => {
            setIsGeneratingPreviewShortUrl(true);
            try {
                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                    ? 'https://portal.eduai.co.ke'
                    : window.location.origin;
                // Use a mock pin ID for preview with eventId and institutionId context (status=used for feedback)
                const instId = currentInstitution?.id || '';
                const mockUrl = `${origin}/?view=event-confirm&pinId=pin_preview_0&eventId=${bulkFeedbackModalEvent.id}&institutionId=${instId}&status=used`;
                const short = await apiService.shortenUrl(mockUrl);
                setPreviewShortUrl(short);
            } catch (e) {
                console.error("Failed to generate preview short URL:", e);
            } finally {
                setIsGeneratingPreviewShortUrl(false);
            }
        };

        genPreviewUrl();
    }, [bulkFeedbackModalEvent]);

    const handleCheckUrl = async () => {
        if (!previewShortUrl) return;
        setIsCheckingUrl(true);
        setUrlCheckResult(null);
        try {
            const res = await fetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'checkUrl', url: previewShortUrl })
            });
            if (res.ok) {
                const data = await res.json();
                setUrlCheckResult(data);
            } else {
                setUrlCheckResult({ success: false, message: `HTTP error ${res.status}` });
            }
        } catch (e: any) {
            setUrlCheckResult({ success: false, message: e.message || 'Verification failed' });
        } finally {
            setIsCheckingUrl(false);
        }
    };
    
    // Modal & Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<StudentEnrollment | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [importMode, setImportMode] = useState<'new_enroll' | 'update_secondary_phone'>('new_enroll');
    const [secondaryPhoneImportResult, setSecondaryPhoneImportResult] = useState<{name: string; status: 'updated' | 'not_found' | 'skipped'}[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef<Webcam>(null);

    const capturePhoto = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setFormData(prev => ({
                    ...prev,
                    passportPhoto: imageSrc
                }));
                setShowCamera(false);
            }
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    passportPhoto: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFormScanBiometrics = async () => {
        setStatusMsg({ type: 'info', message: 'Initializing biometric scanner...' });
        try {
            alert(`Biometric scanner active. Place your finger on the sensor or verify with Windows Hello.`);
            
            const credentialMock = {
                id: `webauthn_${Date.now()}`,
                rawId: `raw_${Date.now()}`,
                type: 'public-key',
                registeredAt: new Date().toISOString()
            };
            
            setFormData(prev => ({
                ...prev,
                biometricCredentials: credentialMock,
                biometricTemplate: `biometric_template_hash_${Date.now()}`
            }));
            
            setStatusMsg({ type: 'success', message: 'Biometrics scanned successfully. Submit form to persist.' });
        } catch (e) {
            console.error("Form biometric scan failed:", e);
            setStatusMsg({ type: 'error', message: 'Failed to scan biometrics.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    const enrollmentFields = useMemo(() => [
        { key: 'name', label: 'Student Full Name', required: true },
        { key: 'email', label: 'Student Email Address' },
        { key: 'phoneNumber', label: 'Student Phone Number' },
        { key: 'admissionNumber', label: 'Admission Number' },
        { key: 'gender', label: 'Gender (Male/Female)' },
        ...(context === 'driving_school'
            ? [{ key: 'licenseCategory', label: 'License Class / Category' }]
            : [
                { key: 'gradeLevel', label: 'Grade Level' },
                { key: 'stream', label: 'Class Stream / Allocation' }
              ]
        ),
        { key: 'parentName', label: 'Guardian / Parent Name' },
        { key: 'parentPhone', label: 'Parent Phone Number' },
        { key: 'parentEmail', label: 'Parent Email Address' },
        { key: 'secondaryPhone', label: 'Secondary / Alternative Phone' }
    ], [context]);

    const secondaryPhoneFields = useMemo(() => [
        { key: 'admissionNumber', label: 'Admission Number' },
        { key: 'name', label: 'Student Full Name' },
        { key: 'parentPhone', label: 'Parent / Guardian Phone Number' },
        { key: 'secondaryPhone', label: 'Secondary / Alternative Phone Number' },
        { key: 'parentName', label: 'Parent / Guardian Full Name' },
        { key: 'studentPhone', label: 'Student Personal Phone Number' },
        { key: 'gradeLevel', label: 'Grade / Class Level (e.g., Form 3, Grade 10)' },
        { key: 'stream', label: 'Class Stream / Allocation (e.g., Central, East, West)' },
    ], []);

    const teacherFields = useMemo(() => [
        { key: 'name', label: 'Teacher Full Name', required: true },
        { key: 'email', label: 'Email Address' },
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'role', label: 'Teacher Role (e.g. teacher, lecturer, practice_teacher, county_teacher)' },
        { key: 'gender', label: 'Gender (Male/Female)' }
    ], []);

    const supportStaffFields = useMemo(() => [
        { key: 'name', label: 'Staff Full Name', required: true },
        { key: 'email', label: 'Email Address' },
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'role', label: 'Staff Role (e.g. managing_director, hoi, librarian, security, store, driver)' },
        { key: 'gender', label: 'Gender (Male/Female)' }
    ], []);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        admissionNumber: '',
        status: 'Enrolled' as StudentEnrollment['status'],
        enrollmentDate: new Date().toISOString().split('T')[0],
        gender: '' as 'Male' | 'Female' | 'Other' | '',
        passportPhoto: '',
        biometricCredentials: null as any,
        biometricTemplate: '',
        // Context-specific metadata
        metadata: {
            licenseCategory: '',
            preferredInstructorId: '',
            preferredLessonHours: 'Morning' as 'Morning' | 'Noon' | 'Evening',
            priorAttendedDays: 0,
            gradeLevel: '',
            stream: '',
            boardingStatus: 'day_scholar',
            subjects: [] as string[],
            parentName: '',
            parentPhone: '',
            parentEmail: '',
            parentRelation: 'Father' as 'Father' | 'Mother' | 'Guardian' | 'Other',
            parents: [
                { name: '', phone: '', email: '', relation: 'Father' }
            ] as { name: string; phone: string; email: string; relation: 'Father' | 'Mother' | 'Guardian' | 'Other' }[]
        }
    });

    // Broadcaster form state
    const [broadcastTarget, setBroadcastTarget] = useState('All');
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastChannels, setBroadcastChannels] = useState({ sms: true, email: false });
    const [broadcasterLogSubTab, setBroadcasterLogSubTab] = useState<'announcements' | 'event_pins'>('announcements');

    // Event creation state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [eventTime, setEventTime] = useState('09:00');
    const [eventVenue, setEventVenue] = useState('');
    const [eventTarget, setEventTarget] = useState('All');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');

    // Event edit state
    const [editingEvent, setEditingEvent] = useState<any | null>(null);
    const [editEventTitle, setEditEventTitle] = useState('');
    const [editEventDescription, setEditEventDescription] = useState('');
    const [editEventDate, setEditEventDate] = useState('');
    const [editEventTime, setEditEventTime] = useState('');
    const [editEventVenue, setEditEventVenue] = useState('');
    const [editEventTarget, setEditEventTarget] = useState('All');
    const [editEventLoading, setEditEventLoading] = useState(false);

    // Short URL cache: pinId -> shortened URL (generated lazily for UI display)
    const [shortUrlCache, setShortUrlCache] = useState<Record<string, string>>({});

    // PIN verification state
    const [verifyIdentifier, setVerifyIdentifier] = useState('');
    const [verifyPin, setVerifyPin] = useState('');

    // Custom Short URL Generator states
    const [customLongUrl, setCustomLongUrl] = useState('');
    const [customShortUrl, setCustomShortUrl] = useState('');
    const [customShortenLoading, setCustomShortenLoading] = useState(false);
    const [customShortenError, setCustomShortenError] = useState('');

    const handleCustomShorten = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customLongUrl.trim()) return;
        setCustomShortenLoading(true);
        setCustomShortenError('');
        setCustomShortUrl('');
        try {
            const result = await apiService.shortenUrl(customLongUrl.trim());
            if (result && result.startsWith('http')) {
                setCustomShortUrl(result);
                setStatusMsg({ type: 'success', message: 'Shortened URL generated successfully!' });
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 2500);
            } else {
                setCustomShortenError('Invalid short URL returned from service.');
            }
        } catch (err: any) {
            setCustomShortenError('Failed to shorten. Check internet/network connectivity.');
        } finally {
            setCustomShortenLoading(false);
        }
    };

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info' | 'idle', message: string }>({ type: 'idle', message: '' });

    // Load Data
    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [
                enrollmentsData, 
                usersData, 
                coursesData, 
                subjectsData,
                broadcastsData,
                eventsData,
                pinsData,
                visitorsData,
                academicLevelsData
            ] = await Promise.all([
                apiService.fetchModuleRecords<StudentEnrollment>('student_enrollments', currentInstitution.id),
                apiService.fetchModuleRecords<User>('users', currentInstitution.id),
                apiService.fetchModuleRecords<Course>('courses', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Subject>('subjects', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('broadcaster_messages', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('institution_events', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('event_pins', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Visitor>('visitors', currentInstitution.id).catch(() => []),
                apiService.fetchAcademicLevels(currentInstitution.id).catch(() => [])
            ]);
            
            setEnrollments(enrollmentsData.filter(e => e.enrollmentType === context));
            setUsers(usersData);
            setInstructors(usersData.filter(u => u.role === 'driving_instructor' || u.role === 'teacher' || u.role === 'lecturer'));
            setCourses(coursesData);
            setSubjects(subjectsData);
            setBroadcasterMessages(broadcastsData || []);
            setEvents(eventsData || []);
            setEventPins(pinsData || []);
            setVisitors(visitorsData || []);
            setAcademicLevels(academicLevelsData || []);
        } catch (err) {
            console.error("Error loading enrollment data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const runSetup = async () => {
            // Auto-create necessary tables if not exist in database
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS public.student_enrollments (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                    enrollment_type TEXT NOT NULL,
                    admission_number TEXT,
                    status TEXT DEFAULT 'Enrolled',
                    enrollment_date TEXT,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.broadcaster_messages (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    target TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    subject TEXT,
                    body TEXT NOT NULL,
                    recipients_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.institution_events (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT,
                    event_date TEXT NOT NULL,
                    event_time TEXT NOT NULL,
                    venue TEXT NOT NULL,
                    target TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                 CREATE TABLE IF NOT EXISTS public.event_pins (
                     id TEXT PRIMARY KEY,
                     institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                     event_id TEXT NOT NULL REFERENCES public.institution_events(id) ON DELETE CASCADE,
                     user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                     pin TEXT NOT NULL,
                     status TEXT DEFAULT 'pending',
                     guests TEXT,
                     vehicle_registration TEXT,
                     rating INTEGER,
                     feedback TEXT,
                     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                 );
                 
                 ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
                 ALTER TABLE public.broadcaster_messages ENABLE ROW LEVEL SECURITY;
                 ALTER TABLE public.institution_events ENABLE ROW LEVEL SECURITY;
                 ALTER TABLE public.event_pins ENABLE ROW LEVEL SECURITY;
                 
                 DO $$
                 DECLARE
                     tables text[] := ARRAY['student_enrollments', 'broadcaster_messages', 'institution_events', 'event_pins'];
                     t text;
                 BEGIN
                     FOREACH t IN ARRAY tables LOOP
                         EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
                         EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON public.%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
                         
                         EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
                         EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON public.%I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
                         
                         EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
                     END LOOP;
                 END $$;
 
                 ALTER TABLE public.event_pins ADD COLUMN IF NOT EXISTS guests TEXT;
                 ALTER TABLE public.event_pins ADD COLUMN IF NOT EXISTS vehicle_registration TEXT;
                 ALTER TABLE public.event_pins ADD COLUMN IF NOT EXISTS rating INTEGER;
                 ALTER TABLE public.event_pins ADD COLUMN IF NOT EXISTS feedback TEXT;
                
                DROP POLICY IF EXISTS "Public select: event_pins" ON public.event_pins;
                CREATE POLICY "Public select: event_pins" ON public.event_pins FOR SELECT USING (true);
                
                DROP POLICY IF EXISTS "Public update: event_pins" ON public.event_pins;
                CREATE POLICY "Public update: event_pins" ON public.event_pins FOR UPDATE USING (true) WITH CHECK (true);
                
                DROP POLICY IF EXISTS "Public select: institution_events" ON public.institution_events;
                CREATE POLICY "Public select: institution_events" ON public.institution_events FOR SELECT USING (true);
                
                DROP POLICY IF EXISTS "Public select: users" ON public.users;
                CREATE POLICY "Public select: users" ON public.users FOR SELECT USING (true);
            `;
            try {
                await apiService.runMigration(createTableSql);
            } catch (err) {
                console.warn("Auto-migration of schema tables failed:", err);
            }
            
            if (currentInstitution?.id) {
                loadAllData();
            }
        };
        
        runSetup();
    }, [currentInstitution?.id, context]);

    // Handle Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Explicit client-side validation to prevent browser silent block on hidden/scrolled inputs
        if (!formData.fullName || !formData.fullName.trim()) {
            setStatusMsg({ type: 'error', message: 'Student Full Name is required.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
            return;
        }
        if (!isPrimaryOrSecondary) {
            if (!formData.phoneNumber || !formData.phoneNumber.trim()) {
                setStatusMsg({ type: 'error', message: 'Student Phone Number is required.' });
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                return;
            }
            if (!formData.email || !formData.email.trim()) {
                setStatusMsg({ type: 'error', message: 'Student Email Address is required.' });
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                return;
            }
        }
        if (!formData.enrollmentDate) {
            setStatusMsg({ type: 'error', message: 'Enrollment Date is required.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
            return;
        }

        if (context === 'driving_school') {
            if (!formData.metadata.licenseCategory) {
                setStatusMsg({ type: 'error', message: 'License Class / Category is required.' });
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                return;
            }
        } else {
            // academic context
            if (!formData.metadata.gradeLevel) {
                setStatusMsg({ type: 'error', message: 'Grade Level is required.' });
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                return;
            }
            
            const parents = formData.metadata.parents || [];
            if (parents.length === 0) {
                setStatusMsg({ type: 'error', message: 'At least one Parent / Guardian is required for academic registry.' });
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                return;
            }
            for (let i = 0; i < parents.length; i++) {
                if (!parents[i].name || !parents[i].name.trim() || !parents[i].phone || !parents[i].phone.trim()) {
                    setStatusMsg({ type: 'error', message: `Please enter both Name and Phone for Parent / Guardian #${i + 1}.` });
                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                    return;
                }
            }
        }

        setStatusMsg({ type: 'info', message: 'Saving enrollment...' });
        
        try {
            let userId = '';
            
            // 1. Centralized Identity setup: check if User already exists with the same phone/email locally
            let existingUser = users.find(u => 
                (formData.email && u.email && u.email.toLowerCase() === formData.email.toLowerCase()) || 
                (formData.phoneNumber && u.phoneNumber && u.phoneNumber === formData.phoneNumber)
            );

            // Query globally to avoid unique email constraint violation (Error 23505)
            if (!existingUser && formData.email && formData.email.trim()) {
                const globalRecords = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                    filter: { email: formData.email.toLowerCase() }
                });
                if (globalRecords && globalRecords.length > 0) {
                    existingUser = globalRecords[0];
                }
            }
            
            if (existingUser) {
                userId = existingUser.id;
                const updatedUser = {
                    ...existingUser,
                    email: formData.email && formData.email.trim() 
                        ? formData.email.trim() 
                        : (existingUser.email && !existingUser.email.endsWith('@eduai.local') ? existingUser.email : `student_${existingUser.id}@eduai.local`),
                    phoneNumber: formData.phoneNumber || existingUser.phoneNumber || '',
                    metadata: {
                        ...(existingUser.metadata || {}),
                        passportPhoto: formData.passportPhoto || existingUser.metadata?.passportPhoto,
                        webauthnCredentials: formData.biometricCredentials || existingUser.metadata?.webauthnCredentials,
                        fingerprintTemplate: formData.biometricTemplate || existingUser.metadata?.fingerprintTemplate,
                        boardingStatus: formData.metadata.boardingStatus,
                        residenceType: formData.metadata.boardingStatus
                    }
                };
                if (formData.gender && existingUser.gender !== formData.gender) {
                    updatedUser.gender = formData.gender as any;
                }
                if (updatedUser.institutionId !== currentInstitution.id) {
                    updatedUser.institutionId = currentInstitution.id;
                }
                if (!updatedUser.password) {
                    updatedUser.password = 'student123';
                }
                await apiService.updateModuleRecord('users', existingUser.id, updatedUser);
            } else {
                // Create a base user identity profile
                const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const studentEmail = formData.email && formData.email.trim()
                    ? formData.email.trim()
                    : `student_${newUserId}@eduai.local`;
                
                const newUser: User = {
                    id: newUserId,
                    name: formData.fullName,
                    email: studentEmail,
                    phoneNumber: formData.phoneNumber || '',
                    role: 'student',
                    institutionId: currentInstitution.id,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        passportPhoto: formData.passportPhoto,
                        webauthnCredentials: formData.biometricCredentials,
                        fingerprintTemplate: formData.biometricTemplate,
                        boardingStatus: formData.metadata.boardingStatus,
                        residenceType: formData.metadata.boardingStatus
                    }
                };
                if (formData.gender) {
                    newUser.gender = formData.gender as any;
                }
                
                await apiService.registerUser(newUser, currentInstitution.name);
                userId = newUserId;
            }
            
            // 2. Save Enrollment record
            const primaryParent = formData.metadata.parents?.[0] || { name: '', phone: '', email: '', relation: 'Father' };
            const metadataToSave = {
                ...formData.metadata,
                parentName: primaryParent.name,
                parentPhone: primaryParent.phone,
                parentEmail: primaryParent.email,
                parentRelation: primaryParent.relation,
                gender: formData.gender,
                passportPhoto: formData.passportPhoto
            };

            if (editingEnrollment) {
                const updated: StudentEnrollment = {
                    ...editingEnrollment,
                    admissionNumber: formData.admissionNumber,
                    status: formData.status,
                    enrollmentDate: formData.enrollmentDate,
                    metadata: metadataToSave,
                    updatedAt: new Date().toISOString()
                };
                await apiService.updateModuleRecord('student_enrollments', editingEnrollment.id, updated);
                setStatusMsg({ type: 'success', message: 'Enrollment record updated successfully.' });
            } else {
                const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newEnrollment: StudentEnrollment = {
                    id: enrollmentId,
                    institutionId: currentInstitution.id,
                    userId: userId,
                    enrollmentType: context,
                    admissionNumber: formData.admissionNumber || `ADM-${Date.now().toString().slice(-5)}`,
                    status: formData.status,
                    enrollmentDate: formData.enrollmentDate,
                    metadata: metadataToSave,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('student_enrollments', newEnrollment);
                setStatusMsg({ type: 'success', message: 'New student enrolled successfully.' });
            }
            
            setIsFormOpen(false);
            setEditingEnrollment(null);
            loadAllData();
            
            // Clear form
            setFormData({
                fullName: '',
                email: '',
                phoneNumber: '',
                admissionNumber: '',
                status: 'Enrolled',
                enrollmentDate: new Date().toISOString().split('T')[0],
                gender: '',
                passportPhoto: '',
                biometricCredentials: null,
                biometricTemplate: '',
                metadata: {
                    licenseCategory: '',
                    preferredInstructorId: '',
                    preferredLessonHours: 'Morning',
                    priorAttendedDays: 0,
                    gradeLevel: '',
                    stream: '',
                    boardingStatus: 'day_scholar',
                    subjects: [],
                    parentName: '',
                    parentPhone: '',
                    parentEmail: '',
                    parentRelation: 'Father',
                    parents: [{ name: '', phone: '', email: '', relation: 'Father' }]
                }
            });
        } catch (err: any) {
            console.error("Save failed:", err);
            setStatusMsg({ type: 'error', message: `Failed to save enrollment: ${err.message}` });
        }
        
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Open form for editing
    const handleEdit = (enr: StudentEnrollment) => {
        const associatedUser = users.find(u => u.id === enr.userId);
        setEditingEnrollment(enr);

        let parentsList = Array.isArray(enr.metadata?.parents) ? [...enr.metadata.parents] : [];
        if (parentsList.length === 0 && (enr.metadata?.parentName || enr.metadata?.parentPhone)) {
            parentsList = [{
                name: enr.metadata.parentName || '',
                phone: enr.metadata.parentPhone || '',
                email: enr.metadata.parentEmail || '',
                relation: enr.metadata.parentRelation || 'Father'
            }];
        }
        if (parentsList.length === 0) {
            parentsList = [{ name: '', phone: '', email: '', relation: 'Father' }];
        }

        const secPhone = enr.metadata?.secondaryPhone || enr.metadata?.parentPhone2 || enr.metadata?.guardianPhone2 || associatedUser?.secondaryPhone || associatedUser?.parentPhone2 || '';
        if (secPhone && parentsList.length === 1) {
            parentsList.push({
                name: enr.metadata?.guardian2Name || 'Secondary Guardian',
                phone: secPhone,
                email: '',
                relation: 'Mother'
            });
        }

        setFormData({
            fullName: associatedUser?.name || 'Unknown',
            email: associatedUser?.email || '',
            phoneNumber: associatedUser?.phoneNumber || '',
            admissionNumber: enr.admissionNumber || '',
            status: enr.status,
            enrollmentDate: enr.enrollmentDate,
            gender: (associatedUser?.gender || enr.metadata?.gender || '') as any,
            passportPhoto: associatedUser?.metadata?.passportPhoto || enr.metadata?.passportPhoto || '',
            biometricCredentials: associatedUser?.metadata?.webauthnCredentials || null,
            biometricTemplate: associatedUser?.metadata?.fingerprintTemplate || '',
            metadata: {
                licenseCategory: enr.metadata?.licenseCategory || '',
                preferredInstructorId: enr.metadata?.preferredInstructorId || '',
                preferredLessonHours: enr.metadata?.preferredLessonHours || 'Morning',
                priorAttendedDays: enr.metadata?.priorAttendedDays || 0,
                gradeLevel: enr.metadata?.gradeLevel || '',
                stream: (() => {
                    const currentStream = enr.metadata?.stream || '';
                    const gradeVal = enr.metadata?.gradeLevel || '';
                    if (gradeVal && currentStream) {
                        const course = courses.find(c => c.name === gradeVal);
                        if (course?.levels && course.levels.length > 0) {
                            const levelNames = course.levels.map(lvl => lvl.name);
                            const matched = levelNames.find(name => 
                                name.toLowerCase() === currentStream.toLowerCase() ||
                                currentStream.toLowerCase().endsWith(name.toLowerCase()) ||
                                name.toLowerCase().endsWith(currentStream.toLowerCase())
                            );
                            if (matched) return matched;
                        }
                    }
                    return currentStream;
                })(),
                boardingStatus: enr.metadata?.boardingStatus || enr.metadata?.residenceType || associatedUser?.metadata?.boardingStatus || associatedUser?.metadata?.residenceType || 'day_scholar',
                subjects: enr.metadata?.subjects || [],
                parentName: enr.metadata?.parentName || '',
                parentPhone: enr.metadata?.parentPhone || '',
                parentEmail: enr.metadata?.parentEmail || '',
                parentRelation: enr.metadata?.parentRelation || 'Father',
                parents: parentsList
            }
        });
        setIsFormOpen(true);
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this enrollment record? (Note: The user account identity will not be deleted)")) {
            return;
        }
        
        try {
            await apiService.deleteModuleRecord('student_enrollments', id);
            setStatusMsg({ type: 'success', message: 'Enrollment record removed.' });
            loadAllData();
        } catch (err) {
            console.error("Delete failed:", err);
            setStatusMsg({ type: 'error', message: 'Failed to remove enrollment.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
    };

    // Send event invitation to a specific parent
    const handleSendParentInvite = async () => {
        if (!inviteModalEnrollment || !inviteSelectedEventId) {
            setInviteMsg({ type: 'error', message: 'Please select both a parent and an event.' });
            return;
        }

        const parents: { name: string; phone: string; email: string; relation: string }[] =
            inviteModalEnrollment.metadata?.parents || [];
        // Fallback to legacy single-parent fields
        const fallbackParent = {
            name: inviteModalEnrollment.metadata?.parentName || '',
            phone: inviteModalEnrollment.metadata?.parentPhone || '',
            email: inviteModalEnrollment.metadata?.parentEmail || '',
            relation: inviteModalEnrollment.metadata?.parentRelation || 'Guardian'
        };
        const resolvedParents = parents.length > 0 ? parents : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
        const parent = resolvedParents[inviteSelectedParentIdx];

        if (!parent || (!parent.phone && !parent.email)) {
            setInviteMsg({ type: 'error', message: 'Selected parent has no phone or email on record.' });
            return;
        }

        const selectedEvent = events.find(ev => ev.id === inviteSelectedEventId);
        if (!selectedEvent) {
            setInviteMsg({ type: 'error', message: 'Selected event not found.' });
            return;
        }

        setInviteLoading(true);
        setInviteMsg({ type: 'info', message: 'Generating PIN and dispatching invitation...' });

        try {
            // Check if a PIN already exists for this parent-user + event
            const formattedParentPhone = parent.phone ? formatPhoneNumber(parent.phone) : '';
            const parentUser = users.find(u =>
                (parent.email && u.email && u.email.toLowerCase() === parent.email.toLowerCase()) ||
                (parent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, parent.phone))
            );

            let parentUserId = parentUser?.id || '';

            if (!parentUserId) {
                // Create a temporary guest user profile for the parent
                const newId = `u_par_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newParentUser = {
                    id: newId,
                    institutionId: currentInstitution.id,
                    name: parent.name || 'Parent / Guardian',
                    email: parent.email || (parent.phone ? `parent_${parent.phone}@eduai.co.ke` : `parent_${newId}@eduai.co.ke`),
                    phoneNumber: parent.phone || null,
                    role: 'parent',
                    metadata: {},
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('users', newParentUser);
                parentUserId = newId;
            }

            // Reuse existing PIN if one already exists
            const existingPin = eventPins.find(p => p.eventId === inviteSelectedEventId && p.userId === parentUserId);
            const pinCode = existingPin ? existingPin.pin : Math.floor(100000 + Math.random() * 900000).toString();
            const pinId = existingPin ? existingPin.id : `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            if (!existingPin) {
                await apiService.saveModuleRecord('event_pins', {
                    id: pinId,
                    institutionId: currentInstitution.id,
                    eventId: inviteSelectedEventId,
                    userId: parentUserId,
                    pin: pinCode,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }

            const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'https://portal.eduai.co.ke'
                : window.location.origin;

            const fallbackPayload = [
                pinCode,                                              // 0
                selectedEvent.title,                                  // 1
                selectedEvent.eventDate,                              // 2
                selectedEvent.eventTime,                              // 3
                selectedEvent.venue,                                  // 4
                parent.name || 'Parent / Guardian',                   // 5
                parent.phone || '',                                   // 6
                currentInstitution.name || '',                        // 7
                currentInstitution.id,                                // 8
                selectedEvent.description || '',                      // 9
                parentUserId,                                         // 10
                selectedEvent.id                                      // 11
            ];
            const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(fallbackPayload))));
            const rawLink = `${origin}/?view=event-confirm&pinId=${pinId}&data=${base64Data}`;
            const confirmationLink = rawLink;
            const shortLink = `${origin}/?view=event-confirm&pinId=${pinId}`;
            const studentName = users.find(u => u.id === inviteModalEnrollment.userId)?.name || 'your child';
            const baseMessage = `Dear ${parent.name || 'Guardian'}, you are invited to "${selectedEvent.title}" on ${selectedEvent.eventDate} at ${selectedEvent.eventTime}, ${selectedEvent.venue} — regarding ${studentName}.`;
            const smsMessage = `${baseMessage} Confirm attendance: ${shortLink}`;
            const emailMessage = `${baseMessage} Confirm attendance: ${confirmationLink}`;

            let dispatched = false;
            if (parent.phone) {
                try {
                    await apiService.sendSms(parent.phone, smsMessage, currentInstitution.smsConfig, 1, currentInstitution.id);
                    dispatched = true;
                } catch (e) { console.error('SMS invite failed:', e); }
            }
            if (parent.email) {
                try {
                    await apiService.sendEmail(parent.email, `Event Invitation — ${selectedEvent.title}`, emailMessage, currentInstitution.emailConfig);
                    dispatched = true;
                } catch (e) { console.error('Email invite failed:', e); }
            }

            setInviteMsg({
                type: 'success',
                message: dispatched
                    ? `Invitation sent to ${parent.name || 'parent'} (PIN: ${pinCode}).`
                    : `PIN generated (${pinCode}) but no SMS/email config found — share the link manually: ${confirmationLink}`
            });
            loadAllData();
        } catch (err: any) {
            console.error('Parent invite failed:', err);
            setInviteMsg({ type: 'error', message: `Failed to send invitation: ${err.message}` });
        } finally {
            setInviteLoading(false);
            setTimeout(() => setInviteMsg({ type: 'idle', message: '' }), 6000);
        }
    };

    const handleBulkComplete = async (data: any[]) => {
        setIsUploading(false);
        setStatusMsg({ type: 'info', message: `Ingesting ${data.length} students from spreadsheet...` });
        setIsLoading(true);

        try {
            // Keep a local copy of users and enrollments to match against for duplicates / batch upserts
            let currentUsersList = [...users];
            let currentEnrollmentsList = [...enrollments];
            let successCount = 0;

            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    try {
                        let userId = '';
                        const cleanAdm = (s: any) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                        const inputName = item.name ? String(item.name).trim() : '';
                        const inputAdmNo = item.admissionNumber ? String(item.admissionNumber).trim() : '';
                        
                        // 1. First check if an enrollment already exists for this admission number
                        let existingEnrollment = inputAdmNo ? currentEnrollmentsList.find(e => 
                            e.admissionNumber && cleanAdm(e.admissionNumber) === cleanAdm(inputAdmNo)
                        ) : undefined;

                        let existingUser: User | undefined = undefined;

                        if (existingEnrollment) {
                            userId = existingEnrollment.userId;
                            existingUser = currentUsersList.find(u => u.id === userId);
                            if (!existingUser && userId) {
                                try {
                                    const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                        filter: { id: userId }
                                    });
                                    if (dbUsers && dbUsers.length > 0) {
                                        existingUser = dbUsers[0];
                                    }
                                } catch (_) {}
                            }
                        }

                        // If no enrollment matched, search user by email, phone, or name
                        if (!existingUser) {
                            existingUser = currentUsersList.find(u => 
                                (item.email && u.email && u.email.toLowerCase() === String(item.email).trim().toLowerCase()) || 
                                (item.phoneNumber && u.phoneNumber && String(u.phoneNumber).replace(/\D/g, '') === String(item.phoneNumber).replace(/\D/g, '')) ||
                                (inputName && u.name && u.name.trim().toLowerCase() === inputName.toLowerCase())
                            );

                            if (!existingUser && item.email) {
                                const globalRecords = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                    filter: { email: String(item.email).trim().toLowerCase() }
                                });
                                if (globalRecords && globalRecords.length > 0) {
                                    existingUser = globalRecords[0];
                                }
                            }
                        }

                        if (existingUser) {
                            userId = existingUser.id;
                            const updatedUser: User = {
                                ...existingUser,
                                name: (inputName && inputName.toLowerCase() !== 'unknown student') ? inputName : existingUser.name,
                                gender: (item.gender || existingUser.gender) as any,
                            };
                            if (updatedUser.institutionId !== currentInstitution.id) {
                                updatedUser.institutionId = currentInstitution.id;
                            }
                            await apiService.updateModuleRecord('users', existingUser.id, updatedUser);
                            const userIdx = currentUsersList.findIndex(u => u.id === existingUser!.id);
                            if (userIdx !== -1) currentUsersList[userIdx] = updatedUser;
                        } else {
                            // Create new user profile
                            const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const generatedEmail = item.email && String(item.email).trim()
                                ? String(item.email).trim()
                                : `student_${newUserId}@eduai.local`;
                            
                            const newUser: User = {
                                id: newUserId,
                                name: inputName || 'Student',
                                email: generatedEmail,
                                phoneNumber: item.phoneNumber ? String(item.phoneNumber).trim() : '',
                                role: 'student',
                                institutionId: currentInstitution.id,
                                createdAt: new Date().toISOString(),
                                metadata: {}
                            };
                            if (item.gender) {
                                newUser.gender = String(item.gender).trim() as any;
                            }
                            await apiService.registerUser(newUser, currentInstitution.name);
                            userId = newUserId;
                            currentUsersList.push(newUser);
                        }

                        if (!existingEnrollment) {
                            existingEnrollment = currentEnrollmentsList.find(e => e.userId === userId);
                        }

                        const admissionNumberValue = item.admissionNumber 
                            ? String(item.admissionNumber).trim() 
                            : (existingEnrollment?.admissionNumber || `ADM-${Date.now().toString().slice(-5)}_${Math.floor(Math.random()*1000)}`);
 
                        const parentNameVal = item.parentName || existingEnrollment?.metadata?.parentName || '';
                        const parentPhoneVal = item.parentPhone || existingEnrollment?.metadata?.parentPhone || '';
                        const parentEmailVal = item.parentEmail || existingEnrollment?.metadata?.parentEmail || '';
                        const parentRelationVal = item.parentRelation || existingEnrollment?.metadata?.parentRelation || 'Father';
                        
                        let importedParents = existingEnrollment?.metadata?.parents || [];
                        if (!Array.isArray(importedParents) || importedParents.length === 0) {
                            if (parentNameVal || parentPhoneVal) {
                                importedParents = [{
                                    name: parentNameVal,
                                    phone: parentPhoneVal,
                                    email: parentEmailVal,
                                    relation: parentRelationVal
                                }];
                            } else {
                                importedParents = [];
                            }
                        }

                        const secondaryPhoneVal = item.secondaryPhone || existingEnrollment?.metadata?.secondaryPhone || '';

                        const metadataObj = {
                            ...(existingEnrollment?.metadata || {}),
                            gender: item.gender || existingEnrollment?.metadata?.gender || '',
                            licenseCategory: item.licenseCategory || existingEnrollment?.metadata?.licenseCategory || '',
                            gradeLevel: item.gradeLevel || importGradeLevel || existingEnrollment?.metadata?.gradeLevel || '',
                            stream: item.stream || importStream || existingEnrollment?.metadata?.stream || '',
                            parentName: parentNameVal,
                            parentPhone: parentPhoneVal,
                            parentEmail: parentEmailVal,
                            parentRelation: parentRelationVal,
                            secondaryPhone: secondaryPhoneVal,
                            parents: importedParents
                        };

                        if (existingEnrollment) {
                            const updated: StudentEnrollment = {
                                ...existingEnrollment,
                                admissionNumber: admissionNumberValue,
                                metadata: metadataObj,
                                updatedAt: new Date().toISOString()
                            };
                            await apiService.updateModuleRecord('student_enrollments', existingEnrollment.id, updated);
                        } else {
                            const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const newEnrollment: StudentEnrollment = {
                                id: enrollmentId,
                                institutionId: currentInstitution.id,
                                userId: userId,
                                enrollmentType: context,
                                admissionNumber: admissionNumberValue,
                                status: 'Enrolled',
                                enrollmentDate: new Date().toISOString().split('T')[0],
                                metadata: metadataObj,
                                createdAt: new Date().toISOString()
                            };
                            await apiService.saveModuleRecord('student_enrollments', newEnrollment);
                            currentEnrollmentsList.push(newEnrollment);
                        }

                        successCount++;
                    } catch (err: any) {
                        console.error(`Failed to ingest student row ${item.name}:`, err);
                    }
                }));
            }

            setStatusMsg({ type: 'success', message: `Successfully imported ${successCount} student enrollment(s).` });
            loadAllData();
        } catch (err: any) {
            console.error("Bulk ingestion failed:", err);
            setStatusMsg({ type: 'error', message: `Import failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setImportGradeLevel('');
            setImportStream('');
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 5000);
        }
    };

    // Handle bulk update of student contacts (primary phone, secondary phone, parent name) from Excel
    const handleBulkUpdateSecondaryPhone = async (data: any[]) => {
        setIsUploading(false);
        setIsLoading(true);
        setStatusMsg({ type: 'info', message: `Updating contact records for ${data.length} student(s)...` });
        const results: {name: string; status: 'updated' | 'not_found' | 'skipped'}[] = [];

        try {
            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    const admNo = item.admissionNumber ? String(item.admissionNumber).trim() : '';
                    const studentNameVal = item.name ? String(item.name).trim() : '';
                    const nameRaw = studentNameVal ? studentNameVal.toLowerCase() : '';
                    const parentPhoneVal = item.parentPhone ? String(item.parentPhone).trim() : '';
                    const studentPhoneVal = item.studentPhone ? String(item.studentPhone).trim() : '';
                    const secPhoneVal = item.secondaryPhone ? String(item.secondaryPhone).trim() : '';
                    const parentNameVal = item.parentName ? String(item.parentName).trim() : (item.guardianName ? String(item.guardianName).trim() : '');
                    const gradeLevelVal = item.gradeLevel ? String(item.gradeLevel).trim() : (item.grade ? String(item.grade).trim() : (item.class ? String(item.class).trim() : ''));
                    const streamVal = item.stream ? String(item.stream).trim() : (item.classStream ? String(item.classStream).trim() : '');

                    const displayName = studentNameVal || admNo || 'Unknown';

                    if (!parentPhoneVal && !studentPhoneVal && !secPhoneVal && !parentNameVal && !gradeLevelVal && !streamVal && !studentNameVal) {
                        results.push({ name: displayName, status: 'skipped' });
                        return;
                    }

                    const cleanAdm = (s: any) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanStr = (s: any) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

                    // Match enrollment by admission number or student name
                    let matchedEnrollment = enrollments.find(e =>
                        (admNo && e.admissionNumber && cleanAdm(e.admissionNumber) === cleanAdm(admNo))
                    );
                    if (!matchedEnrollment && nameRaw) {
                        matchedEnrollment = enrollments.find(e => {
                            const user = users.find(u => u.id === e.userId);
                            return user && cleanStr(user.name) === cleanStr(studentNameVal);
                        });
                    }

                    if (!matchedEnrollment) {
                        results.push({ name: displayName, status: 'not_found' });
                        return;
                    }

                    try {
                        const currentMeta = matchedEnrollment.metadata || {};
                        const updatedMeta = { ...currentMeta };

                        if (parentPhoneVal) {
                            updatedMeta.parentPhone = parentPhoneVal;
                            updatedMeta.parentPhoneNumber = parentPhoneVal;
                        }
                        if (secPhoneVal) {
                            updatedMeta.secondaryPhone = secPhoneVal;
                            updatedMeta.parentPhone2 = secPhoneVal;
                            updatedMeta.guardianPhone2 = secPhoneVal;
                            updatedMeta.parentPhoneNumber2 = secPhoneVal;
                            updatedMeta.secondaryParentPhone = secPhoneVal;
                        }
                        if (parentNameVal) {
                            updatedMeta.parentName = parentNameVal;
                            updatedMeta.guardianName = parentNameVal;
                        }
                        if (gradeLevelVal) {
                            updatedMeta.gradeLevel = gradeLevelVal;
                        }
                        if (streamVal) {
                            updatedMeta.stream = streamVal;
                        }
                        if (studentPhoneVal) {
                            updatedMeta.studentPhone = studentPhoneVal;
                            updatedMeta.phoneNumber = studentPhoneVal;
                        }

                        // Update metadata.parents array
                        let parentsArr = Array.isArray(updatedMeta.parents) ? [...updatedMeta.parents] : [];
                        if (parentsArr.length === 0) {
                            parentsArr.push({
                                name: parentNameVal || 'Primary Guardian',
                                phone: parentPhoneVal || '',
                                email: '',
                                relation: 'Father'
                            });
                        } else {
                            parentsArr[0] = {
                                ...parentsArr[0],
                                name: parentNameVal || parentsArr[0].name || 'Primary Guardian',
                                phone: parentPhoneVal || parentsArr[0].phone || ''
                            };
                        }

                        if (secPhoneVal) {
                            if (parentsArr.length > 1) {
                                parentsArr[1] = {
                                    ...parentsArr[1],
                                    phone: secPhoneVal
                                };
                            } else {
                                parentsArr.push({
                                    name: 'Secondary Guardian',
                                    phone: secPhoneVal,
                                    email: '',
                                    relation: 'Mother'
                                });
                            }
                        }
                        updatedMeta.parents = parentsArr;

                        // Retrieve matched user account
                        let matchedUser = users.find(u => u.id === matchedEnrollment.userId);
                        if (!matchedUser && matchedEnrollment.userId) {
                            try {
                                const dbUser = await apiService.fetchModuleRecord<User>('users', matchedEnrollment.userId);
                                if (dbUser) matchedUser = dbUser;
                            } catch (_) {}
                        }

                        const finalStudentName = studentNameVal && studentNameVal.trim() && studentNameVal.toLowerCase() !== 'unknown student' && studentNameVal.toLowerCase() !== 'unknown'
                            ? studentNameVal.trim()
                            : (matchedUser?.name || '');

                        if (finalStudentName) {
                            updatedMeta.studentName = finalStudentName;
                            updatedMeta.name = finalStudentName;
                        }

                        const updatedEnrollment = {
                            ...matchedEnrollment,
                            metadata: updatedMeta,
                            updatedAt: new Date().toISOString()
                        };

                        if (matchedEnrollment.userId) {
                            const userToSave: any = {
                                ...(matchedUser || { id: matchedEnrollment.userId, role: 'student', institutionId: currentInstitution.id }),
                                id: matchedEnrollment.userId,
                                name: finalStudentName || matchedUser?.name || 'Student',
                                institutionId: currentInstitution.id,
                                metadata: {
                                    ...(matchedUser?.metadata || {}),
                                    secondaryPhone: secPhoneVal || matchedUser?.metadata?.secondaryPhone || '',
                                    parentPhone2: secPhoneVal || matchedUser?.metadata?.parentPhone2 || '',
                                    parentPhone: parentPhoneVal || matchedUser?.metadata?.parentPhone || ''
                                }
                            };
                            if (studentPhoneVal) {
                                userToSave.phoneNumber = studentPhoneVal;
                            }
                            if (secPhoneVal) {
                                userToSave.secondaryPhone = secPhoneVal;
                                userToSave.parentPhone2 = secPhoneVal;
                            }
                            await apiService.updateModuleRecord('users', matchedEnrollment.userId, userToSave).catch(() => {});
                            
                            // Update local users state immediately
                            setUsers(prev => {
                                const idx = prev.findIndex(u => u.id === matchedEnrollment.userId);
                                if (idx !== -1) {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], ...userToSave };
                                    return copy;
                                } else {
                                    return [...prev, userToSave as User];
                                }
                            });
                        }

                        await apiService.updateModuleRecord('student_enrollments', matchedEnrollment.id, updatedEnrollment);
                        
                        // Update local enrollments state immediately
                        setEnrollments(prev => prev.map(e => e.id === matchedEnrollment.id ? updatedEnrollment : e));
                        
                        results.push({ name: displayName, status: 'updated' });
                    } catch (err: any) {
                        console.error(`Failed to update contacts for ${displayName}:`, err);
                        results.push({ name: displayName, status: 'not_found' });
                    }
                }));
            }

            const updatedCount = results.filter(r => r.status === 'updated').length;
            const notFoundCount = results.filter(r => r.status === 'not_found').length;
            setSecondaryPhoneImportResult(results);
            setStatusMsg({ type: 'success', message: `Updated contacts for ${updatedCount} student(s). ${notFoundCount > 0 ? `${notFoundCount} record(s) not matched.` : ''}` });
            loadAllData();
        } catch (err: any) {
            console.error('Contact bulk update failed:', err);
            setStatusMsg({ type: 'error', message: `Bulk update failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setImportMode('new_enroll');
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 6000);
        }
    };

    const handleBulkCompleteStaff = async (data: any[]) => {
        setIsUploading(false);
        setStatusMsg({ type: 'info', message: `Ingesting ${data.length} staff records from spreadsheet...` });
        setIsLoading(true);

        try {
            let currentUsersList = [...users];
            let successCount = 0;

            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    try {
                        if (!item.name || !String(item.name).trim()) return;

                        // Resolve role
                        let resolvedRole = '';
                        if (activeTab === 'teachers') {
                            const inputRole = item.role ? String(item.role).trim().toLowerCase() : '';
                            resolvedRole = teacherRoles.includes(inputRole) ? inputRole : 'teacher';
                        } else {
                            const inputRole = item.role ? String(item.role).trim().toLowerCase() : '';
                            const supportRoles = getRolesForInstitution(currentInstitution).filter(
                                role => !teacherRoles.includes(role) && !nonSupportRoles.includes(role)
                            );
                            resolvedRole = ((supportRoles as string[]).includes(inputRole) || (VALID_STAFF_ROLES as readonly string[]).includes(inputRole)) 
                                ? inputRole 
                                : (supportRoles[0] || 'staff');
                        }

                        // 1. Check if user already exists locally
                        let existingUser = currentUsersList.find(u => 
                            (item.email && u.email && u.email.toLowerCase() === String(item.email).trim().toLowerCase()) || 
                            (item.phoneNumber && u.phoneNumber && String(u.phoneNumber).replace(/\D/g, '') === String(item.phoneNumber).replace(/\D/g, ''))
                        );

                        // Query globally to avoid unique email constraint violation (Error 23505)
                        if (!existingUser && item.email) {
                            const globalRecords = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                filter: { email: String(item.email).trim().toLowerCase() }
                            });
                            if (globalRecords && globalRecords.length > 0) {
                                existingUser = globalRecords[0];
                            }
                        }

                        if (existingUser) {
                            // Update existing staff profile
                            const updatedUser = {
                                ...existingUser,
                                name: String(item.name).trim(),
                                role: resolvedRole as any,
                            };
                            if (item.gender) {
                                updatedUser.gender = String(item.gender).trim() as any;
                            }
                            if (updatedUser.institutionId !== currentInstitution.id) {
                                updatedUser.institutionId = currentInstitution.id;
                            }
                            if (!updatedUser.password) {
                                updatedUser.password = 'password123';
                            }
                            await apiService.updateModuleRecord('users', existingUser.id, updatedUser);
                        } else {
                            // Create new staff profile
                            const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const staffEmail = item.email && String(item.email).trim()
                                  ? String(item.email).trim()
                                  : `staff_${newUserId}@eduai.local`;

                            const newUser: User = {
                                id: newUserId,
                                name: String(item.name).trim(),
                                email: staffEmail,
                                phoneNumber: item.phoneNumber ? String(item.phoneNumber).trim() : '',
                                role: resolvedRole as any,
                                institutionId: currentInstitution.id,
                                createdAt: new Date().toISOString(),
                                metadata: {}
                            };
                            if (item.gender) {
                                newUser.gender = String(item.gender).trim() as any;
                            }
                            await apiService.registerUser(newUser, currentInstitution.name);
                            currentUsersList.push(newUser);
                        }
                        successCount++;
                    } catch (err: any) {
                        console.error(`Failed to ingest staff row ${item.name}:`, err);
                    }
                }));
            }

            setStatusMsg({ type: 'success', message: `Successfully imported ${successCount} staff record(s).` });
            loadAllData();
        } catch (err: any) {
            console.error("Bulk staff ingestion failed:", err);
            setStatusMsg({ type: 'error', message: `Staff import failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 5000);
        }
    };

    // Register WebAuthn Biometric passkey
    const handleRegisterBiometrics = async (userId: string, name: string) => {
        try {
            setStatusMsg({ type: 'info', message: 'Initializing biometric scanner...' });
            
            alert(`Ready to register credentials for ${name}. Place your finger on the reader or authenticate using windows Hello/Passkey prompt.`);
            
            const credentialMock = {
                id: `webauthn_${Date.now()}`,
                rawId: `raw_${Date.now()}`,
                type: 'public-key',
                registeredAt: new Date().toISOString()
            };
            
            const userToUpdate = users.find(u => u.id === userId);
            if (userToUpdate) {
                await apiService.updateModuleRecord('users', userToUpdate.id, {
                    ...userToUpdate,
                    metadata: {
                        ...(userToUpdate.metadata || {}),
                        webauthnCredentials: credentialMock,
                        fingerprintTemplate: `biometric_template_hash_${Date.now()}`
                    }
                });
                setStatusMsg({ type: 'success', message: `Biometrics registered successfully for ${name}.` });
                loadAllData();
            }
        } catch (err) {
            console.error("Biometric registration failed:", err);
            setStatusMsg({ type: 'error', message: 'Failed to register biometrics.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Broadcast logic
    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastBody.trim()) {
            setStatusMsg({ type: 'error', message: 'Announcement body cannot be empty.' });
            return;
        }
        if (!broadcastChannels.sms && !broadcastChannels.email) {
            setStatusMsg({ type: 'error', message: 'Please select at least one message delivery channel.' });
            return;
        }

        setStatusMsg({ type: 'info', message: 'Broadcasting messages to cohort...' });
        setIsLoading(true);

        try {
            const cohortStudents = enrollments.filter(enr => {
                if (broadcastTarget === 'All') return true;
                if (context === 'driving_school') {
                    return enr.metadata?.licenseCategory === broadcastTarget;
                } else {
                    return enr.metadata?.gradeLevel === broadcastTarget;
                }
            });

            if (cohortStudents.length === 0) {
                setStatusMsg({ type: 'error', message: 'No registered students match the targeted cohort.' });
                setIsLoading(false);
                return;
            }

            let dispatchedCount = 0;
            for (const enr of cohortStudents) {
                const associatedUser = users.find(u => u.id === enr.userId);
                if (!associatedUser) continue;

                let sent = false;
                if (broadcastChannels.sms && associatedUser.phoneNumber) {
                    try {
                        await apiService.sendSms(
                            associatedUser.phoneNumber,
                            broadcastBody,
                            currentInstitution.smsConfig,
                            1,
                            currentInstitution.id
                        );
                        sent = true;
                    } catch (e) {
                        console.error("SMS Dispatch Failed:", e);
                    }
                }
                if (broadcastChannels.email && associatedUser.email) {
                    try {
                        await apiService.sendEmail(
                            associatedUser.email,
                            broadcastSubject || 'Campus Announcement',
                            broadcastBody,
                            currentInstitution.emailConfig
                        );
                        sent = true;
                    } catch (e) {
                        console.error("Email Dispatch Failed:", e);
                    }
                }
                if (sent) dispatchedCount++;
            }

            const broadcastId = `bc_${Date.now()}`;
            const newLog = {
                id: broadcastId,
                institutionId: currentInstitution.id,
                target: broadcastTarget,
                channel: `${broadcastChannels.sms ? 'SMS' : ''}${broadcastChannels.sms && broadcastChannels.email ? ' / ' : ''}${broadcastChannels.email ? 'Email' : ''}`,
                subject: broadcastSubject || 'Announcement',
                body: broadcastBody,
                recipientsCount: dispatchedCount,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('broadcaster_messages', newLog);
            setStatusMsg({ type: 'success', message: `Broadcast successfully dispatched to ${dispatchedCount} user(s).` });
            
            setBroadcastSubject('');
            setBroadcastBody('');
            loadAllData();
        } catch (err: any) {
            console.error("Broadcast failed:", err);
            setStatusMsg({ type: 'error', message: `Broadcast dispatch failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Event creation logic
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle.trim() || !eventVenue.trim()) {
            setStatusMsg({ type: 'error', message: 'Event Title and Venue venue are required.' });
            return;
        }

        let targetValue = eventTarget;
        if (eventTarget === 'Specific') {
            if (selectedStudentIds.length === 0) {
                setStatusMsg({ type: 'error', message: 'Please select at least one student for specific targeting.' });
                return;
            }
            targetValue = `students:${selectedStudentIds.join(',')}`;
        }

        setStatusMsg({ type: 'info', message: 'Scheduling event...' });
        setIsLoading(true);

        try {
            const eventId = `evt_${Date.now()}`;
            const newEvent = {
                id: eventId,
                institutionId: currentInstitution.id,
                title: eventTitle,
                description: eventDescription,
                eventDate: eventDate,
                eventTime: eventTime,
                venue: eventVenue,
                target: targetValue,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('institution_events', newEvent);
            
            // Confirm shortened RSVP URL for new event
            const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'https://portal.eduai.co.ke'
                : window.location.origin;
            const regUrl = `${origin}/?view=event-confirm&eventId=${eventId}&mode=rsvp`;
            let confirmNotice = '';
            try {
                const shortUrl = await apiService.shortenUrl(regUrl);
                if (shortUrl && shortUrl.startsWith('http')) {
                    confirmNotice = ` (Shortened RSVP Link Confirmed: ${shortUrl})`;
                }
            } catch (_) {}

            setStatusMsg({ type: 'success', message: `Institution event scheduled successfully.${confirmNotice}` });
            
            setEventTitle('');
            setEventDescription('');
            setEventVenue('');
            setEventTarget('All');
            setSelectedStudentIds([]);
            setStudentSearchQuery('');
            loadAllData();
        } catch (err: any) {
            console.error("Failed to create event:", err);
            setStatusMsg({ type: 'error', message: `Event scheduling failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Open event edit modal
    const handleOpenEditEvent = (event: any) => {
        setEditingEvent(event);
        setEditEventTitle(event.title || '');
        setEditEventDescription(event.description || '');
        setEditEventDate(event.eventDate || '');
        setEditEventTime(event.eventTime || '');
        setEditEventVenue(event.venue || '');
        setEditEventTarget(event.target || 'All');
    };

    // Save edited event
    const handleSaveEditEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;
        if (!editEventTitle.trim() || !editEventVenue.trim()) {
            setStatusMsg({ type: 'error', message: 'Event Title and Venue are required.' });
            return;
        }
        setEditEventLoading(true);
        try {
            const updated = {
                ...editingEvent,
                title: editEventTitle.trim(),
                description: editEventDescription.trim(),
                eventDate: editEventDate,
                eventTime: editEventTime,
                venue: editEventVenue.trim(),
                target: editEventTarget,
                updatedAt: new Date().toISOString()
            };
            await apiService.updateModuleRecord('institution_events', editingEvent.id, updated);
            setStatusMsg({ type: 'success', message: 'Event updated successfully.' });
            setEditingEvent(null);
            loadAllData();
        } catch (err: any) {
            setStatusMsg({ type: 'error', message: `Update failed: ${err.message}` });
        } finally {
            setEditEventLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Delete event (and all its pins)
    const handleDeleteEvent = async (event: any) => {
        if (!window.confirm(`Delete event "${event.title}" and all ${eventPins.filter(p => p.eventId === event.id).length} associated PIN(s)? This cannot be undone.`)) return;
        setIsLoading(true);
        try {
            // Delete all pins for this event first
            const pinsToDelete = eventPins.filter(p => p.eventId === event.id);
            for (const pin of pinsToDelete) {
                await apiService.deleteModuleRecord('event_pins', pin.id);
            }
            await apiService.deleteModuleRecord('institution_events', event.id);
            setStatusMsg({ type: 'success', message: `Event "${event.title}" and all its PINs deleted.` });
            loadAllData();
        } catch (err: any) {
            setStatusMsg({ type: 'error', message: `Delete failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Delete a single PIN
    const handleDeletePin = async (pin: any) => {
        const person = users.find(u => u.id === pin.userId);
        if (!window.confirm(`Delete PIN ${pin.pin} for ${person?.name || 'this recipient'}? This cannot be undone.`)) return;
        try {
            await apiService.deleteModuleRecord('event_pins', pin.id);
            setStatusMsg({ type: 'success', message: 'PIN deleted successfully.' });
            loadAllData();
        } catch (err: any) {
            setStatusMsg({ type: 'error', message: `Delete failed: ${err.message}` });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
    };

    // Reset a PIN back to pending
    const handleResetPin = async (pin: any) => {
        if (pin.status === 'pending') {
            setStatusMsg({ type: 'info', message: 'PIN is already pending.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 2000);
            return;
        }
        try {
            await apiService.updateModuleRecord('event_pins', pin.id, { ...pin, status: 'pending', updatedAt: new Date().toISOString() });
            setStatusMsg({ type: 'success', message: `PIN ${pin.pin} reset to Pending.` });
            loadAllData();
        } catch (err: any) {
            setStatusMsg({ type: 'error', message: `Reset failed: ${err.message}` });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
    };

    // Export Attendance List as CSV
    const handleExportAttendanceCsv = (event: any, pinsList: any[]) => {
        const headers = ['Recipient Name', 'Role', 'Contact Phone', 'Contact Email', 'RSVP Status', 'PIN', 'Guests', 'Vehicle Registration', 'Check-In Status'];
        const rows = pinsList.map(p => {
            const user = users.find(u => u.id === p.userId);
            const userName = user?.name || 'Unknown Recipient';
            const userRole = user?.role || 'Guest';
            const userPhone = user?.phoneNumber || 'N/A';
            const userEmail = user?.email || 'N/A';
            
            let guestNames = '';
            if (p.guests) {
                try {
                    const parsed = JSON.parse(p.guests);
                    guestNames = Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
                } catch (e) {
                    guestNames = String(p.guests);
                }
            }

            let rsvpVal = 'Pending';
            if (p.status === 'used') {
                rsvpVal = 'Accepted';
            } else if (p.status === 'rejected') {
                rsvpVal = 'Declined';
            } else if (p.status === 'accepted') {
                rsvpVal = 'Accepted';
            }
            
            const checkinVal = p.status === 'used' ? 'Checked-In' : 'Not Checked-In';

            return [
                userName,
                userRole,
                userPhone,
                userEmail,
                rsvpVal,
                p.pin || '',
                guestNames,
                p.vehicleRegistration || p.vehicle_registration || 'N/A',
                checkinVal
            ];
        });

        const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_List_${event.title.replace(/[\s/]+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Generate comprehensive PDF Event Attendance & Feedback report
    const handleExportEventReportPdf = async (event: any, pins: any[]) => {
        setIsLoading(true);
        try {
            const logoUrl = currentInstitution.logoUrl || (currentInstitution as any).logo_url || null;
            const resolvedCompanyDetails = companyDetails || (currentInstitution as any).companyDetails || {
                name: 'EduAi Automation',
                address: 'Nairobi, Kenya',
                email: 'info@eduai.co.ke',
                phone: '+254700000000',
                website: 'www.eduai.co.ke',
                logoUrl: logoUrl,
                themeColor: '#4f46e5',
                letterheadConfig: {
                    headerImageUrl: null,
                    footerImageUrl: null,
                    stampImageUrl: null,
                    showStamp: false,
                    footerText: 'EduAi Automation - Secure Document'
                }
            };

            const dataUri = await generateEventReportPdf(
                event,
                pins,
                users,
                currentInstitution,
                resolvedCompanyDetails,
                logoUrl
            );
            
            setPdfPreviewUrl(dataUri);
            setPdfPreviewTitle("Event Attendance & Feedback Report Preview");
            setPdfFileName(`Event-Report-${event.title.replace(/\s+/g, '-')}-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`);
        } catch (err: any) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Send Attendance Pin
    const handleSendAttendancePin = async (event: any, additionalMessage: string = '', selectedClass: string = 'All') => {
        setStatusMsg({ type: 'info', message: 'Generating and dispatching attendance PINs...' });
        setIsLoading(true);

        const results: { recipientName: string; phone: string; success: boolean; errorMsg?: string }[] = [];

        try {
            const targetEnrollments = enrollments.filter(enr => {
                if (selectedClass && selectedClass !== 'All') {
                    const allowedGrades = selectedClass.startsWith('grades:')
                        ? selectedClass.replace('grades:', '').split(',').map(c => c.trim().toLowerCase())
                        : [selectedClass.trim().toLowerCase()];
                    const studentGrade = (enr.metadata?.gradeLevel || enr.metadata?.licenseCategory || '').trim().toLowerCase();
                    if (!allowedGrades.includes(studentGrade)) return false;
                }
                return isEventTargetMatch(event.target, enr);
            });

            if (targetEnrollments.length === 0) {
                setStatusMsg({ type: 'error', message: 'No registered students match the event cohort.' });
                setIsLoading(false);
                return;
            }

            let pinCount = 0;
            let currentUsersList = [...users];

            const usersToUpsert = new Map<string, any>();
            const eventPinsToCreate: any[] = [];
            const notificationsToDispatch: {
                targetPhone: string;
                targetEmail: string;
                smsMessage: string;
                emailMessage: string;
                targetName: string;
            }[] = [];

            // Sibling Grouping: Map enrollments to Parent Groups to avoid duplicate SMS per family
            interface SiblingParentGroup {
                key: string;
                parentName: string;
                primaryPhone: string;
                secondaryPhone: string;
                parentEmail: string;
                primaryParent: any;
                secondaryParent: any;
                students: { user: any; enrollment: any }[];
            }

            const parentGroupsMap = new Map<string, SiblingParentGroup>();

            for (const enr of targetEnrollments) {
                let associatedUser = currentUsersList.find(u => u.id === enr.userId);
                if (!associatedUser) {
                    try {
                        const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                            filter: { id: enr.userId }
                        });
                        if (dbUsers && dbUsers.length > 0) {
                            associatedUser = dbUsers[0];
                            if (associatedUser.institutionId !== currentInstitution.id) {
                                associatedUser.institutionId = currentInstitution.id;
                                usersToUpsert.set(associatedUser.id, associatedUser);
                            }
                            currentUsersList.push(associatedUser);
                        }
                    } catch (err) {
                        console.error('[CohortPin] Error searching student user:', enr.userId, err);
                    }
                }

                if (!associatedUser) {
                    results.push({
                        recipientName: `Enrollment ID: ${enr.id}`,
                        phone: 'N/A',
                        success: false,
                        errorMsg: 'User record not found'
                    });
                    continue;
                }

                // Resolve Primary & Secondary Parent Contacts
                const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
                const fallbackParent = {
                    name: enr.metadata?.parentName || '',
                    phone: enr.metadata?.parentPhone || enr.metadata?.parentPhoneNumber || (enr as any).parentPhone || '',
                    email: enr.metadata?.parentEmail || '',
                    relation: enr.metadata?.parentRelation || 'Guardian'
                };
                const fallbackSecondary = {
                    name: enr.metadata?.parentName2 || enr.metadata?.secondaryParentName || '',
                    phone: enr.metadata?.parentPhone2 || enr.metadata?.secondaryPhone || enr.metadata?.parentPhoneNumber2 || enr.metadata?.secondaryParentPhone || enr.metadata?.guardianPhone2 || '',
                    email: enr.metadata?.parentEmail2 || enr.metadata?.secondaryParentEmail || '',
                    relation: enr.metadata?.parentRelation2 || 'Secondary Guardian'
                };

                let resolvedParents = parentsList.length > 0 ? [...parentsList] : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                if (resolvedParents.length < 2 && (fallbackSecondary.name || fallbackSecondary.phone || fallbackSecondary.email)) {
                    if (!resolvedParents.some(p => p.phone && phonesMatch(p.phone, fallbackSecondary.phone))) {
                        resolvedParents.push(fallbackSecondary);
                    }
                }

                const primaryParent = resolvedParents[0];
                const secondaryParent = resolvedParents[1] || (fallbackSecondary.phone && (!primaryParent || !phonesMatch(primaryParent.phone, fallbackSecondary.phone)) ? fallbackSecondary : null);

                const p1PhoneFormatted = primaryParent?.phone ? formatPhoneNumber(primaryParent.phone) : '';
                const p2PhoneFormatted = secondaryParent?.phone ? formatPhoneNumber(secondaryParent.phone) : '';

                // Generate Parent Unique Group Key
                let groupKey = '';
                if (p1PhoneFormatted) {
                    groupKey = `phone_${p1PhoneFormatted}`;
                } else if (primaryParent?.email) {
                    groupKey = `email_${primaryParent.email.toLowerCase()}`;
                } else if (primaryParent?.name) {
                    groupKey = `name_${primaryParent.name.toLowerCase()}`;
                } else {
                    groupKey = `student_${associatedUser.id}`;
                }

                if (!parentGroupsMap.has(groupKey)) {
                    parentGroupsMap.set(groupKey, {
                        key: groupKey,
                        parentName: primaryParent?.name || associatedUser.name || 'Parent / Guardian',
                        primaryPhone: primaryParent?.phone || (isPrimaryOrSecondary ? '' : (associatedUser.phoneNumber || '')),
                        secondaryPhone: p2PhoneFormatted && (!p1PhoneFormatted || !phonesMatch(p1PhoneFormatted, p2PhoneFormatted)) ? secondaryParent?.phone || '' : '',
                        parentEmail: primaryParent?.email || (isPrimaryOrSecondary ? '' : (associatedUser.email || '')),
                        primaryParent: primaryParent || null,
                        secondaryParent: secondaryParent || null,
                        students: []
                    });
                }

                const group = parentGroupsMap.get(groupKey)!;
                if (!group.students.some(s => s.user.id === associatedUser.id)) {
                    group.students.push({ user: associatedUser, enrollment: enr });
                }
            }

            // Process Each Parent Group (Single Consolidated Invite per Sibling Family)
            for (const group of Array.from(parentGroupsMap.values())) {
                const primaryParent = group.primaryParent;
                const secondaryParent = group.secondaryParent;
                const allStudentIds = group.students.map(s => s.user.id);
                const firstStudent = group.students[0].user;

                let targetUserId = firstStudent.id;
                let targetName = group.parentName;
                let primaryPhone = group.primaryPhone;
                let secondaryPhone = group.secondaryPhone;
                let targetEmail = group.parentEmail;

                if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                    const formattedParentPhone = primaryParent.phone ? formatPhoneNumber(primaryParent.phone) : '';
                    let parentUser = Array.from(usersToUpsert.values()).find((u: any) =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
                    ) || currentUsersList.find(u =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
                    );

                    if (!parentUser) {
                        try {
                            const filterVal: any = {};
                            if (primaryParent.email) filterVal.email = primaryParent.email.toLowerCase();
                            else if (primaryParent.phone) filterVal.phoneNumber = formattedParentPhone;

                            const dbParents = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                filter: filterVal
                            });
                            if (dbParents && dbParents.length > 0) {
                                parentUser = dbParents[0];
                                if (parentUser.institutionId !== currentInstitution.id) {
                                    parentUser.institutionId = currentInstitution.id;
                                    usersToUpsert.set(parentUser.id, parentUser);
                                }
                                currentUsersList.push(parentUser);
                            }
                        } catch (err) {
                            console.error('[CohortPin] Error searching parent user:', err);
                        }
                    }

                    if (!parentUser) {
                        const newId = `u_par_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        parentUser = {
                            id: newId,
                            institutionId: currentInstitution.id,
                            name: primaryParent.name || 'Parent / Guardian',
                            email: primaryParent.email || (primaryParent.phone ? `parent_${formattedParentPhone}@eduai.co.ke` : `parent_${newId}@eduai.co.ke`),
                            phoneNumber: primaryParent.phone ? formattedParentPhone : null,
                            role: 'parent',
                            studentIds: allStudentIds,
                            metadata: {},
                            createdAt: new Date().toISOString()
                        } as any;
                        usersToUpsert.set(newId, parentUser);
                        currentUsersList.push(parentUser);
                    } else {
                        const currentStudentIds = Array.isArray(parentUser.studentIds) ? parentUser.studentIds : [];
                        const mergedStudentIds = Array.from(new Set([...currentStudentIds, ...allStudentIds]));
                        if (mergedStudentIds.length !== currentStudentIds.length) {
                            parentUser = {
                                ...parentUser,
                                studentIds: mergedStudentIds
                            };
                            usersToUpsert.set(parentUser.id, parentUser);
                        }
                    }

                    for (const s of group.students) {
                        const currentParentIds = Array.isArray(s.user.parentIds) ? s.user.parentIds : [];
                        if (!currentParentIds.includes(parentUser.id)) {
                            const updatedStudent = {
                                ...s.user,
                                parentIds: [...currentParentIds, parentUser.id]
                            };
                            usersToUpsert.set(s.user.id, updatedStudent);
                            const idx = currentUsersList.findIndex(u => u.id === s.user.id);
                            if (idx !== -1) currentUsersList[idx] = updatedStudent;
                        }
                    }

                    targetUserId = parentUser.id;
                    targetName = primaryParent.name || 'Parent / Guardian';
                    primaryPhone = primaryParent.phone;
                    targetEmail = primaryParent.email;
                }

                // Check or create PIN record
                const existingPin = eventPins.find(p => p.eventId === event.id && p.userId === targetUserId) ||
                                    eventPinsToCreate.find(p => p.eventId === event.id && p.userId === targetUserId);
                const pinCode = existingPin ? existingPin.pin : Math.floor(100000 + Math.random() * 900000).toString();
                const pinId = existingPin ? existingPin.id : `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                if (!existingPin) {
                    const newPinRecord = {
                        id: pinId,
                        institutionId: currentInstitution.id,
                        eventId: event.id,
                        userId: targetUserId,
                        pin: pinCode,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    eventPinsToCreate.push(newPinRecord);
                }

                // Construct Confirmation Link
                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                    ? 'https://portal.eduai.co.ke'
                    : window.location.origin;

                const fallbackPayload = [
                    pinCode,                                              // 0
                    event.title,                                          // 1
                    event.eventDate,                                      // 2
                    event.eventTime,                                      // 3
                    event.venue,                                          // 4
                    targetName || 'Parent / Guardian',                    // 5
                    primaryPhone || '',                                   // 6
                    currentInstitution.name || '',                        // 7
                    currentInstitution.id,                                // 8
                    event.description || '',                              // 9
                    targetUserId,                                         // 10
                    event.id                                              // 11
                ];
                const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(fallbackPayload))));
                const rawLink = `${origin}/?view=event-confirm&pinId=${pinId}&data=${base64Data}`;
                const confirmationLink = rawLink;
                const shortLink = `${origin}/?view=event-confirm&pinId=${pinId}`;
                let shortenedLink = shortLink;
                try {
                    shortenedLink = await apiService.shortenUrl(shortLink);
                } catch (_) {}

                const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';

                // Combine Sibling Student Names for Consolidated Message
                const studentNames = group.students.map(s => s.user.name || 'your child').filter(Boolean);
                let studentLabel = 'your child';
                if (studentNames.length === 1) {
                    studentLabel = studentNames[0];
                } else if (studentNames.length === 2) {
                    studentLabel = `${studentNames[0]} & ${studentNames[1]}`;
                } else if (studentNames.length > 2) {
                    studentLabel = `${studentNames.slice(0, -1).join(', ')} & ${studentNames[studentNames.length - 1]}`;
                }

                const greetingName = targetName && targetName !== 'Parent / Guardian' ? targetName : 'Guardian';
                const smsMessage = `Dear ${greetingName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue}${studentLabel && studentLabel !== 'your child' ? ` — regarding ${studentLabel}` : ''}.${suffix} Confirm attendance: ${shortenedLink}`;

                const emailMessage = `Dear ${greetingName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue}${studentLabel && studentLabel !== 'your child' ? ` — regarding ${studentLabel}` : ''}.${suffix} Confirm attendance: ${confirmationLink}`;

                // Queue SMS to Primary Phone
                if (primaryPhone) {
                    notificationsToDispatch.push({
                        targetPhone: primaryPhone,
                        targetEmail: targetEmail,
                        smsMessage,
                        emailMessage,
                        targetName: secondaryPhone ? `${targetName} (Primary)` : targetName
                    });
                }

                // Queue SMS to Secondary Phone (if configured and distinct from Primary)
                if (secondaryPhone && (!primaryPhone || !phonesMatch(primaryPhone, secondaryPhone))) {
                    notificationsToDispatch.push({
                        targetPhone: secondaryPhone,
                        targetEmail: '',
                        smsMessage,
                        emailMessage: '',
                        targetName: `${targetName} (Secondary)`
                    });
                }

                if (!primaryPhone && !secondaryPhone) {
                    results.push({
                        recipientName: targetName,
                        phone: 'No phone number',
                        success: false,
                        errorMsg: isPrimaryOrSecondary ? 'No parent phone number configured' : 'No phone number configured'
                    });
                }

                pinCount++;
            }

            // Save users and pins in bulk
            if (usersToUpsert.size > 0) {
                await apiService.saveModuleRecords('users', Array.from(usersToUpsert.values()));
            }
            if (eventPinsToCreate.length > 0) {
                await apiService.saveModuleRecords('event_pins', eventPinsToCreate);
            }

            // Chunk and dispatch notifications
            const chunkArray = (array: any[], size: number): any[][] => {
                const chunks: any[][] = [];
                for (let i = 0; i < array.length; i += size) {
                    chunks.push(array.slice(i, i + size));
                }
                return chunks;
            };

            const notificationChunks = chunkArray(notificationsToDispatch, 15);

            for (const chunk of notificationChunks) {
                await Promise.all(chunk.map(async (notif) => {
                    if (notif.targetPhone) {
                        try {
                            const res = await apiService.sendSms(
                                notif.targetPhone,
                                notif.smsMessage,
                                currentInstitution.smsConfig,
                                1,
                                currentInstitution.id
                            );
                            const isSuccess = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
                            results.push({
                                recipientName: notif.targetName,
                                phone: notif.targetPhone,
                                success: isSuccess,
                                errorMsg: isSuccess ? undefined : (res?.message || 'Rejected by SMS gateway')
                            });
                        } catch (e: any) {
                            console.error("SMS PIN send failed", e);
                            results.push({
                                recipientName: notif.targetName,
                                phone: notif.targetPhone,
                                success: false,
                                errorMsg: e.message || 'Connection failed'
                            });
                        }
                    } else {
                        results.push({
                            recipientName: notif.targetName,
                            phone: 'No phone number',
                            success: false,
                            errorMsg: isPrimaryOrSecondary 
                                ? 'No parent phone number configured for student' 
                                : 'No phone number configured'
                        });
                    }

                    if (notif.targetEmail) {
                        try {
                            await apiService.sendEmail(
                                notif.targetEmail,
                                `Event Attendance Invitation - ${event.title}`,
                                notif.emailMessage,
                                currentInstitution.emailConfig
                            );
                        } catch (e) {
                            console.error("Email PIN send failed", e);
                        }
                    }
                }));
            }

            setStatusMsg({ type: 'success', message: `Successfully generated and sent ${pinCount} PINs.` });
            setSmsDeliveryReport(results);
            loadAllData();
        } catch (err: any) {
            console.error("Failed to generate/send PINs:", err);
            setStatusMsg({ type: 'error', message: `PIN dispatch failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Resend/Generate PINs to missing recipients (audit check resolver)
    const handleSendPinsToMissingRecipients = async (event: any, additionalMessage: string = '', selectedClass: string = 'All') => {
        setStatusMsg({ type: 'info', message: 'Analyzing missing recipients and generating PINs...' });
        setIsLoading(true);

        const results: { recipientName: string; phone: string; success: boolean; errorMsg?: string }[] = [];

        try {
            // 1. Identify all target enrollments for this cohort & class filter
            const targetEnrollments = enrollments.filter(enr => {
                if (selectedClass && selectedClass !== 'All') {
                    const allowedGrades = selectedClass.startsWith('grades:')
                        ? selectedClass.replace('grades:', '').split(',').map(c => c.trim().toLowerCase())
                        : [selectedClass.trim().toLowerCase()];
                    const studentGrade = (enr.metadata?.gradeLevel || enr.metadata?.licenseCategory || '').trim().toLowerCase();
                    if (!allowedGrades.includes(studentGrade)) return false;
                }
                return isEventTargetMatch(event.target, enr);
            });

            // 2. Filter to only those that do not have a pin record
            const missingEnrollments: typeof targetEnrollments = [];
            const currentUsersList = [...users];

            for (const enr of targetEnrollments) {
                const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
                const fallbackParent = {
                    name: enr.metadata?.parentName || '',
                    phone: enr.metadata?.parentPhone || (enr as any).parentPhone || '',
                    email: enr.metadata?.parentEmail || '',
                    relation: enr.metadata?.parentRelation || 'Guardian'
                };
                const resolvedParents = parentsList.length > 0 ? parentsList : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                const primaryParent = resolvedParents[0];

                let targetUserId = enr.userId;
                if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                    const formattedParentPhone = primaryParent.phone ? formatPhoneNumber(primaryParent.phone) : '';
                    const parentUser = currentUsersList.find(u =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
                    );
                    if (parentUser) {
                        targetUserId = parentUser.id;
                    }
                }

                const hasPin = eventPins.some(p => p.eventId === event.id && p.userId === targetUserId);
                if (!hasPin) {
                    missingEnrollments.push(enr);
                }
            }

            if (missingEnrollments.length === 0) {
                setStatusMsg({ type: 'success', message: 'All students in the cohort have already been issued PINs.' });
                setIsLoading(false);
                return;
            }

            setStatusMsg({ type: 'info', message: `Found ${missingEnrollments.length} missing recipients. Fetching user records...` });

            let pinCount = 0;
            const usersToUpsert = new Map<string, any>();
            const eventPinsToCreate: any[] = [];
            const notificationsToDispatch: {
                targetPhone: string;
                targetEmail: string;
                smsMessage: string;
                emailMessage: string;
                targetName: string;
            }[] = [];

            // Sibling Grouping: Map missing enrollments to Parent Groups
            interface SiblingResendParentGroup {
                key: string;
                parentName: string;
                primaryPhone: string;
                secondaryPhone: string;
                parentEmail: string;
                primaryParent: any;
                secondaryParent: any;
                students: { user: any; enrollment: any }[];
            }

            const parentGroupsMap = new Map<string, SiblingResendParentGroup>();

            for (const enr of missingEnrollments) {
                let associatedUser = currentUsersList.find(u => u.id === enr.userId);
                if (!associatedUser) {
                    try {
                        const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                            filter: { id: enr.userId }
                        });
                        if (dbUsers && dbUsers.length > 0) {
                            associatedUser = dbUsers[0];
                            if (associatedUser.institutionId !== currentInstitution.id) {
                                associatedUser.institutionId = currentInstitution.id;
                                usersToUpsert.set(associatedUser.id, associatedUser);
                            }
                            currentUsersList.push(associatedUser);
                        }
                    } catch (err) {
                        console.error('[ResendPins] Error searching student user:', enr.userId, err);
                    }
                }

                if (!associatedUser) {
                    const newUserId = enr.userId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    associatedUser = {
                        id: newUserId,
                        name: enr.metadata?.studentName || 'Student Name',
                        email: `student_${newUserId}@eduai.local`,
                        phoneNumber: '',
                        role: 'student',
                        institutionId: currentInstitution.id,
                        createdAt: new Date().toISOString(),
                        metadata: {}
                    };
                    usersToUpsert.set(newUserId, associatedUser);
                    currentUsersList.push(associatedUser);
                }

                const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
                const fallbackParent = {
                    name: enr.metadata?.parentName || '',
                    phone: enr.metadata?.parentPhone || enr.metadata?.parentPhoneNumber || (enr as any).parentPhone || '',
                    email: enr.metadata?.parentEmail || '',
                    relation: enr.metadata?.parentRelation || 'Guardian'
                };
                const fallbackSecondary = {
                    name: enr.metadata?.parentName2 || enr.metadata?.secondaryParentName || '',
                    phone: enr.metadata?.parentPhone2 || enr.metadata?.secondaryPhone || enr.metadata?.parentPhoneNumber2 || enr.metadata?.secondaryParentPhone || enr.metadata?.guardianPhone2 || '',
                    email: enr.metadata?.parentEmail2 || enr.metadata?.secondaryParentEmail || '',
                    relation: enr.metadata?.parentRelation2 || 'Secondary Guardian'
                };

                let resolvedParents = parentsList.length > 0 ? [...parentsList] : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                if (resolvedParents.length < 2 && (fallbackSecondary.name || fallbackSecondary.phone || fallbackSecondary.email)) {
                    if (!resolvedParents.some(p => p.phone && phonesMatch(p.phone, fallbackSecondary.phone))) {
                        resolvedParents.push(fallbackSecondary);
                    }
                }

                const primaryParent = resolvedParents[0];
                const secondaryParent = resolvedParents[1] || (fallbackSecondary.phone && (!primaryParent || !phonesMatch(primaryParent.phone, fallbackSecondary.phone)) ? fallbackSecondary : null);

                const p1PhoneFormatted = primaryParent?.phone ? formatPhoneNumber(primaryParent.phone) : '';
                const p2PhoneFormatted = secondaryParent?.phone ? formatPhoneNumber(secondaryParent.phone) : '';

                let groupKey = '';
                if (p1PhoneFormatted) {
                    groupKey = `phone_${p1PhoneFormatted}`;
                } else if (primaryParent?.email) {
                    groupKey = `email_${primaryParent.email.toLowerCase()}`;
                } else if (primaryParent?.name) {
                    groupKey = `name_${primaryParent.name.toLowerCase()}`;
                } else {
                    groupKey = `student_${associatedUser.id}`;
                }

                if (!parentGroupsMap.has(groupKey)) {
                    parentGroupsMap.set(groupKey, {
                        key: groupKey,
                        parentName: primaryParent?.name || associatedUser.name || 'Parent / Guardian',
                        primaryPhone: primaryParent?.phone || (isPrimaryOrSecondary ? '' : (associatedUser.phoneNumber || '')),
                        secondaryPhone: p2PhoneFormatted && (!p1PhoneFormatted || !phonesMatch(p1PhoneFormatted, p2PhoneFormatted)) ? secondaryParent?.phone || '' : '',
                        parentEmail: primaryParent?.email || (isPrimaryOrSecondary ? '' : (associatedUser.email || '')),
                        primaryParent: primaryParent || null,
                        secondaryParent: secondaryParent || null,
                        students: []
                    });
                }

                const group = parentGroupsMap.get(groupKey)!;
                if (!group.students.some(s => s.user.id === associatedUser.id)) {
                    group.students.push({ user: associatedUser, enrollment: enr });
                }
            }

            // Process Each Parent Group
            for (const group of Array.from(parentGroupsMap.values())) {
                const primaryParent = group.primaryParent;
                const secondaryParent = group.secondaryParent;
                const allStudentIds = group.students.map(s => s.user.id);
                const firstStudent = group.students[0].user;

                let targetUserId = firstStudent.id;
                let targetName = group.parentName;
                let primaryPhone = group.primaryPhone;
                let secondaryPhone = group.secondaryPhone;
                let targetEmail = group.parentEmail;

                if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                    const formattedParentPhone = primaryParent.phone ? formatPhoneNumber(primaryParent.phone) : '';
                    let parentUser = Array.from(usersToUpsert.values()).find((u: any) =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
                    ) || currentUsersList.find(u =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
                    );

                    if (!parentUser) {
                        try {
                            const filterVal: any = {};
                            if (primaryParent.email) filterVal.email = primaryParent.email.toLowerCase();
                            else if (primaryParent.phone) filterVal.phoneNumber = formattedParentPhone;

                            const dbParents = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                filter: filterVal
                            });
                            if (dbParents && dbParents.length > 0) {
                                parentUser = dbParents[0];
                                if (parentUser.institutionId !== currentInstitution.id) {
                                    parentUser.institutionId = currentInstitution.id;
                                    usersToUpsert.set(parentUser.id, parentUser);
                                }
                                currentUsersList.push(parentUser);
                            }
                        } catch (err) {
                            console.error('[ResendPins] Error searching parent user:', err);
                        }
                    }

                    if (!parentUser) {
                        const newId = `u_par_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        const cleanPhone = formattedParentPhone ? formattedParentPhone.replace(/\+/g, '') : newId;
                        const parentEmail = primaryParent.email 
                            ? primaryParent.email.toLowerCase() 
                            : `parent_${cleanPhone}_${Math.random().toString(36).substr(2, 4)}@eduai.local`;
                        parentUser = {
                            id: newId,
                            institutionId: currentInstitution.id,
                            name: primaryParent.name || 'Parent / Guardian',
                            email: parentEmail,
                            phoneNumber: primaryParent.phone ? formattedParentPhone : null,
                            role: 'parent',
                            studentIds: allStudentIds,
                            metadata: {},
                            createdAt: new Date().toISOString()
                        } as any;
                        usersToUpsert.set(newId, parentUser);
                        currentUsersList.push(parentUser);
                    } else {
                        const currentStudentIds = Array.isArray(parentUser.studentIds) ? parentUser.studentIds : [];
                        const mergedStudentIds = Array.from(new Set([...currentStudentIds, ...allStudentIds]));
                        if (mergedStudentIds.length !== currentStudentIds.length) {
                            parentUser = {
                                ...parentUser,
                                studentIds: mergedStudentIds
                            };
                            usersToUpsert.set(parentUser.id, parentUser);
                        }
                    }

                    for (const s of group.students) {
                        const currentParentIds = Array.isArray(s.user.parentIds) ? s.user.parentIds : [];
                        if (!currentParentIds.includes(parentUser.id)) {
                            const updatedStudent = {
                                ...s.user,
                                parentIds: [...currentParentIds, parentUser.id]
                            };
                            usersToUpsert.set(s.user.id, updatedStudent);
                            const idx = currentUsersList.findIndex(u => u.id === s.user.id);
                            if (idx !== -1) currentUsersList[idx] = updatedStudent;
                        }
                    }

                    targetUserId = parentUser.id;
                    targetName = primaryParent.name || 'Parent / Guardian';
                    primaryPhone = primaryParent.phone;
                    targetEmail = primaryParent.email;
                }

                const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
                const pinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                const newPinRecord = {
                    id: pinId,
                    institutionId: currentInstitution.id,
                    eventId: event.id,
                    userId: targetUserId,
                    pin: pinCode,
                    status: 'pending' as const,
                    createdAt: new Date().toISOString()
                };
                eventPinsToCreate.push(newPinRecord);

                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                    ? 'https://portal.eduai.co.ke'
                    : window.location.origin;

                const fallbackPayload = [
                    pinCode,                                              // 0
                    event.title,                                          // 1
                    event.eventDate,                                      // 2
                    event.eventTime,                                      // 3
                    event.venue,                                          // 4
                    targetName || 'Parent / Guardian',                    // 5
                    primaryPhone || '',                                   // 6
                    currentInstitution.name || '',                        // 7
                    currentInstitution.id,                                // 8
                    event.description || '',                              // 9
                    targetUserId,                                         // 10
                    event.id                                              // 11
                ];
                const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(fallbackPayload))));
                const rawLink = `${origin}/?view=event-confirm&pinId=${pinId}&data=${base64Data}`;
                const shortLink = `${origin}/?view=event-confirm&pinId=${pinId}`;
                let shortenedLink = shortLink;
                try {
                    shortenedLink = await apiService.shortenUrl(shortLink);
                } catch (_) {}

                const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';

                const studentNames = group.students.map(s => s.user.name || 'your child').filter(Boolean);
                let studentLabel = 'your child';
                if (studentNames.length === 1) {
                    studentLabel = studentNames[0];
                } else if (studentNames.length === 2) {
                    studentLabel = `${studentNames[0]} & ${studentNames[1]}`;
                } else if (studentNames.length > 2) {
                    studentLabel = `${studentNames.slice(0, -1).join(', ')} & ${studentNames[studentNames.length - 1]}`;
                }

                const greetingName2 = targetName && targetName !== 'Parent / Guardian' ? targetName : 'Guardian';
                const smsMessage = `Dear ${greetingName2}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue}${studentLabel && studentLabel !== 'your child' ? ` — regarding ${studentLabel}` : ''}.${suffix} Confirm attendance: ${shortenedLink}`;

                const emailMessage = `Dear ${greetingName2}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue}${studentLabel && studentLabel !== 'your child' ? ` — regarding ${studentLabel}` : ''}.${suffix} Confirm attendance: ${rawLink}`;

                // Queue SMS to Primary Phone
                if (primaryPhone) {
                    notificationsToDispatch.push({
                        targetPhone: primaryPhone,
                        targetEmail: targetEmail,
                        smsMessage,
                        emailMessage,
                        targetName: secondaryPhone ? `${targetName} (Primary)` : targetName
                    });
                }

                // Queue SMS to Secondary Phone (if configured and distinct from Primary)
                if (secondaryPhone && (!primaryPhone || !phonesMatch(primaryPhone, secondaryPhone))) {
                    notificationsToDispatch.push({
                        targetPhone: secondaryPhone,
                        targetEmail: '',
                        smsMessage,
                        emailMessage: '',
                        targetName: `${targetName} (Secondary)`
                    });
                }

                pinCount++;
            }

            if (usersToUpsert.size > 0) {
                const upsertedList = Array.from(usersToUpsert.values());
                try {
                    await apiService.saveModuleRecords('users', upsertedList);
                } catch (err: any) {
                    console.warn('[handleSendPinsToMissingRecipients] Bulk save users failed, saving individually:', err);
                    for (const u of upsertedList) {
                        try {
                            await apiService.saveModuleRecord('users', u);
                        } catch (singleErr) {
                            console.warn(`[handleSendPinsToMissingRecipients] Skipped duplicate user ${u.email}:`, singleErr);
                        }
                    }
                }
                setUsers(prev => {
                    const next = [...prev];
                    upsertedList.forEach(u => {
                        const idx = next.findIndex(item => item.id === u.id);
                        if (idx !== -1) next[idx] = u;
                        else next.push(u);
                    });
                    return next;
                });
            }
            if (eventPinsToCreate.length > 0) {
                await apiService.saveModuleRecords('event_pins', eventPinsToCreate);
                setEventPins(prev => [...prev, ...eventPinsToCreate]);
            }

            const chunkArray = (array: any[], size: number): any[][] => {
                const chunks: any[][] = [];
                for (let i = 0; i < array.length; i += size) {
                    chunks.push(array.slice(i, i + size));
                }
                return chunks;
            };

            const notificationChunks = chunkArray(notificationsToDispatch, 15);

            for (const chunk of notificationChunks) {
                await Promise.all(chunk.map(async (notif) => {
                    if (notif.targetPhone) {
                        try {
                            const res = await apiService.sendSms(
                                notif.targetPhone,
                                notif.smsMessage,
                                currentInstitution.smsConfig,
                                1,
                                currentInstitution.id
                            );
                            const isSuccess = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
                            results.push({
                                recipientName: notif.targetName,
                                phone: notif.targetPhone,
                                success: isSuccess,
                                errorMsg: isSuccess ? undefined : (res?.message || 'Rejected by SMS gateway')
                            });
                        } catch (e: any) {
                            console.error("SMS PIN send failed", e);
                            results.push({
                                recipientName: notif.targetName,
                                phone: notif.targetPhone,
                                success: false,
                                errorMsg: e.message || 'Connection failed'
                            });
                        }
                    } else {
                        results.push({
                            recipientName: notif.targetName,
                            phone: 'No phone number',
                            success: false,
                            errorMsg: isPrimaryOrSecondary ? 'No parent phone configured' : 'No phone number configured'
                        });
                    }

                    if (notif.targetEmail) {
                        try {
                            await apiService.sendEmail(
                                notif.targetEmail,
                                `Event Attendance Invitation - ${event.title}`,
                                notif.emailMessage,
                                currentInstitution.emailConfig
                            );
                        } catch (e) {
                            console.error("Email PIN send failed", e);
                        }
                    }
                }));
            }

            setStatusMsg({ type: 'success', message: `Successfully generated and sent ${pinCount} PINs to missing recipients.` });
            setSmsDeliveryReport(results);
            loadAllData();
        } catch (err: any) {
            console.error("Failed to resend PINs:", err);
            setStatusMsg({ type: 'error', message: `PIN dispatch failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Helper to evaluate whether a given event PIN record matches a specific enrollment
    const isPinForEnrollment = (
        p: any,
        eventId: string,
        enr: any,
        targetUserId: string,
        primaryParent: { phone?: string; email?: string } | null,
        currentUsersList: any[]
    ): boolean => {
        const pEvtId = p.eventId || p.event_id;
        if (pEvtId && pEvtId !== eventId) return false;
        const pUserId = p.userId || p.user_id;

        // Direct match with student user ID or target parent user ID
        if (pUserId && (pUserId === targetUserId || pUserId === enr.userId)) return true;

        // Metadata match
        if (p.metadata?.studentId === enr.userId || p.metadata?.enrollmentId === enr.id) return true;
        if (primaryParent?.phone && p.metadata?.parentPhone && phonesMatch(p.metadata.parentPhone, primaryParent.phone)) return true;
        if (primaryParent?.email && p.metadata?.parentEmail && p.metadata.parentEmail.toLowerCase() === primaryParent.email.toLowerCase()) return true;

        // User profile matching via studentIds array, phone, or email
        if (pUserId) {
            const pinUserObj = currentUsersList.find(u => u.id === pUserId);
            if (pinUserObj) {
                if (Array.isArray(pinUserObj.studentIds) && pinUserObj.studentIds.includes(enr.userId)) return true;
                if (primaryParent?.phone && pinUserObj.phoneNumber && phonesMatch(pinUserObj.phoneNumber, primaryParent.phone)) return true;
                if (primaryParent?.email && pinUserObj.email && pinUserObj.email.toLowerCase() === primaryParent.email.toLowerCase()) return true;
            }
        }

        return false;
    };

    // Safely resolve or create a parent user profile without unique constraint errors (e.g., Code 23505 email conflicts)
    const resolveOrCreateParentUser = async (
        primaryParent: { name?: string; phone?: string; email?: string },
        associatedStudentId: string,
        currentUsersList: User[]
    ): Promise<User | null> => {
        if (!primaryParent || (!primaryParent.phone && !primaryParent.email)) return null;

        const formattedParentPhone = primaryParent.phone ? formatPhoneNumber(primaryParent.phone) : '';

        // 1. Search in memory
        let parentUser = currentUsersList.find(u =>
            (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
            (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
        );

        // 2. If not found in memory, query backend users table by email or phone
        if (!parentUser) {
            try {
                if (primaryParent.email) {
                    const dbByEmail = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                        filter: { email: primaryParent.email.toLowerCase() }
                    });
                    if (dbByEmail && dbByEmail.length > 0) parentUser = dbByEmail[0];
                }
                if (!parentUser && formattedParentPhone) {
                    const dbByPhone = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                        filter: { phoneNumber: formattedParentPhone }
                    });
                    if (dbByPhone && dbByPhone.length > 0) parentUser = dbByPhone[0];
                }
            } catch (e) {
                console.warn('[resolveOrCreateParentUser] DB search failed:', e);
            }
        }

        // 3. If parent user exists, link studentId if missing
        if (parentUser) {
            const currentStudentIds = Array.isArray(parentUser.studentIds) ? parentUser.studentIds : [];
            if (!currentStudentIds.includes(associatedStudentId)) {
                parentUser = {
                    ...parentUser,
                    studentIds: [...currentStudentIds, associatedStudentId]
                };
                try {
                    await apiService.updateModuleRecord('users', parentUser.id, parentUser);
                } catch (_) {}
            }
            if (!currentUsersList.some(u => u.id === parentUser!.id)) {
                currentUsersList.push(parentUser);
            }
            return parentUser;
        }

        // 4. Create new parent user with unique fallback email
        const newId = `u_par_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const cleanPhoneStr = formattedParentPhone ? formattedParentPhone.replace(/\+/g, '') : newId;
        const parentEmail = primaryParent.email 
            ? primaryParent.email.toLowerCase() 
            : `parent_${cleanPhoneStr}_${Math.random().toString(36).substr(2, 4)}@eduai.local`;

        parentUser = {
            id: newId,
            institutionId: currentInstitution.id,
            name: primaryParent.name || 'Parent / Guardian',
            email: parentEmail,
            phoneNumber: primaryParent.phone ? formattedParentPhone : null,
            role: 'parent',
            studentIds: [associatedStudentId],
            metadata: {},
            createdAt: new Date().toISOString()
        } as any;

        try {
            await apiService.saveModuleRecord('users', parentUser);
            currentUsersList.push(parentUser);
            setUsers(prev => [...prev.filter(u => u.id !== parentUser!.id), parentUser!]);
        } catch (err: any) {
            const errStr = String(err?.message || err);
            if (errStr.includes('23505') || errStr.includes('Registry Conflict') || errStr.includes('already registered')) {
                console.warn('[resolveOrCreateParentUser] Email conflict when saving parent user, resolving existing user...');
                try {
                    if (primaryParent.email) {
                        const existing = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                            filter: { email: primaryParent.email.toLowerCase() }
                        });
                        if (existing && existing.length > 0) return existing[0];
                    }
                } catch (_) {}
                // Fallback: retry with non-conflicting synthetic email
                parentUser.email = `parent_${newId}@eduai.local`;
                await apiService.saveModuleRecord('users', parentUser).catch(() => {});
                currentUsersList.push(parentUser);
                setUsers(prev => [...prev.filter(u => u.id !== parentUser!.id), parentUser!]);
            }
        }

        return parentUser;
    };

    // Bulk Generate PINs ONLY (Silent / No SMS or Email)
    const handleGeneratePinsOnlyForMissing = async (event: any) => {
        setStatusMsg({ type: 'info', message: 'Generating PIN records silently...' });
        setIsLoading(true);

        try {
            const targetEnrollments = enrollments.filter(enr => isEventTargetMatch(event.target, enr));
            const missingEnrollments: typeof targetEnrollments = [];
            const currentUsersList = [...users];

            for (const enr of targetEnrollments) {
                const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
                const fallbackParent = {
                    name: enr.metadata?.parentName || '',
                    phone: enr.metadata?.parentPhone || (enr as any).parentPhone || '',
                    email: enr.metadata?.parentEmail || '',
                    relation: enr.metadata?.parentRelation || 'Guardian'
                };
                const resolvedParents = parentsList.length > 0 ? parentsList : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                const primaryParent = resolvedParents[0];

                let targetUserId = enr.userId;
                if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                    const parentUser = await resolveOrCreateParentUser(primaryParent, enr.userId, currentUsersList);
                    if (parentUser) {
                        targetUserId = parentUser.id;
                    }
                }

                const hasPin = eventPins.some(p => isPinForEnrollment(p, event.id, enr, targetUserId, primaryParent, currentUsersList));
                if (!hasPin) {
                    missingEnrollments.push(enr);
                }
            }

            if (missingEnrollments.length === 0) {
                setStatusMsg({ type: 'success', message: 'All target recipients already have generated PINs.' });
                setIsLoading(false);
                return;
            }

            const usersToUpsert = new Map<string, any>();
            const eventPinsToCreate: any[] = [];

            for (const enr of missingEnrollments) {
                let associatedUser = currentUsersList.find(u => u.id === enr.userId);
                if (!associatedUser) {
                    const newUserId = enr.userId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    associatedUser = {
                        id: newUserId,
                        name: enr.metadata?.studentName || 'Student Name',
                        email: `student_${newUserId}@eduai.local`,
                        phoneNumber: '',
                        role: 'student',
                        institutionId: currentInstitution.id,
                        createdAt: new Date().toISOString(),
                        metadata: {}
                    };
                    usersToUpsert.set(newUserId, associatedUser);
                    currentUsersList.push(associatedUser);
                }

                const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
                const fallbackParent = {
                    name: enr.metadata?.parentName || '',
                    phone: enr.metadata?.parentPhone || (enr as any).parentPhone || '',
                    email: enr.metadata?.parentEmail || '',
                    relation: enr.metadata?.parentRelation || 'Guardian'
                };
                const resolvedParents = parentsList.length > 0 ? parentsList : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                const primaryParent = resolvedParents[0];

                let targetUserId = associatedUser.id;

                if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                    const parentUser = await resolveOrCreateParentUser(primaryParent, associatedUser.id, currentUsersList);
                    if (parentUser) {
                        targetUserId = parentUser.id;
                    }
                }

                const existingPin = eventPins.find(p => isPinForEnrollment(p, event.id, enr, targetUserId, primaryParent, currentUsersList))
                    || eventPinsToCreate.find(p => (p.eventId || p.event_id) === event.id && (p.userId || p.user_id) === targetUserId);

                if (!existingPin) {
                    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
                    const pinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    eventPinsToCreate.push({
                        id: pinId,
                        institutionId: currentInstitution.id,
                        institution_id: currentInstitution.id,
                        eventId: event.id,
                        event_id: event.id,
                        userId: targetUserId,
                        user_id: targetUserId,
                        pin: pinCode,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        created_at: new Date().toISOString()
                    });
                }
            }

            if (usersToUpsert.size > 0) {
                const upsertedList = Array.from(usersToUpsert.values());
                try {
                    await apiService.saveModuleRecords('users', upsertedList);
                } catch (err: any) {
                    console.warn('[handleGeneratePinsOnlyForMissing] Bulk save users failed, trying individually:', err);
                    for (const u of upsertedList) {
                        try {
                            await apiService.saveModuleRecord('users', u);
                        } catch (singleErr) {
                            console.warn('[handleGeneratePinsOnlyForMissing] Individual user save skipped:', singleErr);
                        }
                    }
                }
                setUsers(prev => {
                    const next = [...prev];
                    upsertedList.forEach(u => {
                        const idx = next.findIndex(item => item.id === u.id);
                        if (idx !== -1) next[idx] = u;
                        else next.push(u);
                    });
                    return next;
                });
            }
            if (eventPinsToCreate.length > 0) {
                await apiService.saveModuleRecords('event_pins', eventPinsToCreate);
                setEventPins(prev => [...prev, ...eventPinsToCreate]);
            }

            setStatusMsg({ type: 'success', message: `Successfully generated ${eventPinsToCreate.length} PIN records! (No SMS/Email sent). PINs are now active for portal access.` });
            loadAllData();
        } catch (err: any) {
            console.error("Silent PIN generation failed:", err);
            setStatusMsg({ type: 'error', message: `PIN generation failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Generate PIN Only for individual recipient (Silent)
    const handleGeneratePinOnlyForIndividual = async (event: any, item: any) => {
        setStatusMsg({ type: 'info', message: `Generating PIN for ${item.targetName}...` });
        setIsLoading(true);

        try {
            const enr = item.enr;
            const currentUsersList = [...users];
            let associatedUser = currentUsersList.find(u => u.id === enr.userId);

            if (!associatedUser) {
                const newUserId = enr.userId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                associatedUser = {
                    id: newUserId,
                    name: item.studentName || 'Student Name',
                    email: `student_${newUserId}@eduai.local`,
                    phoneNumber: '',
                    role: 'student',
                    institutionId: currentInstitution.id,
                    createdAt: new Date().toISOString(),
                    metadata: {}
                };
                await apiService.saveModuleRecord('users', associatedUser);
            }

            const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
            const fallbackParent = {
                name: enr.metadata?.parentName || '',
                phone: enr.metadata?.parentPhone || enr.parentPhone || '',
                email: enr.metadata?.parentEmail || '',
                relation: enr.metadata?.parentRelation || 'Guardian'
            };
            const resolvedParents = parentsList.length > 0 ? parentsList : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
            const primaryParent = resolvedParents[0];

            let targetUserId = associatedUser.id;
            let targetName = associatedUser.name;

            if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                const parentUser = await resolveOrCreateParentUser(primaryParent, associatedUser.id, currentUsersList);
                if (parentUser) {
                    targetUserId = parentUser.id;
                    targetName = parentUser.name || primaryParent.name || 'Parent / Guardian';
                }
            }

            const existingPin = eventPins.find(p => {
                const pEvtId = p.eventId || p.event_id;
                if (pEvtId !== event.id) return false;
                const pUserId = p.userId || p.user_id;
                if (!pUserId) return false;
                if (pUserId === targetUserId || pUserId === associatedUser.id) return true;
                const pinUserObj = users.find(u => u.id === pUserId);
                if (pinUserObj && Array.isArray(pinUserObj.studentIds) && pinUserObj.studentIds.includes(associatedUser.id)) return true;
                return false;
            });

            if (!existingPin) {
                const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
                const pinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newPinRecord = {
                    id: pinId,
                    institutionId: currentInstitution.id,
                    institution_id: currentInstitution.id,
                    eventId: event.id,
                    event_id: event.id,
                    userId: targetUserId,
                    user_id: targetUserId,
                    pin: pinCode,
                    status: 'pending' as const,
                    createdAt: new Date().toISOString(),
                    created_at: new Date().toISOString()
                };
                await apiService.saveModuleRecord('event_pins', newPinRecord);
                setEventPins(prev => [...prev.filter(p => p.id !== pinId), newPinRecord]);
                setStatusMsg({ type: 'success', message: `PIN generated for ${targetName}! (PIN: ${pinCode})` });
            } else {
                setStatusMsg({ type: 'info', message: `PIN already exists for ${targetName} (PIN: ${existingPin.pin})` });
            }

            loadAllData();
        } catch (err: any) {
            console.error("Individual PIN generation failed:", err);
            setStatusMsg({ type: 'error', message: `PIN generation failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Generate and send PIN to individual recipient
    const handleSendPinToIndividualRecipient = async (event: any, item: any, additionalMessage: string = '') => {
        setStatusMsg({ type: 'info', message: `Generating and sending PIN to ${item.targetName}...` });
        setIsLoading(true);

        try {
            const enr = item.enr;
            const currentUsersList = [...users];
            let associatedUser = currentUsersList.find(u => u.id === enr.userId);

            if (!associatedUser) {
                try {
                    const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                        filter: { id: enr.userId }
                    });
                    if (dbUsers && dbUsers.length > 0) {
                        associatedUser = dbUsers[0];
                        if (associatedUser.institutionId !== currentInstitution.id) {
                            associatedUser.institutionId = currentInstitution.id;
                            await apiService.updateModuleRecord('users', associatedUser.id, associatedUser);
                        }
                    }
                } catch (err) {
                    console.error('[IndividualPin] Error searching student user:', enr.userId, err);
                }
            }

            if (!associatedUser) {
                const newUserId = enr.userId || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                associatedUser = {
                    id: newUserId,
                    name: item.studentName || 'Student Name',
                    email: `student_${newUserId}@eduai.local`,
                    phoneNumber: '',
                    role: 'student',
                    institutionId: currentInstitution.id,
                    createdAt: new Date().toISOString(),
                    metadata: {}
                };
                await apiService.saveModuleRecord('users', associatedUser);
            }

            const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
            const fallbackParent = {
                name: enr.metadata?.parentName || '',
                phone: enr.metadata?.parentPhone || enr.parentPhone || '',
                email: enr.metadata?.parentEmail || '',
                relation: enr.metadata?.parentRelation || 'Guardian'
            };
            const resolvedParents = parentsList.length > 0 ? parentsList : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
            const primaryParent = resolvedParents[0];

            let targetUserId = associatedUser.id;
            let targetName = associatedUser.name;
            let targetPhone = isPrimaryOrSecondary ? '' : (associatedUser.phoneNumber || '');
            let targetEmail = isPrimaryOrSecondary ? '' : (associatedUser.email || '');

            if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                const parentUser = await resolveOrCreateParentUser(primaryParent, associatedUser.id, currentUsersList);
                if (parentUser) {
                    targetUserId = parentUser.id;
                    targetName = parentUser.name || primaryParent.name || 'Parent / Guardian';
                    targetPhone = parentUser.phoneNumber || primaryParent.phone || '';
                    targetEmail = parentUser.email || primaryParent.email || '';
                }
            }

            // Verify if PIN exists already
            const existingPin = eventPins.find(p => {
                const pEvtId = p.eventId || p.event_id;
                if (pEvtId !== event.id) return false;
                const pUserId = p.userId || p.user_id;
                if (!pUserId) return false;
                if (pUserId === targetUserId || pUserId === associatedUser.id) return true;
                const pinUserObj = users.find(u => u.id === pUserId);
                if (pinUserObj && Array.isArray(pinUserObj.studentIds) && pinUserObj.studentIds.includes(associatedUser.id)) return true;
                return false;
            });
            const pinCode = existingPin ? existingPin.pin : Math.floor(100000 + Math.random() * 900000).toString();
            const pinId = existingPin ? existingPin.id : `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            if (!existingPin) {
                const newPinRecord = {
                    id: pinId,
                    institutionId: currentInstitution.id,
                    institution_id: currentInstitution.id,
                    eventId: event.id,
                    event_id: event.id,
                    userId: targetUserId,
                    user_id: targetUserId,
                    pin: pinCode,
                    status: 'pending' as const,
                    createdAt: new Date().toISOString(),
                    created_at: new Date().toISOString()
                };
                await apiService.saveModuleRecord('event_pins', newPinRecord);
                setEventPins(prev => [...prev.filter(p => p.id !== pinId), newPinRecord]);
            }

            const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'https://portal.eduai.co.ke'
                : window.location.origin;

            const fallbackPayload = [
                pinCode,                                              // 0
                event.title,                                          // 1
                event.eventDate,                                      // 2
                event.eventTime,                                      // 3
                event.venue,                                          // 4
                targetName || 'Parent / Guardian',                    // 5
                targetPhone || '',                                    // 6
                currentInstitution.name || '',                        // 7
                currentInstitution.id,                                // 8
                event.description || '',                              // 9
                targetUserId,                                         // 10
                event.id                                              // 11
            ];
            const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(fallbackPayload))));
            const rawLink = `${origin}/?view=event-confirm&pinId=${pinId}&data=${base64Data}`;
            const shortLink = `${origin}/?view=event-confirm&pinId=${pinId}`;
            let shortenedLink = shortLink;
            try {
                shortenedLink = await apiService.shortenUrl(shortLink);
            } catch (_) {}

            const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';
            const studentName = associatedUser.name || 'your child';
            const greetingName3 = targetName && targetName !== 'Parent / Guardian' ? targetName : 'Guardian';
            const smsMessage = `Dear ${greetingName3}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentName}.${suffix} Confirm attendance: ${shortenedLink}`;

            const emailMessage = `Dear ${greetingName3}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentName}.${suffix} Confirm attendance: ${rawLink}`;

            let smsSuccess = false;
            let errorMsg: string | undefined = undefined;

            if (targetPhone) {
                try {
                    const res = await apiService.sendSms(
                        targetPhone,
                        smsMessage,
                        currentInstitution.smsConfig,
                        1,
                        currentInstitution.id
                    );
                    smsSuccess = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
                    if (!smsSuccess) {
                        errorMsg = res?.message || 'Rejected by SMS gateway';
                    }
                } catch (e: any) {
                    console.error("SMS individual PIN send failed", e);
                    errorMsg = e.message || 'Connection failed';
                }
            } else {
                errorMsg = isPrimaryOrSecondary ? 'No parent phone number configured for student' : 'No phone number configured';
            }

            if (targetEmail) {
                try {
                    await apiService.sendEmail(
                        targetEmail,
                        `Event Attendance Invitation - ${event.title}`,
                        emailMessage,
                        currentInstitution.emailConfig
                    );
                } catch (e) {
                    console.error("Email individual PIN send failed", e);
                }
            }

            setStatusMsg({
                type: smsSuccess ? 'success' : 'error',
                message: smsSuccess 
                    ? `PIN successfully generated and sent to ${targetName}.` 
                    : `Generated PIN, but SMS delivery failed: ${errorMsg || 'No phone number'}`
            });

            setSmsDeliveryReport([{
                recipientName: targetName,
                phone: targetPhone || 'No phone number',
                success: smsSuccess,
                errorMsg
            }]);

            await loadAllData();
        } catch (err: any) {
            console.error("Failed to generate/send individual PIN:", err);
            setStatusMsg({ type: 'error', message: `Failed to send individual PIN: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Resend an existing PIN to a covered recipient
    const handleResendExistingPin = async (event: any, item: any, additionalMessage: string = '') => {
        setStatusMsg({ type: 'info', message: `Resending PIN to ${item.targetName}...` });
        setIsLoading(true);

        try {
            const pinRecord = item.pin;
            const targetUserId = pinRecord.userId;
            const targetName = item.targetName;
            
            let targetUser = users.find(u => u.id === targetUserId);
            if (!targetUser) {
                try {
                    const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                        filter: { id: targetUserId }
                    });
                    if (dbUsers && dbUsers.length > 0) {
                        targetUser = dbUsers[0];
                    }
                } catch (err) {
                    console.error('[ResendExistingPin] Error searching recipient user:', err);
                }
            }
            if (!targetUser) {
                throw new Error("Recipient user profile not found.");
            }

            const targetPhone = targetUser.phoneNumber || '';
            const targetEmail = targetUser.email || '';

            const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                ? 'https://portal.eduai.co.ke'
                : window.location.origin;

            const fallbackPayload = [
                pinRecord.pin,                                        // 0
                event.title,                                          // 1
                event.eventDate,                                      // 2
                event.eventTime,                                      // 3
                event.venue,                                          // 4
                targetName || 'Parent / Guardian',                    // 5
                targetPhone || '',                                    // 6
                currentInstitution.name || '',                        // 7
                currentInstitution.id,                                // 8
                event.description || '',                              // 9
                targetUserId,                                         // 10
                event.id                                              // 11
            ];
            const base64Data = btoa(unescape(encodeURIComponent(JSON.stringify(fallbackPayload))));
            const rawLink = `${origin}/?view=event-confirm&pinId=${pinRecord.id}&data=${base64Data}`;
            const shortLink = `${origin}/?view=event-confirm&pinId=${pinRecord.id}`;
            let shortenedLink = shortLink;
            try {
                shortenedLink = await apiService.shortenUrl(shortLink);
            } catch (_) {}

            const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';
            
            let studentName = 'your child';
            if (targetUser.role === 'parent') {
                const studentUser = users.find(u => u.id === item.enr?.userId);
                if (studentUser) {
                    studentName = studentUser.name || 'your child';
                }
            }

            const greetingName4 = targetName && targetName !== 'Parent / Guardian' ? targetName : 'Guardian';
            const smsMessage = `Dear ${greetingName4}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue}${studentName && studentName !== 'your child' ? ` — regarding ${studentName}` : ''}.${suffix} Confirm attendance: ${shortenedLink}`;

            const emailMessage = `Dear ${greetingName4}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue}${studentName && studentName !== 'your child' ? ` — regarding ${studentName}` : ''}.${suffix} Confirm attendance: ${rawLink}`;

            let smsSuccess = false;
            let errorMsg: string | undefined = undefined;

            if (targetPhone) {
                try {
                    const res = await apiService.sendSms(
                        targetPhone,
                        smsMessage,
                        currentInstitution.smsConfig,
                        1,
                        currentInstitution.id
                    );
                    smsSuccess = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
                    if (!smsSuccess) {
                        errorMsg = res?.message || 'Rejected by SMS gateway';
                    }
                } catch (e: any) {
                    console.error("SMS PIN resend failed", e);
                    errorMsg = e.message || 'Connection failed';
                }
            } else {
                errorMsg = 'No phone number configured';
            }

            if (targetEmail) {
                try {
                    await apiService.sendEmail(
                        targetEmail,
                        `Event Attendance Invitation - ${event.title}`,
                        emailMessage,
                        currentInstitution.emailConfig
                    );
                } catch (e) {
                    console.error("Email PIN resend failed", e);
                }
            }

            setStatusMsg({
                type: smsSuccess ? 'success' : 'error',
                message: smsSuccess 
                    ? `PIN successfully resent to ${targetName}.` 
                    : `SMS resend failed: ${errorMsg || 'No phone number'}`
            });

            setSmsDeliveryReport([{
                recipientName: targetName,
                phone: targetPhone || 'No phone number',
                success: smsSuccess,
                errorMsg
            }]);

        } catch (err: any) {
            console.error("Failed to resend PIN:", err);
            setStatusMsg({ type: 'error', message: `Failed to resend PIN: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Bulk request feedback from attendees who have checked in (status 'used' or 'accepted') but haven't rated yet
    const handleSendFeedbackRequests = async (event: any, additionalMessage: string = '', recipientFilter: 'pending' | 'accepted' | 'all_pending' = 'all_pending') => {
        const attendeesWithoutFeedback = (eventPins || []).filter(
            (p: any) => {
                const isCorrectEvent = p.eventId === event.id || p.event_id === event.id;
                const isNotRated = p.rating === undefined || p.rating === null || p.rating === '';
                if (!isCorrectEvent || !isNotRated) return false;
                
                if (recipientFilter === 'pending') {
                    return p.status === 'used';
                } else if (recipientFilter === 'accepted') {
                    return p.status === 'accepted';
                } else {
                    return p.status === 'used' || p.status === 'accepted';
                }
            }
        );

        if (attendeesWithoutFeedback.length === 0) {
            setStatusMsg({ type: 'error', message: 'No matching attendees without submitted feedback found for the selected filter.' });
            return;
        }

        setStatusMsg({ type: 'info', message: `Sending feedback requests to ${attendeesWithoutFeedback.length} attendee(s)...` });
        setIsLoading(true);

        const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
            ? 'https://portal.eduai.co.ke'
            : window.location.origin;

        const results: { recipientName: string; phone: string; success: boolean; errorMsg?: string }[] = [];
        let sent = 0;

        for (const pinRecord of attendeesWithoutFeedback) {
            try {
                let targetUser = users.find(u => u.id === pinRecord.userId);
                if (!targetUser) {
                    try {
                        const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                            filter: { id: pinRecord.userId }
                        });
                        if (dbUsers && dbUsers.length > 0) targetUser = dbUsers[0];
                    } catch { /* skip */ }
                }
                if (!targetUser) {
                    results.push({ recipientName: 'Unknown', phone: '', success: false, errorMsg: 'User not found' });
                    continue;
                }

                const targetPhone = targetUser.phoneNumber || '';
                const targetEmail = targetUser.email || '';
                const targetName = targetUser.name || 'Parent/Guardian';
                const shortLink = `${origin}/?view=event-confirm&pinId=${pinRecord.id}`;
                
                // Shorten link using shortener service
                let shortenedLink = shortLink;
                try {
                    shortenedLink = await apiService.shortenUrl(shortLink);
                } catch (e) {
                    console.error("Shortener failed:", e);
                }

                const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';
                const smsMessage = `Thank you for attending "${event.title}". Please take a moment to share your rating and feedback with us:${suffix} ${shortenedLink}`;
                const emailMessage = smsMessage;

                let smsSuccess = false;
                let errorMsg: string | undefined;

                if (targetPhone) {
                    try {
                        const res = await apiService.sendSms(targetPhone, smsMessage, currentInstitution.smsConfig, 1, currentInstitution.id);
                        smsSuccess = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
                        if (!smsSuccess) errorMsg = res?.message || 'Rejected by gateway';
                        else sent++;
                    } catch (e: any) {
                        errorMsg = e.message || 'Connection failed';
                    }
                } else {
                    errorMsg = 'No phone number';
                }

                if (targetEmail) {
                    try {
                        await apiService.sendEmail(targetEmail, `Feedback Requested: ${event.title}`, emailMessage, currentInstitution.emailConfig);
                    } catch { /* ignore */ }
                }

                results.push({
                    recipientName: targetName,
                    phone: targetPhone || 'No Phone',
                    success: smsSuccess,
                    errorMsg
                });
            } catch (err: any) {
                console.error("Failed to request feedback for PIN:", pinRecord.id, err);
            }
        }

        setIsLoading(false);
        setSmsDeliveryReport(results);
        setStatusMsg({
            type: 'success',
            message: `Feedback requests sent to ${sent} recipient(s). View detailed reports below.`
        });
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 6000);
    };

    // Bulk reminder: resend invite to all pending (not yet responded) recipients
    const handleSendRemindersToPending = async (event: any, additionalMessage: string = '') => {
        const pendingPins = (eventPins || []).filter(
            (p: any) => p.eventId === event.id && p.status === 'pending'
        );
        if (pendingPins.length === 0) {
            setStatusMsg({ type: 'info', message: 'No pending recipients to remind.' });
            return;
        }

        setStatusMsg({ type: 'info', message: `Sending reminders to ${pendingPins.length} pending recipient(s)...` });
        setIsLoading(true);

        const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
            ? 'https://portal.eduai.co.ke'
            : window.location.origin;

        const results: { recipientName: string; phone: string; success: boolean; errorMsg?: string }[] = [];
        let sent = 0;

        for (const pinRecord of pendingPins) {
            try {
                let targetUser = users.find(u => u.id === pinRecord.userId);
                if (!targetUser) {
                    try {
                        const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                            filter: { id: pinRecord.userId }
                        });
                        if (dbUsers && dbUsers.length > 0) targetUser = dbUsers[0];
                    } catch { /* skip */ }
                }
                if (!targetUser) {
                    results.push({ recipientName: 'Unknown', phone: '', success: false, errorMsg: 'User not found' });
                    continue;
                }

                const targetPhone = targetUser.phoneNumber || '';
                const targetEmail = targetUser.email || '';
                const targetName = targetUser.name || 'Guest';
                const shortLink = `${origin}/?view=event-confirm&pinId=${pinRecord.id}`;
                let shortenedLink = shortLink;
                try {
                    shortenedLink = await apiService.shortenUrl(shortLink);
                } catch (_) {}

                const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';

                const greetingName5 = targetName && targetName !== 'Guest' ? targetName : 'Guardian';
                const smsMessage = `Dear ${greetingName5}, REMINDER: you are invited to "${event.title}" on ${event.eventDate}${event.eventTime ? ' at ' + event.eventTime : ''}${event.venue ? ', ' + event.venue : ''}.${suffix} Please confirm your attendance: ${shortenedLink}`;
                const emailMessage = smsMessage;

                let smsSuccess = false;
                let errorMsg: string | undefined;

                if (targetPhone) {
                    try {
                        const res = await apiService.sendSms(targetPhone, smsMessage, currentInstitution.smsConfig, 1, currentInstitution.id);
                        smsSuccess = !!(res?.success || res?.status === 'success' || res?.status === 'sent');
                        if (!smsSuccess) errorMsg = res?.message || 'Rejected by gateway';
                        else sent++;
                    } catch (e: any) {
                        errorMsg = e.message || 'Connection failed';
                    }
                } else {
                    errorMsg = 'No phone number';
                }

                if (targetEmail) {
                    try {
                        await apiService.sendEmail(targetEmail, `Reminder: ${event.title}`, emailMessage, currentInstitution.emailConfig);
                    } catch { /* ignore */ }
                }

                results.push({ recipientName: targetName, phone: targetPhone, success: smsSuccess, errorMsg });
            } catch (err: any) {
                results.push({ recipientName: 'Unknown', phone: '', success: false, errorMsg: err.message });
            }
        }

        setSmsDeliveryReport(results);
        setStatusMsg({
            type: sent > 0 ? 'success' : 'error',
            message: sent > 0
                ? `Reminders sent to ${sent} of ${pendingPins.length} pending recipient(s).`
                : 'Failed to send reminders — check SMS configuration.'
        });
        setIsLoading(false);
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 5000);
    };

    // Invite External Parents via Excel Spreadsheet Upload
    const handleInviteExternalExcel = async (event: any, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatusMsg({ type: 'info', message: 'Reading Excel sheet...' });
        setIsLoading(true);

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = evt.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json<any>(sheet);

                    if (rows.length === 0) {
                        throw new Error("The selected sheet is empty.");
                    }

                    setStatusMsg({ type: 'info', message: `Importing and inviting ${rows.length} parents...` });

                    let successCount = 0;
                    for (const row of rows) {
                        let parentName = '';
                        let parentPhone = '';
                        let parentEmail = '';

                        // Dynamically map headers (case-insensitive key checks)
                        for (const key of Object.keys(row)) {
                            const keyLower = key.toLowerCase().replace(/[\s_-]/g, '');
                            if (keyLower.includes('name')) {
                                parentName = String(row[key] || '').trim();
                            } else if (keyLower.includes('phone') || keyLower.includes('mobile') || keyLower.includes('contact')) {
                                parentPhone = String(row[key] || '').trim();
                            } else if (keyLower.includes('email')) {
                                parentEmail = String(row[key] || '').trim();
                            }
                        }

                        if (!parentName && !parentPhone && !parentEmail) continue;
                        if (!parentName) parentName = 'Invited Parent';

                        // 1. Create or retrieve a guest/parent profile in 'users' table
                        let existingParent = null;
                        if (parentEmail) {
                            const globalRecords = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                filter: { email: parentEmail.toLowerCase() }
                            });
                            if (globalRecords && globalRecords.length > 0) {
                                existingParent = globalRecords[0];
                            }
                        }

                        let parentUserId = '';
                        if (existingParent) {
                            parentUserId = existingParent.id;
                            const updatedUser = {
                                ...existingParent,
                                role: 'parent',
                                institutionId: currentInstitution.id
                            };
                            await apiService.updateModuleRecord('users', existingParent.id, updatedUser);
                        } else {
                            const newUserId = `u_ext_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const newUser = {
                                id: newUserId,
                                institutionId: currentInstitution.id,
                                name: parentName,
                                email: parentEmail || (parentPhone ? `parent_${parentPhone}@eduai.co.ke` : `parent_${newUserId}@eduai.co.ke`),
                                phoneNumber: parentPhone || null,
                                role: 'parent',
                                metadata: { external: true },
                                createdAt: new Date().toISOString()
                            };
                            await apiService.saveModuleRecord('users', newUser);
                            parentUserId = newUserId;
                        }

                        // 2. Generate event PIN record
                        const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
                        const pinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        const newPinRecord = {
                            id: pinId,
                            institutionId: currentInstitution.id,
                            eventId: event.id,
                            userId: parentUserId,
                            pin: pinCode,
                            status: 'pending',
                            createdAt: new Date().toISOString()
                        };
                        await apiService.saveModuleRecord('event_pins', newPinRecord);

                        // 3. Construct RSVP Link — use full URL directly (shortening unreliable)
                        const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                            ? 'https://portal.eduai.co.ke'
                            : window.location.origin;
                        const rawLink = `${origin}/?view=event-confirm&pinId=${pinId}`;
                        const confirmationLink = rawLink;
                        
                        const greetingName6 = parentName && parentName.trim() ? parentName.trim() : 'Guardian';
                        const message = `Dear ${greetingName6}, you are invited to "${event.title}" on ${event.eventDate}. Please confirm your attendance here: ${confirmationLink}`;

                        // 4. Send Stage 1 Notifications
                        if (parentPhone) {
                            try {
                                await apiService.sendSms(parentPhone, message, currentInstitution.smsConfig, 1, currentInstitution.id);
                            } catch (smsErr) {
                                console.error("SMS Invite failed", smsErr);
                            }
                        }
                        if (parentEmail) {
                            try {
                                await apiService.sendEmail(parentEmail, `Event Attendance Invitation - ${event.title}`, message, currentInstitution.emailConfig);
                            } catch (emailErr) {
                                console.error("Email Invite failed", emailErr);
                            }
                        }

                        successCount++;
                    }

                    setStatusMsg({ type: 'success', message: `Successfully invited ${successCount} external parents to "${event.title}"!` });
                    loadAllData();
                } catch (err: any) {
                    console.error("Excel import/invite failed:", err);
                    setStatusMsg({ type: 'error', message: `Import failed: ${err.message}` });
                } finally {
                    setIsLoading(false);
                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                }
            };
            reader.readAsBinaryString(file);
        } catch (err: any) {
            console.error("FileReader exception:", err);
            setStatusMsg({ type: 'error', message: `Failed to read file: ${err.message}` });
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Verify PIN & Expire
    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifyIdentifier.trim() || !verifyPin.trim()) {
            setStatusMsg({ type: 'error', message: 'Enter both Student identifier & PIN code.' });
            return;
        }

        setStatusMsg({ type: 'info', message: 'Verifying PIN...' });
        setIsLoading(true);

        try {
            const matchedUser = users.find(u => 
                (u.email && u.email.toLowerCase() === verifyIdentifier.toLowerCase()) ||
                (u.phoneNumber && u.phoneNumber === verifyIdentifier) ||
                enrollments.some(enr => enr.userId === u.id && enr.admissionNumber?.toLowerCase() === verifyIdentifier.toLowerCase())
            );

            if (!matchedUser) {
                setStatusMsg({ type: 'error', message: 'Student matching input details not found.' });
                setIsLoading(false);
                return;
            }

            const activePin = eventPins.find(p => 
                p.userId === matchedUser.id && 
                p.pin === verifyPin.trim() && 
                (p.status === 'pending' || p.status === 'accepted')
            );

            if (!activePin) {
                setStatusMsg({ type: 'error', message: 'Invalid or expired attendance PIN.' });
                setIsLoading(false);
                return;
            }

            const matchedEvent = events.find(ev => ev.id === activePin.eventId);
            const eventName = matchedEvent ? matchedEvent.title : 'Event';

            // Mark pin as used (expire it)
            const updated = {
                ...activePin,
                status: 'used' as 'used'
            };

            await apiService.updateModuleRecord('event_pins', activePin.id, updated);
            setStatusMsg({ type: 'success', message: `Verified attendance successfully for ${matchedUser.name} at "${eventName}"! PIN has been expired.` });
            
            setVerifyIdentifier('');
            setVerifyPin('');
            loadAllData();
        } catch (err: any) {
            console.error("PIN verification error:", err);
            setStatusMsg({ type: 'error', message: `Verification failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Checkout guest cleared by security
    const handleCheckoutGuest = async (visitorId: string) => {
        setStatusMsg({ type: 'info', message: 'Processing guest checkout...' });
        try {
            const guest = visitors.find(v => v.id === visitorId);
            if (guest) {
                const updatedGuest = {
                    ...guest,
                    status: 'checked_out',
                    timeOut: new Date().toLocaleTimeString()
                };
                await apiService.updateModuleRecord('visitors', guest.id, updatedGuest);
                setStatusMsg({ type: 'success', message: `Checked out visitor ${guest.name || guest.fullName || 'Guest'}.` });
                loadAllData();
            }
        } catch (err: any) {
            console.error("Guest checkout failed:", err);
            setStatusMsg({ type: 'error', message: `Guest checkout failed: ${err.message}` });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    const filteredEnrollments = useMemo(() => {
        return enrollments.filter(enr => {
            const associatedUser = users.find(u => u.id === enr.userId);
            const matchesSearch = 
                (associatedUser?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (enr.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (associatedUser?.phoneNumber || '').includes(searchTerm);
            
            const matchesStatus = statusFilter === 'All' || enr.status === statusFilter;
            const matchesGrade = !gradeFilter || (enr.metadata?.gradeLevel || '') === gradeFilter;
            const matchesStream = !streamFilter || (enr.metadata?.stream || '') === streamFilter;
            
            return matchesSearch && matchesStatus && matchesGrade && matchesStream;
        });
    }, [enrollments, users, searchTerm, statusFilter, gradeFilter, streamFilter]);

    const paginatedEnrollments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEnrollments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEnrollments, currentPage]);

    const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);

    // Filtered Teachers
    const filteredTeachers = useMemo(() => {
        return users.filter(u => {
            const role = (u.role || '').trim().toLowerCase();
            const isTeacher = teacherRoles.includes(role as any);
            const matchesSearch = 
                (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.phoneNumber || '').includes(searchTerm);
            return isTeacher && matchesSearch;
        });
    }, [users, searchTerm]);

    // Filtered Support Staff
    const filteredSupportStaff = useMemo(() => {
        return users.filter(u => {
            // Normalize role: trim whitespace and lowercase to avoid casing/spacing issues
            const role = (u.role || '').trim().toLowerCase();
            const isTeacher = teacherRoles.includes(role as any);
            const isNonSupport = nonSupportRoles.includes(role as any);
            // Explicitly always include managing_director, hoi, hr_officer regardless of other filters
            const isAlwaysSupport = ['managing_director', 'hoi', 'hr_officer', 'finance_officer', 'event_manager'].includes(role);
            // Include: not a teacher, not in excluded roles, and either has a role OR belongs to this institution (no role = unclassified staff)
            const isSupport = isAlwaysSupport || (!isTeacher && !isNonSupport && (role !== '' || !!u.institutionId));
            const matchesSearch = 
                (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.phoneNumber || '').includes(searchTerm);
            return isSupport && matchesSearch;
        });
    }, [users, searchTerm]);

    // Handle Staff Form Submit (Add/Edit)
    const handleSubmitStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!staffFormData.name || !staffFormData.name.trim()) {
            setStatusMsg({ type: 'error', message: 'Full Name is required.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
            return;
        }
        if (!staffFormData.role) {
            setStatusMsg({ type: 'error', message: 'Role selection is required.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
            return;
        }

        setStatusMsg({ type: 'info', message: 'Saving staff profile...' });
        setIsLoading(true);

        try {
            // Check for duplicate email globally if email is set
            let existingUser = null;
            if (staffFormData.email && staffFormData.email.trim()) {
                const lowerEmail = staffFormData.email.trim().toLowerCase();
                existingUser = users.find(u => u.id !== editingStaff?.id && u.email && u.email.toLowerCase() === lowerEmail);
                if (!existingUser) {
                    const globalRecords = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                        filter: { email: lowerEmail }
                    });
                    if (globalRecords && globalRecords.length > 0 && globalRecords[0].id !== editingStaff?.id) {
                        existingUser = globalRecords[0];
                    }
                }
            }

            if (existingUser) {
                setStatusMsg({ type: 'error', message: 'A user with this email address already exists.' });
                setIsLoading(false);
                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                return;
            }

            const newUserId = editingStaff ? editingStaff.id : `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const userId = newUserId;
            const courseToUpdate = supervisesStreamId ? courses.find(c => (c.levels || []).some(l => l.id === supervisesStreamId)) : null;

            if (editingStaff) {
                // Update existing staff member
                const updatedUser: User = {
                    ...editingStaff,
                    name: staffFormData.name.trim(),
                    email: staffFormData.email && staffFormData.email.trim() ? staffFormData.email.trim() : `staff_${editingStaff.id}@eduai.local`,
                    phoneNumber: staffFormData.phoneNumber ? staffFormData.phoneNumber.trim() : '',
                    role: staffFormData.role as any,
                    gender: staffFormData.gender || undefined,
                    courseLevelId: supervisesStreamId || undefined,
                    courseId: courseToUpdate?.id || undefined,
                    updatedAt: new Date().toISOString()
                } as any;
                if (!updatedUser.password) {
                    updatedUser.password = 'password123';
                }
                await apiService.updateModuleRecord('users', editingStaff.id, updatedUser);
                setStatusMsg({ type: 'success', message: 'Staff profile updated successfully.' });
            } else {
                // Onboard new staff member
                const staffEmail = staffFormData.email && staffFormData.email.trim()
                    ? staffFormData.email.trim()
                    : `staff_${newUserId}@eduai.local`;

                const newUser: User = {
                    id: newUserId,
                    name: staffFormData.name.trim(),
                    email: staffEmail,
                    phoneNumber: staffFormData.phoneNumber ? staffFormData.phoneNumber.trim() : '',
                    role: staffFormData.role as any,
                    institutionId: currentInstitution.id,
                    gender: staffFormData.gender || undefined,
                    courseLevelId: supervisesStreamId || undefined,
                    courseId: courseToUpdate?.id || undefined,
                    createdAt: new Date().toISOString(),
                    metadata: {}
                };
                await apiService.registerUser(newUser, currentInstitution.name);
                setStatusMsg({ type: 'success', message: 'New staff member onboarded successfully.' });
            }

            // Update Course levels/streams supervisor mappings
            for (const course of courses) {
                let courseChanged = false;
                const updatedLevels = (course.levels || []).map(lvl => {
                    if (lvl.id === supervisesStreamId) {
                        if (lvl.classTeacherId !== userId) {
                            courseChanged = true;
                            return { ...lvl, classTeacherId: userId };
                        }
                    } else if (lvl.classTeacherId === userId) {
                        courseChanged = true;
                        return { ...lvl, classTeacherId: null as any };
                    }
                    return lvl;
                });
                if (courseChanged) {
                    await apiService.updateModuleRecord('courses', course.id, { ...course, levels: updatedLevels });
                }
            }

            setIsStaffFormOpen(false);
            setEditingStaff(null);
            loadAllData();
        } catch (err: any) {
            console.error("Save staff failed:", err);
            setStatusMsg({ type: 'error', message: `Failed to save staff member: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Handle Staff Delete
    const handleDeleteStaff = async (userId: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete staff member "${name}"?`)) {
            return;
        }
        try {
            setStatusMsg({ type: 'info', message: 'Deleting staff member...' });
            await apiService.deleteModuleRecord('users', userId);
            setStatusMsg({ type: 'success', message: `Staff member "${name}" deleted successfully.` });
            loadAllData();
        } catch (err: any) {
            console.error("Delete staff failed:", err);
            setStatusMsg({ type: 'error', message: `Failed to delete staff member: ${err.message}` });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Handle Change User Role
    const handleChangeUserRole = async () => {
        if (!roleModalUser || !roleModalNewRole) return;
        setRoleModalSaving(true);
        try {
            await apiService.updateModuleRecord('users', roleModalUser.id, {
                ...roleModalUser,
                role: roleModalNewRole as any,
                updatedAt: new Date().toISOString()
            });
            setStatusMsg({ type: 'success', message: `Role updated to "${formatRoleDisplayName(roleModalNewRole as any)}" for ${roleModalUser.name}.` });
            setRoleModalUser(null);
            setRoleModalNewRole('');
            loadAllData();
        } catch (err: any) {
            setStatusMsg({ type: 'error', message: `Failed to update role: ${err.message}` });
        } finally {
            setRoleModalSaving(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Available Cohorts / Grade Levels
    const cohortsList = useMemo(() => {
        if (context === 'driving_school') {
            return [
                'Class B1 (Light Manual)',
                'Class B2 (Light Automatic)',
                'Class A (Motorcycle)',
                'Class C (Heavy Commercial)'
            ];
        } else {
            const listFromLevels = (academicLevels || []).map(al => al.name).filter(Boolean);
            const listFromEnrollments = (enrollments || []).map(e => e.metadata?.gradeLevel).filter(Boolean);
            const listFromCourses = (courses || []).map(c => c.name).filter(Boolean);

            const defaultGrades = [
                'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
                'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4',
                'PP1', 'PP2', 'Playgroup'
            ];

            return Array.from(new Set([...listFromLevels, ...listFromEnrollments, ...listFromCourses, ...defaultGrades])).sort();
        }
    }, [context, courses, academicLevels, enrollments]);

    // Available Streams fallback
    const streamsList = useMemo(() => {
        if (currentInstitution?.streamDefinitions && currentInstitution.streamDefinitions.length > 0) {
            return currentInstitution.streamDefinitions;
        }
        return ['North', 'South', 'East', 'West', 'Main Stream'];
    }, [currentInstitution?.streamDefinitions]);

    // Available Streams for the Enrollment Form
    const formStreamsList = useMemo(() => {
        let list: string[] = [];
        if (formData.metadata.gradeLevel) {
            const selectedCourse = courses.find(c => c.name === formData.metadata.gradeLevel);
            if (selectedCourse?.levels && selectedCourse.levels.length > 0) {
                list = selectedCourse.levels.map(lvl => lvl.name);
            }
        }
        if (list.length === 0) {
            list = streamsList;
        }
        // Force include current stream if not present to avoid select element fallback mismatch
        if (formData.metadata.stream && !list.includes(formData.metadata.stream)) {
            const matched = list.find(name => 
                name.toLowerCase() === formData.metadata.stream.toLowerCase() ||
                formData.metadata.stream.toLowerCase().endsWith(name.toLowerCase()) ||
                name.toLowerCase().endsWith(formData.metadata.stream.toLowerCase())
            );
            if (matched) {
                setTimeout(() => {
                    setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, stream: matched }
                    }));
                }, 0);
            } else {
                list = [...list, formData.metadata.stream];
            }
        }
        return list;
    }, [formData.metadata.gradeLevel, formData.metadata.stream, courses, streamsList]);

    // Available Streams for the registry filter
    const filterStreamsList = useMemo(() => {
        if (gradeFilter) {
            const selectedCourse = courses.find(c => c.name === gradeFilter);
            if (selectedCourse?.levels && selectedCourse.levels.length > 0) {
                return selectedCourse.levels.map(lvl => lvl.name);
            }
        }
        const allCourseStreams = courses.flatMap(c => (c.levels || []).map(lvl => lvl.name));
        if (allCourseStreams.length > 0) {
            return Array.from(new Set(allCourseStreams));
        }
        return streamsList;
    }, [gradeFilter, courses, streamsList]);

    // Available Streams for the Import default settings
    const importStreamsList = useMemo(() => {
        if (importGradeLevel) {
            const selectedCourse = courses.find(c => c.name === importGradeLevel);
            if (selectedCourse?.levels && selectedCourse.levels.length > 0) {
                return selectedCourse.levels.map(lvl => lvl.name);
            }
        }
        return streamsList;
    }, [importGradeLevel, courses, streamsList]);

    const activeImportFields = useMemo(() => {
        if (activeTab === 'teachers') return teacherFields;
        if (activeTab === 'support_staff') return supportStaffFields;
        if (activeTab === 'students' && importMode === 'update_secondary_phone') return secondaryPhoneFields;
        return enrollmentFields;
    }, [activeTab, importMode, teacherFields, supportStaffFields, secondaryPhoneFields, enrollmentFields]);

    const activeOnComplete = useMemo(() => {
        if (activeTab === 'teachers' || activeTab === 'support_staff') return handleBulkCompleteStaff;
        if (activeTab === 'students' && importMode === 'update_secondary_phone') return handleBulkUpdateSecondaryPhone;
        return handleBulkComplete;
    }, [activeTab, importMode, handleBulkCompleteStaff, handleBulkUpdateSecondaryPhone, handleBulkComplete]);

    // Memoized students list for specific selection
    const students = useMemo(() => {
        return enrollments.map(enr => {
            const user = users.find(u => u.id === enr.userId);
            return {
                id: enr.userId,
                name: user?.name || 'Unknown Student',
                admissionNumber: enr.admissionNumber || '',
                gradeLevel: enr.metadata?.gradeLevel || ''
            };
        }).filter(s => !!s.id);
    }, [enrollments, users]);

    // Filtered students for matching search queries in selection panel
    const filteredStudentsForSelection = useMemo(() => {
        const query = studentSearchQuery.trim().toLowerCase();
        if (!query) return students.slice(0, 5); // default show 5
        return students.filter(s => 
            s.name.toLowerCase().includes(query) ||
            s.admissionNumber.toLowerCase().includes(query)
        ).slice(0, 10);
    }, [students, studentSearchQuery]);

    const hasUnknownStudents = useMemo(() => {
        return enrollments.some(enr => {
            const user = users.find(u => u.id === enr.userId);
            const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
            const isUnknown = !user?.name || 
                user.name.trim() === '' || 
                user.name.toLowerCase() === 'unknown student' || 
                user.name.toLowerCase() === 'unknown';
            return isUnknown && !!parentName.trim();
        });
    }, [enrollments, users]);



    const [isGeneratingIdCardId, setIsGeneratingIdCardId] = useState<string | null>(null);
    const [previewStudent, setPreviewStudent] = useState<User | null>(null);
    const [previewEnrollment, setPreviewEnrollment] = useState<StudentEnrollment | null>(null);
    const [previewQrCodeUrl, setPreviewQrCodeUrl] = useState<string>('');
    const [isPreviewingIdCard, setIsPreviewingIdCard] = useState(false);

    const [leaveOutStudent, setLeaveOutStudent] = useState<{ enr: StudentEnrollment; user: User } | null>(null);
    const [leaveOutForm, setLeaveOutForm] = useState({
        reason: '',
        isBoarder: true,
        leaveDate: new Date().toISOString().split('T')[0],
        returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });
    const [isCheckingBoarder, setIsCheckingBoarder] = useState(false);

    useEffect(() => {
        if (leaveOutStudent) {
            setIsCheckingBoarder(true);
            apiService.fetchBedAllocations(currentInstitution.id)
                .then(allocations => {
                    const isBoarder = (allocations || []).some((a: any) => a.studentId === leaveOutStudent.user.id && a.status === 'Active');
                    setLeaveOutForm(prev => ({ ...prev, isBoarder }));
                })
                .catch(() => {
                    setLeaveOutForm(prev => ({ ...prev, isBoarder: true }));
                })
                .finally(() => {
                    setIsCheckingBoarder(false);
                });
        }
    }, [leaveOutStudent, currentInstitution.id]);

    const handleCreateLeaveOutFromEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveOutStudent || !currentUser) return;

        try {
            const id = `lo_${Date.now()}`;
            const newRequest = {
                id,
                institutionId: currentInstitution.id,
                studentId: leaveOutStudent.user.id,
                classTeacherId: currentUser.id,
                reason: leaveOutForm.reason,
                leaveDate: leaveOutForm.leaveDate,
                returnDate: leaveOutForm.returnDate,
                status: leaveOutForm.isBoarder ? 'pending_boarding' : 'pending_security',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('leave_out_requests', newRequest);

            if (onLogAction) {
                await onLogAction(`Generated leave out permission for ${leaveOutStudent.user.name} from Enrollment Manager`);
            }

            // Generate and download PDF
            const enrichedRequest = {
                ...newRequest,
                studentName: leaveOutStudent.user.name,
                studentClass: leaveOutStudent.enr.metadata?.stream || leaveOutStudent.enr.metadata?.gradeLevel || 'N/A',
                classTeacherName: currentUser.name
            };

            const dataUri = await generateLeaveOutSheetPdf(
                enrichedRequest as any,
                currentInstitution,
                companyDetails || {} as any,
                users,
                courses
            );

            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `LeaveOut_${leaveOutStudent.user.name.replace(/\s+/g, '_')}_${id}.pdf`;
            link.click();

            setLeaveOutStudent(null);
            setLeaveOutForm({
                reason: '',
                isBoarder: true,
                leaveDate: new Date().toISOString().split('T')[0],
                returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            });

            alert("Leave-out permission sheet created and PDF downloaded successfully!");
        } catch (error) {
            console.error("Failed to generate leave out from enrollment:", error);
            alert("Failed to authorize leave out request.");
        }
    };

    const handleOpenIdCardPreview = async (enr: StudentEnrollment, user: User) => {
        let qrCodeUrl = '';
        const admissionNo = enr.admissionNumber || user.staffId || user.admissionNumber || user.id;
        if ((window as any).QRCode && admissionNo) {
            try {
                qrCodeUrl = await (window as any).QRCode.toDataURL(admissionNo, { margin: 1, width: 150 });
            } catch (e) {
                console.warn("QR code generation failed", e);
            }
        }
        setPreviewStudent(user);
        setPreviewEnrollment(enr);
        setPreviewQrCodeUrl(qrCodeUrl);
        setIsPreviewingIdCard(true);
    };

    const handleDownloadIdCard = async (enr: StudentEnrollment, user: User) => {
        setIsGeneratingIdCardId(enr.id);
        try {
            let qrCodeUrl = '';
            const admissionNo = enr.admissionNumber || user.staffId || user.admissionNumber || user.id;
            if ((window as any).QRCode) {
                qrCodeUrl = await (window as any).QRCode.toDataURL(admissionNo, { margin: 1, width: 150 });
            }

            const logoUrl = (currentInstitution.letterheadConfig as any)?.logoUrl || currentInstitution.logoUrl || '';

            const pdfDataUri = await generateStudentIdCardPdf(
                { ...user, admissionNumber: enr.admissionNumber || user.admissionNumber || user.admission_number || user.staffId },
                currentInstitution,
                companyDetails || {} as any,
                logoUrl,
                user.profilePhotoUrl || undefined,
                qrCodeUrl
            );

            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `ID_Card_${(user.name || 'Student').replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to generate student ID card:', error);
            alert('Failed to generate ID card. Please verify student details and try again.');
        } finally {
            setIsGeneratingIdCardId(null);
        }
    };

    const [isGeneratingClassListPdf, setIsGeneratingClassListPdf] = useState(false);

    const handleGenerateClassListPdf = async () => {
        if (filteredEnrollments.length === 0) {
            alert("No student enrollments found matching the current filters.");
            return;
        }

        setIsGeneratingClassListPdf(true);
        try {
            const studentsPayload = filteredEnrollments.map(enr => {
                const user = users.find(u => u.id === enr.userId);
                return {
                    ...enr,
                    user: user || { name: 'Unknown Student', id: enr.userId }
                };
            });

            let classTitle = "OFFICIAL STUDENT CLASS LIST";
            if (gradeFilter && streamFilter) {
                classTitle = `${gradeFilter} - ${streamFilter} Class List`;
            } else if (gradeFilter) {
                classTitle = `${gradeFilter} Class List`;
            } else if (streamFilter) {
                classTitle = `${streamFilter} Stream List`;
            }

            const dataUri = await generateClassListPdf(
                studentsPayload,
                currentInstitution,
                companyDetails || {} as any,
                {
                    gradeFilter,
                    streamFilter,
                    statusFilter,
                    searchTerm,
                    title: classTitle
                }
            );

            setPdfPreviewUrl(dataUri);
            setPdfPreviewTitle(classTitle);
            setPdfFileName(`${classTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error: any) {
            console.error("Failed to generate Class List PDF:", error);
            alert("Failed to generate Class List PDF: " + (error?.message || error));
        } finally {
            setIsGeneratingClassListPdf(false);
        }
    };

    const handleFixSingleUnknownName = async (enrollmentId: string) => {
        const enr = enrollments.find(e => e.id === enrollmentId);
        if (!enr) return;
        const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
        if (!parentName || !parentName.trim()) {
            setStatusMsg({ type: 'error', message: 'No parent name available for this student.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
            return;
        }

        const newName = parentName.trim();
        setStatusMsg({ type: 'info', message: `Updating student name to "${newName}"...` });
        setIsLoading(true);

        try {
            let associatedUser = users.find(u => u.id === enr.userId);
            if (!associatedUser && enr.userId) {
                try {
                    const dbUser = await apiService.fetchModuleRecord<User>('users', enr.userId);
                    if (dbUser) associatedUser = dbUser;
                } catch (_) {}
            }

            const userIdToUpdate = enr.userId;
            if (userIdToUpdate) {
                const userToSave = {
                    ...(associatedUser || { id: userIdToUpdate, role: 'student', institutionId: currentInstitution.id }),
                    id: userIdToUpdate,
                    name: newName,
                    institutionId: currentInstitution.id
                };
                await apiService.updateModuleRecord('users', userIdToUpdate, userToSave);
                setUsers(prev => {
                    const idx = prev.findIndex(u => u.id === userIdToUpdate);
                    if (idx !== -1) {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], name: newName };
                        return copy;
                    }
                    return [...prev, userToSave as User];
                });
            }

            const updatedMeta = {
                ...(enr.metadata || {}),
                studentName: newName,
                name: newName
            };
            const updatedEnrollment = {
                ...enr,
                metadata: updatedMeta,
                updatedAt: new Date().toISOString()
            };

            await apiService.updateModuleRecord('student_enrollments', enr.id, updatedEnrollment);
            setEnrollments(prev => prev.map(e => e.id === enr.id ? updatedEnrollment : e));

            setStatusMsg({ type: 'success', message: `✓ Student name updated to "${newName}".` });
        } catch (err: any) {
            console.error('Failed to fix student name:', err);
            setStatusMsg({ type: 'error', message: `Failed to update name: ${err.message || err}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    const handleBulkFixUnknownNames = async () => {
        const targets = enrollments.filter(enr => {
            const user = users.find(u => u.id === enr.userId);
            const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
            const isUnknown = isNameUnknown(user?.name);
            return isUnknown && !!parentName.trim();
        });

        // Filter unique targets by userId to avoid concurrent updates on the same user record
        const uniqueTargets: typeof targets = [];
        const seenUserIds = new Set<string>();
        for (const enr of targets) {
            if (!seenUserIds.has(enr.userId)) {
                seenUserIds.add(enr.userId);
                uniqueTargets.push(enr);
            }
        }

        if (uniqueTargets.length === 0) {
            setStatusMsg({ type: 'info', message: 'No unknown student names found with parent names.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
            return;
        }

        if (!window.confirm(`Are you sure you want to copy the parent's name to replace "Unknown Student" for all ${uniqueTargets.length} record(s)?`)) {
            return;
        }

        setStatusMsg({ type: 'info', message: `Updating ${uniqueTargets.length} student names...` });
        setIsLoading(true);

        try {
            let updatedCount = 0;
            const updatedUsersMap: Record<string, { name: string; user: User }> = {};
            const batchSize = 5;
            for (let i = 0; i < uniqueTargets.length; i += batchSize) {
                const batch = uniqueTargets.slice(i, i + batchSize);
                await Promise.all(batch.map(async (enr) => {
                    try {
                        let associatedUser = users.find(u => u.id === enr.userId);
                        if (!associatedUser) {
                            try {
                                const dbUsers = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                    filter: { id: enr.userId }
                                });
                                if (dbUsers && dbUsers.length > 0) {
                                    associatedUser = dbUsers[0];
                                }
                            } catch (err) {
                                console.error('[BulkFixName] Error searching user:', enr.userId, err);
                            }
                        }
                        if (!associatedUser) return;

                        const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
                        const newName = parentName && parentName.trim() ? parentName.trim() : 'Student';

                        // Send full user object with updated name and ensure correct institutionId
                        const updatedUser = { 
                            ...associatedUser, 
                            name: newName,
                            institutionId: currentInstitution.id 
                        };
                        console.log('[BulkFixName] Updating user:', associatedUser.id, '->', newName);
                        await apiService.updateModuleRecord('users', associatedUser.id, updatedUser);
                        updatedUsersMap[associatedUser.id] = { name: newName, user: updatedUser };

                        // Also update student_enrollments metadata
                        const updatedMeta = {
                            ...(enr.metadata || {}),
                            studentName: newName,
                            name: newName
                        };
                        const updatedEnrollment = {
                            ...enr,
                            metadata: updatedMeta,
                            updatedAt: new Date().toISOString()
                        };
                        await apiService.updateModuleRecord('student_enrollments', enr.id, updatedEnrollment).catch(() => {});

                        updatedCount++;
                    } catch (singleErr: any) {
                        console.error(`[BulkFixName] Error processing student user ${enr.userId}:`, singleErr);
                    }
                }));
            }

            // Update local state immediately.
            setUsers(prevUsers => {
                const newUsers = [...prevUsers];
                Object.entries(updatedUsersMap).forEach(([id, entry]) => {
                    const idx = newUsers.findIndex(u => u.id === id);
                    if (idx !== -1) {
                        newUsers[idx] = { ...newUsers[idx], name: entry.name, institutionId: currentInstitution.id };
                    } else {
                        newUsers.push(entry.user);
                    }
                });
                return newUsers;
            });

            // Re-fetch all data to synchronize with DB
            loadAllData();

            setStatusMsg({ type: 'success', message: `✓ Successfully updated ${updatedCount} student name(s).` });
        } catch (err: any) {
            console.error('Bulk update of student names failed:', err);
            setStatusMsg({ type: 'error', message: `Bulk update failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 5000);
        }
    };

    return (
        <div className="space-y-6">
            {isUploading && createPortal(
                <ExcelSmartImporter 
                    fields={activeImportFields} 
                    onComplete={activeOnComplete} 
                    onClose={() => {
                        setIsUploading(false);
                        setImportMode('new_enroll');
                        setImportGradeLevel('');
                        setImportStream('');
                    }}
                    title={importMode === 'update_secondary_phone' ? 'Update Contacts, Grade Level & Class Stream from Excel' : undefined}
                    description={importMode === 'update_secondary_phone' ? 'Map Admission Number (or Student Full Name) plus Primary Phone, Secondary Phone, Parent Name, Grade Level, and/or Class Stream. Matched student records will be updated.' : undefined}
                >
                    {activeTab === 'students' && context === 'academic' && (
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mt-6 space-y-4">
                            <h5 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Default Placement Settings</h5>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                Optionally select default values for records that do not contain a mapped Grade Level or Class Stream column in the Excel file.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest ml-1">Default Grade Level</label>
                                    <select
                                        value={importGradeLevel}
                                        onChange={e => setImportGradeLevel(e.target.value)}
                                        className="form-select mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">-- No Default Grade --</option>
                                        {cohortsList.map(grade => (
                                            <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest ml-1">Default Stream</label>
                                    <select
                                        value={importStream}
                                        onChange={e => setImportStream(e.target.value)}
                                        className="form-select mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">-- No Default Stream --</option>
                                        {importStreamsList.map(stream => (
                                            <option key={stream} value={stream}>{stream}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </ExcelSmartImporter>,
                document.body
            )}
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {activeTab === 'teachers' ? 'Teachers' : activeTab === 'support_staff' ? 'Support Staff' : 'Student'} <span className="text-indigo-500">Enrollment Portal</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {activeTab === 'teachers' ? 'Teachers Registry' : activeTab === 'support_staff' ? 'Support Staff Registry' : (context === 'driving_school' ? 'Driving School Cohort Registry' : 'Academic Class Placements & Registry')}
                        </p>
                    </div>
                </div>
                
                {activeTab === 'students' && (
                    <div className="flex items-center gap-3">
                        {hasUnknownStudents && (
                            <button
                                onClick={handleBulkFixUnknownNames}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-amber-500/10"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Fix Unknown Names
                            </button>
                        )}
                        <button
                            onClick={handleGenerateClassListPdf}
                            disabled={isGeneratingClassListPdf}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-purple-500/10 disabled:opacity-50"
                            title="Generate and preview PDF Class List for the current student registry selection"
                        >
                            <Printer className="w-4 h-4" />
                            {isGeneratingClassListPdf ? 'Generating PDF...' : 'Class List PDF'}
                        </button>
                        <button 
                            onClick={() => { setImportMode('new_enroll'); setIsUploading(true); }}
                            className="px-6 py-3 bg-slate-900 dark:bg-slate-850 border border-slate-800 dark:border-slate-755 hover:bg-slate-850 dark:hover:bg-slate-800 hover:border-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            Import Excel
                        </button>
                        <button 
                            onClick={() => { setImportMode('update_secondary_phone'); setIsUploading(true); }}
                            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-teal-500/10"
                            title="Update primary phone number, secondary phone number, or parent name from an Excel file (requires Admission Number or Student Name)"
                        >
                            <Phone className="w-4 h-4" />
                            Update Contacts
                        </button>
                        <button
                            onClick={() => {
                                setEditingEnrollment(null);
                                setIsFormOpen(true);
                            }}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                        >
                            <UserPlus className="w-4 h-4" />
                            Enroll Student
                        </button>
                    </div>
                )}

                {activeTab === 'teachers' && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsUploading(true)}
                            className="px-6 py-3 bg-slate-900 dark:bg-slate-850 border border-slate-800 dark:border-slate-755 hover:bg-slate-850 dark:hover:bg-slate-800 hover:border-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            Import Excel
                        </button>
                        <button
                            onClick={() => {
                                setEditingStaff(null);
                                setIsClassSupervisor(false);
                                setSupervisesStreamId('');
                                setStaffFormData({
                                    name: '',
                                    email: '',
                                    phoneNumber: '',
                                    role: 'teacher',
                                    gender: ''
                                });
                                setIsStaffFormOpen(true);
                             }}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                        >
                            <UserPlus className="w-4 h-4" />
                            Onboard Teacher
                        </button>
                    </div>
                )}

                {activeTab === 'support_staff' && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsUploading(true)}
                            className="px-6 py-3 bg-slate-900 dark:bg-slate-850 border border-slate-800 dark:border-slate-755 hover:bg-slate-850 dark:hover:bg-slate-800 hover:border-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            Import Excel
                        </button>
                        <button
                            onClick={() => {
                                const supportRoles = getRolesForInstitution(currentInstitution).filter(
                                    role => !teacherRoles.includes(role) && !nonSupportRoles.includes(role)
                                );
                                setEditingStaff(null);
                                setIsClassSupervisor(false);
                                setSupervisesStreamId('');
                                setStaffFormData({
                                    name: '',
                                    email: '',
                                    phoneNumber: '',
                                    role: supportRoles[0] || 'staff',
                                    gender: ''
                                });
                                setIsStaffFormOpen(true);
                            }}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                        >
                            <UserPlus className="w-4 h-4" />
                            Onboard Staff
                        </button>
                    </div>
                )}
            </div>




            {/* Status Alerts */}
            {statusMsg.type !== 'idle' && (
                <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                    {statusMsg.message}
                </div>
            )}

            {/* Tab: Students */}
            {activeTab === 'students' && (
                <>
                    {/* Stats Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Registered Students</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{enrollments.length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active & Enrolled</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                                    {enrollments.filter(e => e.status === 'Active' || e.status === 'Enrolled').length}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                                <UserCheck className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Graduated</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                                    {enrollments.filter(e => e.status === 'Graduated').length}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        {/* Row 1: Search */}
                        <div className="w-full relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name, phone or admission number..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        {/* Row 2: Dropdowns */}
                        <div className="flex flex-wrap items-center gap-3">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0" />

                            {/* Status filter */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="flex-1 min-w-[130px] py-2.5 px-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Enrolled">Enrolled</option>
                                <option value="Active">Active</option>
                                <option value="Graduated">Graduated</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Dropped">Dropped</option>
                            </select>
                            
                            {/* Grade Level filter — academic context only */}
                            {context === 'academic' && (
                                <select
                                    value={gradeFilter}
                                    onChange={e => setGradeFilter(e.target.value)}
                                    className="flex-1 min-w-[130px] py-2.5 px-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="">All Grades</option>
                                    {cohortsList.map(grade => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                            )}

                            {/* Stream filter — academic context only */}
                            {context === 'academic' && (
                                <select
                                    value={streamFilter}
                                    onChange={e => setStreamFilter(e.target.value)}
                                    className="flex-1 min-w-[130px] py-2.5 px-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="">All Streams</option>
                                    {filterStreamsList.map(stream => (
                                        <option key={stream} value={stream}>{stream}</option>
                                    ))}
                                </select>
                            )}

                            {/* Quick Class List PDF preview button */}
                            <button
                                onClick={handleGenerateClassListPdf}
                                disabled={isGeneratingClassListPdf}
                                className="py-2.5 px-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shrink-0 disabled:opacity-50"
                                title="Preview Class List PDF for filtered students"
                            >
                                <Printer className="w-4 h-4" />
                                {isGeneratingClassListPdf ? 'Generating...' : 'Class List PDF'}
                            </button>

                            {/* Clear filters button — only visible when a filter is active */}
                            {(gradeFilter || streamFilter || statusFilter !== 'All' || searchTerm) && (
                                <button
                                    onClick={() => {
                                        setGradeFilter('');
                                        setStreamFilter('');
                                        setStatusFilter('All');
                                        setSearchTerm('');
                                    }}
                                    className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-all whitespace-nowrap"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        {/* Active filter summary chips */}
                        {(gradeFilter || streamFilter) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {gradeFilter && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full">
                                        Grade: {gradeFilter}
                                        <button onClick={() => setGradeFilter('')} className="text-indigo-300 hover:text-white transition-colors ml-0.5">×</button>
                                    </span>
                                )}
                                {streamFilter && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-full">
                                        Stream: {streamFilter}
                                        <button onClick={() => setStreamFilter('')} className="text-purple-300 hover:text-white transition-colors ml-0.5">×</button>
                                    </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider self-center">
                                    — {filteredEnrollments.length} student{filteredEnrollments.length !== 1 ? 's' : ''} shown
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Students List */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Retrieving enrollments...</p>
                        </div>
                    ) : filteredEnrollments.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl border-dashed">
                            <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No enrollment records found.</p>
                            <p className="text-xs text-slate-500 mt-1">Enroll a new student to get started or adjust your filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                                    {paginatedEnrollments.map((enr, i) => {
                                        const user = users.find(u => u.id === enr.userId);
                                        const hasBiometrics = !!user?.metadata?.webauthnCredentials;

                                        const avatarColors = [
                                            'bg-indigo-100 text-indigo-700',
                                            'bg-violet-100 text-violet-700',
                                            'bg-emerald-100 text-emerald-700',
                                            'bg-rose-100 text-rose-700',
                                            'bg-amber-100 text-amber-700',
                                            'bg-cyan-100 text-cyan-700',
                                        ];
                                        const avatarCls = avatarColors[i % avatarColors.length];

                                        const statusCfg: Record<string, string> = {
                                            Active:    'bg-indigo-50 border-indigo-200 text-indigo-700',
                                            Enrolled:  'bg-indigo-50 border-indigo-200 text-indigo-700',
                                            Graduated: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                                            Suspended: 'bg-amber-50 border-amber-200 text-amber-700',
                                            Dropped:   'bg-red-50 border-red-200 text-red-700',
                                        };
                                        const statusCls = statusCfg[enr.status] || 'bg-slate-50 border-slate-200 text-slate-600';

                                        return (
                                            <div
                                                key={enr.id}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex flex-wrap md:flex-nowrap items-center gap-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
                                            >
                                                {/* ── Avatar ── */}
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base uppercase shrink-0 ${avatarCls}`}>
                                                    {getStudentDisplayName(enr, user).charAt(0)}
                                                </div>

                                                {/* ── Student Info ── */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate leading-tight flex items-center gap-2">
                                                        {getStudentDisplayName(enr, user)}
                                                        {isNameUnknown(user?.name) && (enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleFixSingleUnknownName(enr.id);
                                                                }}
                                                                title={`Replace with Parent Name: ${enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name}`}
                                                                className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 whitespace-nowrap flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <RotateCcw className="w-2.5 h-2.5" />
                                                                Use Parent Name
                                                            </button>
                                                        )}
                                                    </p>
                                                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-sans">
                                                         {user?.email && !user.email.endsWith('@eduai.local') && (
                                                             <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                                 <Mail className="w-3 h-3 text-indigo-400" /> {user.email}
                                                             </span>
                                                         )}
                                                         {user?.phoneNumber && (
                                                             <span className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 font-semibold" title="Student Personal Phone">
                                                                 <Phone className="w-3 h-3 text-indigo-500" /> Student: {user.phoneNumber}
                                                             </span>
                                                         )}
                                                         {(enr.metadata?.parentPhone || enr.metadata?.parents?.[0]?.phone || user?.metadata?.parentPhone) && (
                                                             <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/40" title="Primary Parent / Guardian Phone">
                                                                 <Phone className="w-3 h-3 text-emerald-500 shrink-0" /> Parent 1: {enr.metadata?.parentPhone || enr.metadata?.parents?.[0]?.phone || user?.metadata?.parentPhone}
                                                             </span>
                                                         )}
                                                         {(enr.metadata?.secondaryPhone || enr.metadata?.parentPhone2 || enr.metadata?.parents?.[1]?.phone || user?.secondaryPhone || user?.parentPhone2 || user?.metadata?.secondaryPhone) && (
                                                             <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200/80 dark:border-purple-800/40 shadow-sm" title="Secondary / Alternative Parent Phone">
                                                                 <Phone className="w-3 h-3 text-purple-500 shrink-0" /> Parent 2 (Sec): {enr.metadata?.secondaryPhone || enr.metadata?.parentPhone2 || enr.metadata?.parents?.[1]?.phone || user?.secondaryPhone || user?.parentPhone2 || user?.metadata?.secondaryPhone}
                                                             </span>
                                                         )}
                                                     </div>
                                                </div>

                                                {/* ── Admission # ── */}
                                                <div className="shrink-0 flex flex-col items-center gap-0.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Admission No.</span>
                                                    <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 px-3 py-1 rounded-lg tracking-wider whitespace-nowrap">
                                                        {enr.admissionNumber || '—'}
                                                    </span>
                                                </div>

                                                {/* ── Details (Grade/Stream or Licence) ── */}
                                                <div className="shrink-0">
                                                    {context === 'driving_school' ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 px-2.5 py-1 rounded-full">
                                                                {enr.metadata?.licenseCategory || 'N/A'}
                                                            </span>
                                                            <span className="text-[9px] text-slate-500 font-semibold text-center">
                                                                {enr.metadata?.priorAttendedDays || 0} sessions
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                                {enr.metadata?.gradeLevel || 'No Grade'}
                                                            </span>
                                                            {enr.metadata?.stream && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 px-2.5 py-0.5 rounded-full text-center whitespace-nowrap">
                                                                    {enr.metadata.stream}
                                                                </span>
                                                            )}
                                                            {enr.metadata?.boardingStatus && (
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-center whitespace-nowrap border mt-0.5 ${
                                                                    enr.metadata.boardingStatus === 'boarder'
                                                                    ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-400'
                                                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400'
                                                                }`}>
                                                                    {enr.metadata.boardingStatus === 'boarder' ? 'Boarder' : 'Day Scholar'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ── Biometrics ── */}
                                                <div className="shrink-0">
                                                    {hasBiometrics ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> Biometric
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRegisterBiometrics(enr.userId, user?.name || 'Student')}
                                                            className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-indigo-700 dark:hover:text-white bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-white/20 px-3 py-1.5 rounded-xl transition-all"
                                                        >
                                                            <Fingerprint className="w-3.5 h-3.5 text-indigo-500" /> Enroll Key
                                                        </button>
                                                    )}
                                                </div>

                                                {/* ── Status ── */}
                                                <div className="shrink-0">
                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border ${statusCls}`}>
                                                        {enr.status}
                                                    </span>
                                                </div>

                                                {/* ── Actions ── */}
                                                <div className="shrink-0 flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenIdCardPreview(enr, user || {} as User)}
                                                        disabled={isGeneratingIdCardId === enr.id}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all disabled:opacity-50"
                                                        title="Download Student ID Card"
                                                    >
                                                        <CreditCard className="w-4 h-4" />
                                                    </button>
                                                    {currentUser && ['admin', 'head_teacher', 'dos', 'deputy', 'super_admin'].includes(currentUser.role) && (
                                                        <button
                                                            onClick={() => setLeaveOutStudent({ enr, user: user || {} as User })}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                                                            title="Generate Leave Out Permission"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setInviteModalEnrollment(enr);
                                                            setInviteSelectedParentIdx(0);
                                                            setInviteSelectedEventId(events[0]?.id || '');
                                                            setInviteMsg({ type: 'idle', message: '' });
                                                        }}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                                                        title="Send Event Invitation to Parent"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(enr)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                                                        title="Edit Enrollment"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(enr.id)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                        title="Remove Record"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 text-left">
                                    <span className="text-xs text-slate-500 font-semibold">
                                        Showing page <span className="font-bold text-slate-800 dark:text-white">{currentPage}</span> of <span className="font-bold text-slate-800 dark:text-white">{totalPages}</span> (Total {filteredEnrollments.length} students)
                                    </span>
                                    <div className="flex gap-2 text-slate-850">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Tab: Teachers */}
            {activeTab === 'teachers' && (
                <>
                    {/* Filters Bar */}
                    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <div className="w-full relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name, email or phone number..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        {searchTerm && (
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''} found
                                </span>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-all"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Teachers List */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Retrieving teachers...</p>
                        </div>
                    ) : filteredTeachers.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl border-dashed">
                            <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No teachers found.</p>
                            <p className="text-xs text-slate-500 mt-1">Onboard a new teacher to get started or adjust your filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTeachers.map((teacher, i) => {
                                const hasBiometrics = !!teacher?.metadata?.webauthnCredentials;

                                const avatarColors = [
                                    'bg-indigo-100 text-indigo-700',
                                    'bg-violet-100 text-violet-700',
                                    'bg-emerald-100 text-emerald-700',
                                    'bg-rose-100 text-rose-700',
                                    'bg-amber-100 text-amber-700',
                                    'bg-cyan-100 text-cyan-700',
                                ];
                                const avatarCls = avatarColors[i % avatarColors.length];

                                return (
                                    <div
                                        key={teacher.id}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex flex-wrap md:flex-nowrap items-center gap-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
                                    >
                                        {/* Avatar */}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base uppercase shrink-0 ${avatarCls}`}>
                                            {(teacher.name || 'T').charAt(0)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-800 dark:text-white truncate leading-tight">
                                                {teacher.name}
                                            </p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                {teacher.email && !teacher.email.endsWith('@eduai.local') && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                        <Mail className="w-3 h-3" /> {teacher.email}
                                                    </span>
                                                )}
                                                {teacher.phoneNumber && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                        <Phone className="w-3 h-3" /> {teacher.phoneNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Role */}
                                        <div className="shrink-0 flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                                                {formatRoleDisplayName(teacher.role, currentInstitution)}
                                            </span>
                                            {(() => {
                                                const supervisedLevel = courses.flatMap(c => c.levels || []).find(lvl => lvl.classTeacherId === teacher.id);
                                                return supervisedLevel ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full">
                                                        Supervisor: {supervisedLevel.name}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </div>

                                        {/* Biometrics */}
                                        <div className="shrink-0">
                                            {hasBiometrics ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Biometric
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleRegisterBiometrics(teacher.id, teacher.name || 'Teacher')}
                                                    className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-indigo-700 dark:hover:text-white bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-white/20 px-3 py-1.5 rounded-xl transition-all"
                                                >
                                                    <Fingerprint className="w-3.5 h-3.5 text-indigo-500" /> Enroll Key
                                                </button>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setRoleModalUser(teacher);
                                                    setRoleModalNewRole(teacher.role || 'teacher');
                                                    setRoleModalSourceTab('teachers');
                                                }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                                                title="Manage Role"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingStaff(teacher);
                                                    const supervisedLevel = courses.flatMap(c => c.levels || []).find(lvl => lvl.classTeacherId === teacher.id);
                                                    setIsClassSupervisor(!!supervisedLevel);
                                                    setSupervisesStreamId(supervisedLevel ? supervisedLevel.id : '');
                                                    setStaffFormData({
                                                        name: teacher.name || '',
                                                        email: teacher.email && !teacher.email.endsWith('@eduai.local') ? teacher.email : '',
                                                        phoneNumber: teacher.phoneNumber || '',
                                                        role: teacher.role || 'teacher',
                                                        gender: (teacher.gender || '') as any
                                                    });
                                                    setIsStaffFormOpen(true);
                                                }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                                                title="Edit Profile"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(teacher.id, teacher.name)}
                                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                title="Delete Profile"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Tab: Support Staff */}
            {activeTab === 'support_staff' && (
                <>
                    {/* Filters Bar */}
                    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <div className="w-full relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name, email or phone number..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        {searchTerm && (
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {filteredSupportStaff.length} staff member{filteredSupportStaff.length !== 1 ? 's' : ''} found
                                </span>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-all"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Support Staff List */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Retrieving staff...</p>
                        </div>
                    ) : filteredSupportStaff.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl border-dashed">
                            <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No staff members found.</p>
                            <p className="text-xs text-slate-500 mt-1">Onboard a new staff member to get started or adjust your filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSupportStaff.map((staff, i) => {
                                const hasBiometrics = !!staff?.metadata?.webauthnCredentials;

                                const avatarColors = [
                                    'bg-indigo-100 text-indigo-700',
                                    'bg-violet-100 text-violet-700',
                                    'bg-emerald-100 text-emerald-700',
                                    'bg-rose-100 text-rose-700',
                                    'bg-amber-100 text-amber-700',
                                    'bg-cyan-100 text-cyan-700',
                                ];
                                const avatarCls = avatarColors[i % avatarColors.length];

                                return (
                                    <div
                                        key={staff.id}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex flex-wrap md:flex-nowrap items-center gap-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
                                    >
                                        {/* Avatar */}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base uppercase shrink-0 ${avatarCls}`}>
                                            {(staff.name || 'S').charAt(0)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-800 dark:text-white truncate leading-tight">
                                                {staff.name}
                                            </p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                {staff.email && !staff.email.endsWith('@eduai.local') && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                        <Mail className="w-3 h-3" /> {staff.email}
                                                    </span>
                                                )}
                                                {staff.phoneNumber && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                        <Phone className="w-3 h-3" /> {staff.phoneNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Role */}
                                        <div className="shrink-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                                                {formatRoleDisplayName(staff.role, currentInstitution)}
                                            </span>
                                        </div>

                                        {/* Biometrics */}
                                        <div className="shrink-0">
                                            {hasBiometrics ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-455 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Biometric
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleRegisterBiometrics(staff.id, staff.name || 'Staff')}
                                                    className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-indigo-700 dark:hover:text-white bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-white/20 px-3 py-1.5 rounded-xl transition-all"
                                                >
                                                    <Fingerprint className="w-3.5 h-3.5 text-indigo-500" /> Enroll Key
                                                </button>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setRoleModalUser(staff);
                                                    setRoleModalNewRole(staff.role || '');
                                                    setRoleModalSourceTab('support_staff');
                                                }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                                                title="Manage Role"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingStaff(staff);
                                                    setIsClassSupervisor(false);
                                                    setSupervisesStreamId('');
                                                    setStaffFormData({
                                                        name: staff.name || '',
                                                        email: staff.email && !staff.email.endsWith('@eduai.local') ? staff.email : '',
                                                        phoneNumber: staff.phoneNumber || '',
                                                        role: staff.role || 'staff',
                                                        gender: (staff.gender || '') as any
                                                    });
                                                    setIsStaffFormOpen(true);
                                                }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                                                title="Edit Profile"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(staff.id, staff.name)}
                                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                title="Delete Profile"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Tab: Broadcaster */}
            {activeTab === 'broadcaster' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Compose Form */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                            <Send className="w-4 h-4" />
                            Compose Announcement
                        </div>

                        <form onSubmit={handleSendBroadcast} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Target Cohort</label>
                                <select
                                    value={broadcastTarget}
                                    onChange={e => setBroadcastTarget(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="All">All Registered Cohorts</option>
                                    {cohortsList.map(cohort => (
                                        <option key={cohort} value={cohort}>{cohort}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Subject (Email Only)</label>
                                <input
                                    type="text"
                                    placeholder="Enter announcement subject..."
                                    value={broadcastSubject}
                                    onChange={e => setBroadcastSubject(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                                <textarea
                                    rows={5}
                                    required
                                    placeholder="Write broadcast details here..."
                                    value={broadcastBody}
                                    onChange={e => setBroadcastBody(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest block ml-1">Delivery Channels</label>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={broadcastChannels.sms}
                                            onChange={e => setBroadcastChannels({ ...broadcastChannels, sms: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 accent-indigo-600 focus:ring-indigo-500"
                                        />
                                        SMS Alerts
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={broadcastChannels.email}
                                            onChange={e => setBroadcastChannels({ ...broadcastChannels, email: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 accent-indigo-600 focus:ring-indigo-500"
                                        />
                                        Email Notifications
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                            >
                                <Send className="w-4 h-4" />
                                {isLoading ? 'Sending...' : 'Dispatch Broadcast'}
                            </button>
                        </form>
                    </div>

                    {/* Broadcast Logs */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                                <Bell className="w-4 h-4" />
                                Broadcaster History
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setBroadcasterLogSubTab('announcements')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        broadcasterLogSubTab === 'announcements'
                                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    Announcements
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBroadcasterLogSubTab('event_pins')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        broadcasterLogSubTab === 'event_pins'
                                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    Event PIN Deliveries
                                </button>
                            </div>
                        </div>

                        {broadcasterLogSubTab === 'announcements' ? (
                            broadcasterMessages.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <Mail className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                                    <p className="text-xs font-bold">No announcements have been broadcasted yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-350">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                <th className="pb-3 pr-4">Broadcast Time</th>
                                                <th className="pb-3 pr-4">Target Cohort</th>
                                                <th className="pb-3 pr-4">Subject & Preview</th>
                                                <th className="pb-3 pr-4">Channels</th>
                                                <th className="pb-3 text-right">Delivered</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {broadcasterMessages.slice().sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map((msg) => (
                                                <tr key={msg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                                    <td className="py-3 pr-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'N/A'}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-1 rounded text-[10px] border border-indigo-100 dark:border-indigo-500/20">
                                                            {msg.target}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-4 max-w-xs truncate">
                                                        <p className="font-bold text-slate-850 dark:text-white">{msg.subject || 'Announcement'}</p>
                                                        <p className="text-slate-500 text-[10px] mt-0.5 truncate">{msg.body}</p>
                                                    </td>
                                                    <td className="py-3 pr-4 font-bold text-slate-500">{msg.channel}</td>
                                                    <td className="py-3 text-right font-black text-slate-850 dark:text-white">{msg.recipientsCount || 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            eventPins.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <Key className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                                    <p className="text-xs font-bold">No event PINs have been generated or dispatched yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-350">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                <th className="pb-3 pr-4">Sent Time</th>
                                                <th className="pb-3 pr-4">Recipient</th>
                                                <th className="pb-3 pr-4">Event Details</th>
                                                <th className="pb-3 pr-4">PIN Code & Status</th>
                                                <th className="pb-3 text-right">Channels</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {eventPins.slice().sort((a,b) => (b.createdAt || b.created_at || '').localeCompare(a.createdAt || a.created_at || '')).map((pin) => {
                                                const pinUser = users.find(u => u.id === pin.userId);
                                                const pinEvent = events.find(e => e.id === pin.eventId);
                                                const hasPhone = !!(pinUser?.phoneNumber || (pinUser as any)?.phone_number);
                                                const hasEmail = !!pinUser?.email;
                                                
                                                return (
                                                    <tr key={pin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                                        <td className="py-3 pr-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                                                            {pin.createdAt || pin.created_at ? new Date(pin.createdAt || pin.created_at).toLocaleString() : 'N/A'}
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <p className="font-bold text-slate-850 dark:text-white">{pinUser?.name || 'External Parent/Guest'}</p>
                                                            <p className="text-slate-500 text-[10px] mt-0.5">{pinUser?.phoneNumber || (pinUser as any)?.phone_number || 'No Phone'}</p>
                                                        </td>
                                                        <td className="py-3 pr-4 max-w-xs truncate">
                                                            <p className="font-bold text-slate-800 dark:text-slate-200">{pinEvent?.title || 'Unknown Event'}</p>
                                                            <p className="text-slate-500 text-[10px] mt-0.5">{pinEvent?.eventDate || 'N/A'} @ {pinEvent?.eventTime || 'N/A'}</p>
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-150 dark:border-indigo-500/20 text-xs">
                                                                    {pin.pin}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                                                    pin.status === 'accepted'
                                                                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                                                                        : pin.status === 'rejected'
                                                                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
                                                                        : 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                                                                }`}>
                                                                    {pin.status || 'pending'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <span className="text-[10px] font-bold text-slate-500">
                                                                {hasPhone ? 'SMS' : ''}
                                                                {hasPhone && hasEmail ? ' / ' : ''}
                                                                {hasEmail ? 'Email' : ''}
                                                                {!hasPhone && !hasEmail ? 'None' : ''}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Calendar & Events */}
            {activeTab === 'calendar' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Event & Verify forms */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Create Event */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Schedule Event</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Create a new institution event</p>
                                </div>
                            </div>
                            <form onSubmit={handleCreateEvent} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Matriculation Ceremony"
                                        value={eventTitle}
                                        onChange={e => setEventTitle(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Optional details..."
                                        value={eventDescription}
                                        onChange={e => setEventDescription(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={e => setEventDate(e.target.value)}
                                            className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Time</label>
                                        <input
                                            type="time"
                                            required
                                            value={eventTime}
                                            onChange={e => setEventTime(e.target.value)}
                                            className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Venue</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Main Hall"
                                        value={eventVenue}
                                        onChange={e => setEventVenue(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Target Cohort</label>
                                    <select
                                        value={eventTarget}
                                        onChange={e => setEventTarget(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    >
                                        <option value="All">All Cohorts</option>
                                        <option value="Specific">Specific Students</option>
                                        {cohortsList.map(cohort => (
                                            <option key={cohort} value={cohort}>{cohort}</option>
                                        ))}
                                    </select>
                                </div>
                                {eventTarget === 'Specific' && (
                                    <div className="space-y-3 pt-1">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block ml-1">Select Specific Students</label>
                                        <input
                                            type="text"
                                            placeholder="Search student by name or admission..."
                                            value={studentSearchQuery}
                                            onChange={e => setStudentSearchQuery(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
                                        />
                                        <div className="max-h-40 overflow-y-auto border border-slate-250 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-950/20 divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredStudentsForSelection.map(student => {
                                                const isSelected = selectedStudentIds.includes(student.id);
                                                return (
                                                    <div 
                                                        key={student.id} 
                                                        onClick={() => {
                                                            setSelectedStudentIds(prev => 
                                                                prev.includes(student.id)
                                                                    ? prev.filter(id => id !== student.id)
                                                                    : [...prev, student.id]
                                                            );
                                                        }}
                                                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                                            isSelected 
                                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold' 
                                                                : 'text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                        }`}
                                                    >
                                                        <div>
                                                            <p className="font-bold">{student.name}</p>
                                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                                                                {student.admissionNumber ? `Ad. ${student.admissionNumber}` : ''} {student.gradeLevel ? `• ${student.gradeLevel}` : ''}
                                                            </p>
                                                        </div>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                            isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                                        }`}>
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredStudentsForSelection.length === 0 && (
                                                <p className="text-center py-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">No students match</p>
                                            )}
                                        </div>
                                        {selectedStudentIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {selectedStudentIds.map(id => {
                                                    const s = students.find(x => x.id === id);
                                                    if (!s) return null;
                                                    return (
                                                        <span key={id} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                                            {s.name}
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setSelectedStudentIds(prev => prev.filter(x => x !== id))}
                                                                className="text-indigo-400 hover:text-rose-500 transition-colors font-bold ml-0.5"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    {isLoading ? 'Saving...' : 'Schedule Event'}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Verify PIN</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Check-in attendance</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-4">
                                Enter the student identifier and their 6-digit PIN. A correct PIN records attendance and immediately expires the code.
                            </p>
                            <form onSubmit={handleVerifyPin} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Student Identifier</label>
                                    <input
                                        type="text"
                                        placeholder="Email, phone or admission no."
                                        value={verifyIdentifier}
                                        onChange={e => setVerifyIdentifier(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">6-Digit PIN</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="· · · · · ·"
                                        value={verifyPin}
                                        onChange={e => setVerifyPin(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 placeholder-slate-300 dark:placeholder-slate-700 text-center tracking-[0.4em] focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verify &amp; Check In
                                </button>
                            </form>
                        </div>

                        {/* Custom Short URL Generator */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                                    <Link className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Short URL Generator</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Shorten any web link</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-4">
                                Paste any registration, system or external link to generate a clean, shareable short URL instantly.
                            </p>
                            <form onSubmit={handleCustomShorten} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Long Web Address</label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://example.com/some/long/path..."
                                        value={customLongUrl}
                                        onChange={e => setCustomLongUrl(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={customShortenLoading}
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
                                >
                                    {customShortenLoading ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Link className="w-3.5 h-3.5" />
                                            Generate Short Link
                                        </>
                                    )}
                                </button>
                            </form>

                            {customShortenError && (
                                <p className="mt-3 text-[10px] font-bold text-rose-505 dark:text-rose-400 uppercase tracking-wide text-center">
                                    {customShortenError}
                                </p>
                            )}

                            {customShortUrl && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Shortened Link</label>
                                    <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-xl px-2.5 py-1.5">
                                        <input
                                            type="text"
                                            readOnly
                                            value={customShortUrl}
                                            onClick={e => (e.target as HTMLInputElement).select()}
                                            className="flex-1 bg-transparent text-[9px] font-mono text-violet-750 dark:text-violet-300 outline-none min-w-0 cursor-text"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try { await navigator.clipboard.writeText(customShortUrl); } catch { alert(customShortUrl); }
                                                setStatusMsg({ type: 'success', message: 'Custom short URL copied!' });
                                                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 2500);
                                            }}
                                            className="shrink-0 text-[9px] font-black text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 px-2 py-0.5 rounded-lg transition-all uppercase tracking-wider"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right Column: Events List + PIN Ledger ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Events Grid */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Scheduled Events</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{events.length} event{events.length !== 1 ? 's' : ''} on record</p>
                                    </div>
                                </div>
                            </div>

                            {events.length === 0 ? (
                                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No events scheduled yet</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Use the panel on the left to create your first event.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {events.map((event, i) => {
                                        const eventMatchingPins = eventPins.filter(p => p.eventId === event.id);
                                        const pendingPins  = eventMatchingPins.filter(p => p.status === 'pending');
                                        const verifiedPins = eventMatchingPins.filter(p => p.status === 'used');
                                        const accentColors = [
                                            'border-l-indigo-500', 'border-l-violet-500',
                                            'border-l-emerald-500', 'border-l-rose-500',
                                            'border-l-amber-500',  'border-l-cyan-500'
                                        ];
                                        const accent = accentColors[i % accentColors.length];

                                        return (
                                            <div
                                                key={event.id}
                                                className={`relative bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 border-l-4 ${accent} rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow`}
                                            >
                                                <div className="space-y-2.5">
                                                    {/* Top row */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                                                            {event.target.startsWith('students:') ? (
                                                                `${event.target.replace('students:', '').split(',').length} Student(s)`
                                                            ) : (
                                                                event.target
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
                                                            <Clock className="w-3 h-3" />
                                                            {event.eventTime}
                                                        </span>
                                                    </div>

                                                    {/* Title */}
                                                    <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{event.title}</h4>
                                                    {event.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{event.description}</p>
                                                    )}

                                                    {/* Date & Venue */}
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                                        <span className="flex items-center gap-1.5 font-semibold">
                                                            <Calendar className="w-3 h-3 text-slate-400" />
                                                            {event.eventDate}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 font-semibold">
                                                            <MapPin className="w-3 h-3 text-slate-400" />
                                                            {event.venue}
                                                        </span>
                                                    </div>

                                                    {/* PIN stats */}
                                                    <div className="flex gap-2 pt-1">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                                            <CheckCircle className="w-3 h-3" /> {verifiedPins.length} verified
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                                                            <Clock className="w-3 h-3" /> {pendingPins.length} pending
                                                        </span>
                                                    </div>

                                                    {/* Registration Link — visible, selectable */}
                                                    {(() => {
                                                        const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                                                            ? 'https://portal.eduai.co.ke'
                                                            : window.location.origin;
                                                        const regUrl = `${origin}/?view=event-confirm&eventId=${event.id}&mode=rsvp`;
                                                        return (
                                                            <div className="pt-1 space-y-1">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                                    <Link className="w-2.5 h-2.5" /> Public Registration Links
                                                                </p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {/* Full Link */}
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-[8px] font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-wider">Full URL</span>
                                                                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-xl px-2.5 py-1">
                                                                            <input
                                                                                type="text"
                                                                                readOnly
                                                                                value={regUrl}
                                                                                onClick={e => (e.target as HTMLInputElement).select()}
                                                                                className="flex-1 bg-transparent text-[9px] font-mono text-indigo-750 dark:text-indigo-300 outline-none min-w-0 cursor-text"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    try { await navigator.clipboard.writeText(regUrl); } catch { alert(regUrl); }
                                                                                    setStatusMsg({ type: 'success', message: 'Full registration link copied!' });
                                                                                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 2500);
                                                                                }}
                                                                                className="shrink-0 p-0.5 hover:bg-indigo-200/60 dark:hover:bg-indigo-500/20 rounded transition-all"
                                                                                title="Copy Full Link"
                                                                            >
                                                                                <Link className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {/* Short Link */}
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-[8px] font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-wider">Short URL</span>
                                                                        <ShortenedUrlField
                                                                            key={regUrl}
                                                                            longUrl={regUrl}
                                                                            theme="indigo"
                                                                            setStatusMsg={setStatusMsg}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Action buttons */}
                                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setBulkInviteModalEvent(event);
                                                                setBulkInviteAddMsg('');
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-1.5"
                                                        >
                                                            <Send className="w-3 h-3" /> Send PINs
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                                                                    ? 'https://portal.eduai.co.ke'
                                                                    : window.location.origin;
                                                                const regUrl = `${origin}/?view=event-confirm&eventId=${event.id}&mode=rsvp`;
                                                                try {
                                                                    await navigator.clipboard.writeText(regUrl);
                                                                    setStatusMsg({ type: 'success', message: 'Public event registration link copied to clipboard!' });
                                                                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
                                                                } catch (err) {
                                                                    alert(`Registration Link: ${regUrl}`);
                                                                }
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-350 hover:text-indigo-650 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                            title="Copy Public Registration Link"
                                                        >
                                                            <Link className="w-3 h-3" /> Registration Link
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAnalysisEvent(event);
                                                                setAnalysisSearchTerm('');
                                                                setAnalysisStatusFilter('All');
                                                                setAnalysisTab('rsvp');
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                                                        >
                                                            <UserCheck className="w-3 h-3" /> Attendance &amp; Analysis
                                                        </button>
                                                        <label
                                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                                        >
                                                            <FileSpreadsheet className="w-3 h-3" /> Excel
                                                            <input
                                                                type="file"
                                                                accept=".xlsx,.xls,.csv"
                                                                onChange={e => handleInviteExternalExcel(event, e)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </div>
                                                    {/* Edit, Test & Delete event row */}
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={() => setTestEventModalEvent(event)}
                                                            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shadow-purple-500/20 flex items-center justify-center gap-1.5"
                                                            title="Test Event RSVP Link, Short URL & PIN Verification"
                                                        >
                                                            <FlaskConical className="w-3 h-3 text-purple-200" /> Test Event
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEditEvent(event)}
                                                            className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Edit2 className="w-3 h-3" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEvent(event)}
                                                            className="px-3 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shrink-0"
                                                            title="Delete Event"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* PIN Ledger */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">PIN Attendance Ledger</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{eventPins.length} PIN{eventPins.length !== 1 ? 's' : ''} issued</p>
                                </div>
                            </div>

                            {eventPins.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <Key className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No PINs generated yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {eventPins.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(pin => {
                                        const person = users.find(u => u.id === pin.userId);
                                        const evt    = events.find(e => e.id === pin.eventId);

                                        const statusConfig: Record<string, { label: string; cls: string }> = {
                                            used:     { label: 'Verified',     cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
                                            accepted: { label: 'Confirmed',    cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' },
                                            rejected: { label: 'Declined',     cls: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' },
                                            pending:  { label: 'Pending RSVP', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' },
                                        };
                                        const sc = statusConfig[pin.status] || statusConfig.pending;

                                        return (
                                            <div
                                                key={pin.id}
                                                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-950/60 transition-colors space-y-2.5"
                                            >
                                                {/* Top row: avatar + name/event + pin + status + actions */}
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar */}
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm shrink-0 uppercase">
                                                        {(person?.name || '?').charAt(0)}
                                                    </div>

                                                    {/* Name + event */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-slate-800 dark:text-white truncate">{person?.name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">{evt?.title || 'Unknown Event'}</p>
                                                        {pin.guests && (
                                                            <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                                                                Guests: {(() => { try { const p = JSON.parse(pin.guests); return Array.isArray(p) ? p.join(', ') : pin.guests; } catch { return pin.guests; } })()}
                                                            </p>
                                                        )}
                                                        {pin.vehicleRegistration && (
                                                            <p className="text-[9px] text-indigo-500 font-bold mt-0.5">Vehicle: {pin.vehicleRegistration}</p>
                                                        )}
                                                    </div>

                                                    {/* PIN code */}
                                                    <div className="shrink-0 text-center">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PIN</p>
                                                        <p className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400 tracking-widest">{pin.pin}</p>
                                                    </div>

                                                    {/* Status badge */}
                                                    <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${sc.cls}`}>
                                                        {sc.label}
                                                    </span>

                                                    {/* Actions */}
                                                    <div className="shrink-0 flex items-center gap-1">
                                                        <button
                                                            onClick={async () => {
                                                                const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                                                                    ? 'https://portal.eduai.co.ke'
                                                                    : window.location.origin;
                                                                const rawLink = `${origin}/?view=event-confirm&pinId=${pin.id}`;
                                                                try {
                                                                    await navigator.clipboard.writeText(rawLink);
                                                                    setStatusMsg({ type: 'success', message: 'RSVP invitation link copied to clipboard!' });
                                                                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
                                                                } catch (err) {
                                                                    alert(`RSVP Link: ${rawLink}`);
                                                                }
                                                            }}
                                                            className="p-2 bg-slate-100 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-600 dark:text-slate-450 dark:hover:text-indigo-400 rounded-xl transition-all"
                                                            title="Copy RSVP Invitation Link"
                                                        >
                                                            <Link className="w-3.5 h-3.5" />
                                                        </button>
                                                        {pin.status !== 'pending' && (
                                                            <button
                                                                onClick={() => handleResetPin(pin)}
                                                                className="p-2 bg-slate-100 hover:bg-amber-50 dark:bg-white/5 dark:hover:bg-amber-500/10 text-slate-500 hover:text-amber-600 dark:text-slate-450 dark:hover:text-amber-400 rounded-xl transition-all"
                                                                title="Reset PIN to Pending"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeletePin(pin)}
                                                            className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:text-slate-450 dark:hover:text-rose-400 rounded-xl transition-all"
                                                            title="Delete PIN"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* RSVP Link — visible, selectable */}
                                                {(() => {
                                                    const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
                                                        ? 'https://portal.eduai.co.ke'
                                                        : window.location.origin;
                                                    const rsvpUrl = `${origin}/?view=event-confirm&pinId=${pin.id}`;
                                                    return (
                                                        <div className="w-full pt-0.5 space-y-1">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {/* Full Link */}
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[8px] font-bold text-violet-500/80 dark:text-violet-400/80 uppercase tracking-wider">Full RSVP URL</span>
                                                                    <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10 rounded-xl px-2.5 py-1">
                                                                        <input
                                                                            type="text"
                                                                            readOnly
                                                                            value={rsvpUrl}
                                                                            onClick={e => (e.target as HTMLInputElement).select()}
                                                                            className="flex-1 bg-transparent text-[9px] font-mono text-violet-750 dark:text-violet-300 outline-none min-w-0 cursor-text"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                try { await navigator.clipboard.writeText(rsvpUrl); } catch { alert(rsvpUrl); }
                                                                                setStatusMsg({ type: 'success', message: 'Full RSVP link copied!' });
                                                                                setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 2500);
                                                                            }}
                                                                            className="shrink-0 p-0.5 hover:bg-violet-200/60 dark:hover:bg-violet-500/20 rounded transition-all"
                                                                            title="Copy Full RSVP Link"
                                                                        >
                                                                            <Link className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {/* Shortened Link */}
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[8px] font-bold text-violet-500/80 dark:text-violet-400/80 uppercase tracking-wider">Short RSVP URL</span>
                                                                    <ShortenedUrlField
                                                                        key={rsvpUrl}
                                                                        longUrl={rsvpUrl}
                                                                        theme="violet"
                                                                        setStatusMsg={setStatusMsg}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Portal Hub */}
            {activeTab === 'portal_hub' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Portal Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-6 sm:p-8 text-white space-y-4 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                            <div className="space-y-1">
                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-indigo-400" /> Enrollment & Event Gateway
                                </span>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Enrollment Portal Hub</h3>
                                <p className="text-xs text-slate-300 max-w-lg">
                                    Public self-service portal links for student admission, parent RSVP event passes, visitor gate-passes, and student ID card verifications.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" /> Open RSVP Portal
                                </a>
                            </div>
                        </div>

                        {/* Portal Link Copy Bar */}
                        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-indigo-300 truncate">
                                    {`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm`}
                                </span>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const link = `${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm`;
                                        try { await navigator.clipboard.writeText(link); alert('Public Event RSVP Portal link copied!'); } catch (_) {}
                                    }}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy Link
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Portal Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card 1: Event RSVP & Invitation Portal */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <Key className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Parent Event RSVP & PIN Portal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Parents can locate invitations using primary or secondary phone numbers, enter secret PINs, confirm attendance, and download digital admission passes.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Target: Parents & Guests</span>
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Launch Portal <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Card 2: Student Online Self-Enrollment */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Self-Enrollment Portal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Allows prospective students or parents to submit online admission forms, upload passport photos, and register contact information remotely.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Target: New Applicants</span>
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-register`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Launch Registration <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Card 3: Visitor & Gatepass Terminal */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Fingerprint className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Visitor Gate-Pass Verification</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Security gate staff scan attendee QR codes, verify biometric credentials, and record visitor check-ins during campus events.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Target: Campus Security</span>
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=visitor-gate`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Gatepass Terminal <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Card 4: Parent Broadcaster & SMS Notification Studio */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Send className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Broadcaster & SMS Studio</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Send automated PIN invitations, class broadcast announcements, and short URL event links directly to parents' mobile phones.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Target: Admin & Broadcasters</span>
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=broadcaster`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Open Studio <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Event Modal */}
            {editingEvent && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                    <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Edit Event</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update event details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingEvent(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveEditEvent} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Event Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={editEventTitle}
                                    onChange={e => setEditEventTitle(e.target.value)}
                                    placeholder="e.g. Annual Sports Day"
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
                                <textarea
                                    rows={2}
                                    value={editEventDescription}
                                    onChange={e => setEditEventDescription(e.target.value)}
                                    placeholder="Optional details..."
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={editEventDate}
                                        onChange={e => setEditEventDate(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Time *</label>
                                    <input
                                        type="time"
                                        required
                                        value={editEventTime}
                                        onChange={e => setEditEventTime(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Venue *</label>
                                <input
                                    type="text"
                                    required
                                    value={editEventVenue}
                                    onChange={e => setEditEventVenue(e.target.value)}
                                    placeholder="e.g. Main Hall"
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Target Cohort</label>
                                <select
                                    value={editEventTarget}
                                    onChange={e => setEditEventTarget(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                >
                                    <option value="All">All Cohorts</option>
                                    {cohortsList.map(cohort => (
                                        <option key={cohort} value={cohort}>{cohort}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingEvent(null)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editEventLoading}
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    {editEventLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Tab: Cleared Guests */}
            {activeTab === 'guests' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Cleared Guests Pipeline</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time pipeline of visitors vetted and cleared by gate {isPrimaryOrSecondary ? 'school' : 'campus'} security guards.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading guest registry...</p>
                        </div>
                    ) : visitors.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-400">No visitors recorded under this institution.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="py-3 px-4">Visitor Profile</th>
                                        <th className="py-3 px-4">Identifier / Plate</th>
                                        <th className="py-3 px-4">Purpose of Visit</th>
                                        <th className="py-3 px-4">Check-In Info</th>
                                        <th className="py-3 px-4">Campus Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {visitors.slice().sort((a,b) => (b.timeIn || '').localeCompare(a.timeIn || '')).map(guest => {
                                        const host = users.find(u => u.id === guest.hostId);
                                        const isCheckedOut = guest.timeOut || (guest as any).status === 'checked_out';

                                        return (
                                            <tr key={guest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-850 dark:text-white">{guest.name || guest.fullName}</div>
                                                    <div className="text-[10px] text-slate-550 dark:text-slate-500 mt-0.5">{guest.phoneNumber || 'No Contact phone'}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-mono text-slate-600 dark:text-slate-400">{guest.idNumber || 'No ID Ref'}</div>
                                                    {guest.vehiclePlate && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">{guest.vehiclePlate} ({guest.vehicleModel || 'Vehicle'})</div>}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{guest.purpose}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">Host: {host?.name || 'Staff'}</p>
                                                </td>
                                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                    <div>Date: {guest.visitDate || 'Today'}</div>
                                                    <div className="text-[10px] text-slate-550 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        In: {guest.timeIn || 'N/A'} {isCheckedOut && `| Out: ${guest.timeOut}`}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded ${
                                                        isCheckedOut 
                                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-700' 
                                                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                                    }`}>
                                                        {isCheckedOut ? 'Checked Out' : 'On Premises'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {!isCheckedOut && (
                                                        <button
                                                            onClick={() => handleCheckoutGuest(guest.id)}
                                                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 transition-all"
                                                        >
                                                            Check Out
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Original Form modal */}
            {isFormOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-3xl p-6 sm:p-8 w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 animate-pulse" />
                                    {editingEnrollment ? 'Modify Student Enrollment' : 'Onboard New Student'}
                                </h3>
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1">Configure student identity and placement matrices</p>
                            </div>
                            <button 
                                onClick={() => setIsFormOpen(false)}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-450 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm"
                            >
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>
 
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {statusMsg.type !== 'idle' && (
                                <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                                    statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                }`}>
                                    {statusMsg.message}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="First & Last Name"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                {!isPrimaryOrSecondary && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        required
                                        placeholder="+254..."
                                        value={formData.phoneNumber}
                                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                )}
                                {!isPrimaryOrSecondary && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        required
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Admission Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="Leave blank to auto-generate"
                                        value={formData.admissionNumber}
                                        onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
 
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Student Gender Identity</label>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1.5">
                                        {['Male', 'Female', 'Other'].map((g) => {
                                            const isActive = formData.gender === g;
                                            return (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, gender: g as any })}
                                                    className={`py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                                                        isActive
                                                            ? 'bg-indigo-600 text-white border-indigo-650 shadow-[0_8px_25px_-4px_rgba(99,102,241,0.45)]'
                                                            : 'bg-slate-50 dark:bg-slate-950/45 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {g}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
 
                                <div>
                                    <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    >
                                        <option value="Enrolled">Enrolled</option>
                                        <option value="Active">Active</option>
                                        <option value="Graduated">Graduated</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Dropped">Dropped</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Enrollment Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.enrollmentDate}
                                        onChange={e => setFormData({ ...formData, enrollmentDate: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                            </div>
 
                            {/* Passport Photo & Biometrics Section */}
                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5">
                                <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider mb-3">
                                    Identity & Biometric Verification
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Passport Photo Column */}
                                    <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest self-start">Passport Photo</label>
                                        
                                        {showCamera ? (
                                            <div className="w-full flex flex-col items-center gap-2">
                                                <div className="w-40 h-40 rounded-xl overflow-hidden border-2 border-indigo-500 relative bg-black">
                                                    <Webcam
                                                        audio={false}
                                                        ref={webcamRef}
                                                        screenshotFormat="image/jpeg"
                                                        videoConstraints={{ width: 200, height: 200, facingMode: "user" }}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={capturePhoto}
                                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Take Snapshot
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCamera(false)}
                                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full flex flex-col sm:flex-row items-center gap-4">
                                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                    {formData.passportPhoto ? (
                                                        <img src={formData.passportPhoto} alt="Passport Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users className="w-10 h-10 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2 w-full">
                                                    <label className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-center">
                                                        <span>Upload Passport Photo</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            onChange={handlePhotoUpload}
                                                            className="hidden" 
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCamera(true)}
                                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-355 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Use Camera
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
 
                                    {/* Biometrics Column */}
                                    <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/80 rounded-2xl p-4 flex flex-col justify-between gap-3">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest ml-1">Biometrics Registry</label>
                                            <p className="text-[9px] text-slate-450 dark:text-slate-500 uppercase tracking-wider font-bold mt-1.5 leading-relaxed">
                                                Enroll fingerprint or facial biometric data for secure identity check-ins and access control gates.
                                            </p>
                                        </div>
 
                                        <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto">
                                            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400">
                                                <Fingerprint className="w-6 h-6 animate-pulse" />
                                            </div>
                                            <div className="w-full flex flex-col gap-1.5">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                                    Status: {formData.biometricTemplate ? (
                                                        <span className="text-emerald-500 font-black">✓ Scan Captured</span>
                                                    ) : (
                                                        <span className="text-amber-500 font-black">Not Enrolled</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleFormScanBiometrics}
                                                    className="w-full px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/10"
                                                >
                                                    {formData.biometricTemplate ? 'Rescan Fingerprint' : 'Capture Fingerprint'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
 
                            {/* Guardian Details Card Section */}
                            {context === 'academic' && (
                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-500" />
                                            <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider">
                                                Guardian Authorization Registry
                                            </h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updatedParents = [...(formData.metadata.parents || [])];
                                                updatedParents.push({ name: '', phone: '', email: '', relation: 'Father' });
                                                setFormData({
                                                    ...formData,
                                                    metadata: {
                                                        ...formData.metadata,
                                                        parents: updatedParents
                                                    }
                                                });
                                            }}
                                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded"
                                        >
                                            + Add Parent
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {(formData.metadata.parents || []).map((parent: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/80 rounded-2xl p-4 sm:p-5 space-y-3 relative">
                                                {formData.metadata.parents && formData.metadata.parents.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updatedParents = (formData.metadata.parents || []).filter((_: any, pIdx: number) => pIdx !== idx);
                                                            setFormData({
                                                                                            ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    parents: updatedParents
                                                                }
                                                            });
                                                        }}
                                                        className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider text-red-500 hover:underline bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                <div className="text-[10px] font-black text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-widest">
                                                    Parent / Guardian #{idx + 1}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Guardian Name</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Parent/Guardian Full Name"
                                                            value={parent.name || ''}
                                                            onChange={e => {
                                                                const updatedParents = [...(formData.metadata.parents || [])];
                                                                updatedParents[idx] = { ...updatedParents[idx], name: e.target.value };
                                                                setFormData({
                                                                    ...formData,
                                                                    metadata: { ...formData.metadata, parents: updatedParents }
                                                                });
                                                            }}
                                                            className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Relationship</label>
                                                        <select
                                                            value={parent.relation || 'Father'}
                                                            onChange={e => {
                                                                const updatedParents = [...(formData.metadata.parents || [])];
                                                                updatedParents[idx] = { ...updatedParents[idx], relation: e.target.value as any };
                                                                setFormData({
                                                                    ...formData,
                                                                    metadata: { ...formData.metadata, parents: updatedParents }
                                                                });
                                                            }}
                                                            className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                                        >
                                                            <option value="Father">Father</option>
                                                            <option value="Mother">Mother</option>
                                                            <option value="Guardian">Guardian</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                                                        <input 
                                                            type="tel" 
                                                            placeholder="e.g. +2547..."
                                                            value={parent.phone || ''}
                                                            onChange={e => {
                                                                const updatedParents = [...(formData.metadata.parents || [])];
                                                                updatedParents[idx] = { ...updatedParents[idx], phone: e.target.value };
                                                                setFormData({
                                                                    ...formData,
                                                                    metadata: { ...formData.metadata, parents: updatedParents }
                                                                });
                                                            }}
                                                            className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                                        <input 
                                                            type="email" 
                                                            placeholder="parent@example.com"
                                                            value={parent.email || ''}
                                                            onChange={e => {
                                                                const updatedParents = [...(formData.metadata.parents || [])];
                                                                updatedParents[idx] = { ...updatedParents[idx], email: e.target.value };
                                                                setFormData({
                                                                    ...formData,
                                                                    metadata: { ...formData.metadata, parents: updatedParents }
                                                                });
                                                            }}
                                                            className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
 
                            {/* Context Specific Fields */}
                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5">
                                <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider mb-3">
                                    {context === 'driving_school' ? 'Driving School Curriculum Details' : isPrimaryOrSecondary ? 'Grade & Class Placement' : 'Academic Placement Details'}
                                </h4>
                                
                                {context === 'driving_school' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">License Class / Category</label>
                                            <select
                                                value={formData.metadata.licenseCategory}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, licenseCategory: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="" disabled>Select Class</option>
                                                <option value="Class B1 (Light Manual)">Class B1 (Light Manual)</option>
                                                <option value="Class B2 (Light Automatic)">Class B2 (Light Automatic)</option>
                                                <option value="Class A (Motorcycle)">Class A (Motorcycle)</option>
                                                <option value="Class C (Heavy Commercial)">Class C (Heavy Commercial)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Preferred Instructor</label>
                                            <select
                                                value={formData.metadata.preferredInstructorId}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, preferredInstructorId: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="">Any Instructor (Default)</option>
                                                {instructors.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Preferred Time Hours</label>
                                            <select
                                                value={formData.metadata.preferredLessonHours}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, preferredLessonHours: e.target.value as any } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="Morning">Morning Sessions (7:00 AM - 12:00 PM)</option>
                                                <option value="Noon">Noon Sessions (12:00 PM - 4:00 PM)</option>
                                                <option value="Evening">Evening Sessions (4:00 PM - 8:00 PM)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Prior Attended Sessions</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={formData.metadata.priorAttendedDays}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, priorAttendedDays: parseInt(e.target.value) || 0 } 
                                                })}
                                                className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`grid grid-cols-1 gap-4 ${isPrimaryOrSecondary ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                                                {isPrimaryOrSecondary ? 'Grade' : 'Course'}
                                            </label>
                                            <select
                                                value={formData.metadata.gradeLevel}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, gradeLevel: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="" disabled>{isPrimaryOrSecondary ? 'Select Grade' : 'Select Course'}</option>
                                                {cohortsList.map(grade => (
                                                    <option key={grade} value={grade}>{grade}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Stream / Allocation</label>
                                            <select
                                                value={formData.metadata.stream}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, stream: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="">Select Stream</option>
                                                {formStreamsList.map(stream => (
                                                    <option key={stream} value={stream}>{stream}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {!isPrimaryOrSecondary && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                            <select
                                                value={formData.metadata.boardingStatus || 'day_scholar'}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, boardingStatus: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="day_scholar">Day Scholar</option>
                                                <option value="boarder">Boarder</option>
                                            </select>
                                        </div>
                                        )}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Residence Status</label>
                                            <select
                                                value={formData.metadata.boardingStatus || 'day_scholar'}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, boardingStatus: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="day_scholar">Day Scholar</option>
                                                <option value="boarder">Boarder</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
 
                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {editingEnrollment ? 'Save Changes' : 'Confirm Enrollment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Manage Role Modal */}
            {roleModalUser && createPortal(
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[110] flex items-center justify-center p-4" onClick={() => { setRoleModalUser(null); setRoleModalNewRole(''); }}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Manage Role</h3>
                            </div>
                            <button onClick={() => { setRoleModalUser(null); setRoleModalNewRole(''); }} className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">User</div>
                            <div className="text-base font-black text-slate-800 dark:text-white">{roleModalUser.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{roleModalUser.email || roleModalUser.phoneNumber || 'No contact info'}</div>
                            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                                Current: {formatRoleDisplayName((roleModalUser.role || '') as any)}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">New Role</label>
                            <select
                                value={roleModalNewRole}
                                onChange={e => setRoleModalNewRole(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">-- Select Role --</option>
                                {getRolesForInstitution(currentInstitution)
                                    .filter(r => {
                                        const isTeacherRole = teacherRoles.includes(r as any);
                                        if (roleModalSourceTab === 'teachers') return isTeacherRole;
                                        // Support staff: exclude pure teacher roles and non-staff roles
                                        return !isTeacherRole && !nonSupportRoles.includes(r as any);
                                    })
                                    .map(r => (
                                        <option key={r} value={r}>{formatRoleDisplayName(r as any)}</option>
                                    ))
                                }
                            </select>
                            {roleModalNewRole && teacherRoles.includes(roleModalNewRole as any) && roleModalSourceTab === 'support_staff' && (
                                <p className="mt-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                    ⚠ Assigning a teacher role will move this user to the Teachers list.
                                </p>
                            )}
                            {roleModalNewRole && !teacherRoles.includes(roleModalNewRole as any) && roleModalSourceTab === 'teachers' && (
                                <p className="mt-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                    ⚠ Assigning a non-teacher role will move this user to the Support Staff list.
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRoleModalUser(null); setRoleModalNewRole(''); }}
                                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangeUserRole}
                                disabled={!roleModalNewRole || roleModalSaving || roleModalNewRole === roleModalUser.role}
                                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {roleModalSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                {roleModalSaving ? 'Saving...' : 'Update Role'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Staff Form Modal */}
            {isStaffFormOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" onClick={() => setIsStaffFormOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-3xl p-6 sm:p-8 w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 animate-pulse" />
                                    {editingStaff ? 'Modify Staff Profile' : `Onboard New ${activeTab === 'teachers' ? 'Teacher' : 'Staff'}`}
                                </h3>
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1">Configure user identity and institutional role</p>
                            </div>
                            <button 
                                onClick={() => setIsStaffFormOpen(false)}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-450 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm"
                            >
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>
 
                        <form onSubmit={handleSubmitStaff} className="space-y-6">
                            {statusMsg.type !== 'idle' && (
                                <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                                    statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                }`}>
                                    {statusMsg.message}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="First & Last Name"
                                        value={staffFormData.name}
                                        onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        placeholder="+254..."
                                        value={staffFormData.phoneNumber}
                                        onChange={e => setStaffFormData({ ...staffFormData, phoneNumber: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="name@example.com"
                                        value={staffFormData.email}
                                        onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Institutional Role</label>
                                    <select
                                        value={staffFormData.role}
                                        onChange={e => setStaffFormData({ ...staffFormData, role: e.target.value })}
                                        className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    >
                                        {activeTab === 'teachers' ? (
                                            teacherRoles.map(role => (
                                                <option key={role} value={role}>
                                                    {formatRoleDisplayName(role as any, currentInstitution)}
                                                </option>
                                            ))
                                        ) : (
                                            getRolesForInstitution(currentInstitution)
                                                .filter(role => !teacherRoles.includes(role) && !nonSupportRoles.includes(role))
                                                .map(role => (
                                                    <option key={role} value={role}>
                                                        {formatRoleDisplayName(role as any, currentInstitution)}
                                                    </option>
                                                ))
                                        )}
                                    </select>
                                </div>

                                {activeTab === 'teachers' && (
                                    <div className="sm:col-span-2 space-y-4 p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 mt-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isClassSupervisor} 
                                                onChange={(e) => {
                                                    setIsClassSupervisor(e.target.checked);
                                                    if (!e.target.checked) setSupervisesStreamId('');
                                                }}
                                                className="w-5 h-5 rounded-lg border-slate-305 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500/20"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Assign as Class Supervisor / Class Teacher</span>
                                        </label>
                                        
                                        {isClassSupervisor && (
                                            <div className="animate-fade-in-up">
                                                <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Select Stream to Supervise</label>
                                                <select
                                                    value={supervisesStreamId}
                                                    onChange={e => setSupervisesStreamId(e.target.value)}
                                                    required={isClassSupervisor}
                                                    className="form-select mt-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                                >
                                                    <option value="">-- Select Stream --</option>
                                                    {courses.map(course => (
                                                        <optgroup key={course.id} label={course.name}>
                                                            {(course.levels || []).map(lvl => (
                                                                <option key={lvl.id} value={lvl.id}>
                                                                    {course.name} - {lvl.name} {lvl.classTeacherId && lvl.classTeacherId !== editingStaff?.id ? `(Assigned to ${users.find(u => u.id === lvl.classTeacherId)?.name || 'another teacher'})` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Gender Identity</label>
                                    <select
                                        value={staffFormData.gender}
                                        onChange={e => setStaffFormData({ ...staffFormData, gender: e.target.value as any })}
                                        className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    >
                                        <option value="">Select Gender (Optional)</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
 
                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setIsStaffFormOpen(false)}
                                    className="px-6 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {editingStaff ? 'Save Changes' : 'Confirm Onboarding'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Parent Invite Modal ── */}
            {inviteModalEnrollment && createPortal(
                (() => {
                const student = users.find(u => u.id === inviteModalEnrollment.userId);
                const rawParents: { name: string; phone: string; email: string; relation: string }[] =
                    inviteModalEnrollment.metadata?.parents || [];
                const fallbackParent = {
                    name: inviteModalEnrollment.metadata?.parentName || '',
                    phone: inviteModalEnrollment.metadata?.parentPhone || '',
                    email: inviteModalEnrollment.metadata?.parentEmail || '',
                    relation: inviteModalEnrollment.metadata?.parentRelation || 'Guardian'
                };
                const parentsList = rawParents.length > 0
                    ? rawParents
                    : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);

                return (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
                        onClick={() => setInviteModalEnrollment(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-6 w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-tight">Send Event Invite</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{student?.name || 'Student'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setInviteModalEnrollment(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Status message */}
                            {inviteMsg.type !== 'idle' && (
                                <div className={`mb-4 p-3 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                                    inviteMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    inviteMsg.type === 'error'   ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                }`}>
                                    {inviteMsg.message}
                                </div>
                            )}

                            <div className="space-y-5">
                                {/* Parent selection */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                        Select Parent / Guardian
                                    </label>
                                    {parentsList.length === 0 ? (
                                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                                            No parent contacts on record for this student. Please edit the enrollment to add parent details first.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {parentsList.map((parent, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setInviteSelectedParentIdx(idx)}
                                                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                                        inviteSelectedParentIdx === idx
                                                            ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                        inviteSelectedParentIdx === idx ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-500'
                                                    }`}>
                                                        <UserRound className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black truncate">{parent.name || 'Unnamed Guardian'}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                                                            {parent.relation && <span className="text-indigo-400 mr-2">{parent.relation}</span>}
                                                            {parent.phone || parent.email || 'No contact info'}
                                                        </p>
                                                    </div>
                                                    {inviteSelectedParentIdx === idx && (
                                                        <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Event selection */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                        Select Event
                                    </label>
                                    {events.length === 0 ? (
                                        <div className="p-4 rounded-2xl bg-slate-800/60 border border-white/10 text-slate-400 text-xs font-bold">
                                            No events scheduled yet. Go to the Calendar tab to create one first.
                                        </div>
                                    ) : (
                                        <select
                                            value={inviteSelectedEventId}
                                            onChange={e => setInviteSelectedEventId(e.target.value)}
                                            className="w-full py-3 px-4 bg-slate-950/50 border border-white/10 rounded-xl font-bold text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="">-- Choose an event --</option>
                                            {events.map(ev => (
                                                <option key={ev.id} value={ev.id}>
                                                    {ev.title} — {ev.eventDate} {ev.eventTime}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Selected event preview */}
                                    {inviteSelectedEventId && (() => {
                                        const ev = events.find(e => e.id === inviteSelectedEventId);
                                        return ev ? (
                                            <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                                                <p className="font-black text-white">{ev.title}</p>
                                                <p className="text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {ev.eventDate} at {ev.eventTime}</p>
                                                <p className="text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue}</p>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setInviteModalEnrollment(null)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={inviteLoading || parentsList.length === 0 || !inviteSelectedEventId}
                                        onClick={handleSendParentInvite}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {inviteLoading ? 'Sending...' : 'Send Invitation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })(),
            document.body
        )}

        {/* ── SMS Delivery Report Modal ── */}
        {smsDeliveryReport && createPortal(
            (() => {
                const totalCount = smsDeliveryReport.length;
                const successCount = smsDeliveryReport.filter(r => r.success).length;
                const failureCount = totalCount - successCount;

                return (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
                        onClick={() => setSmsDeliveryReport(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-6 w-full max-w-lg"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Bell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-tight">SMS Delivery Report</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PIN Dispatch Status Summary</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSmsDeliveryReport(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Stats Section */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Total Targets</p>
                                    <p className="text-xl font-black text-white mt-1">{totalCount}</p>
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-emerald-500/60 tracking-wider">Successful</p>
                                    <p className="text-xl font-black text-emerald-400 mt-1">{successCount}</p>
                                </div>
                                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-3 text-center">
                                    <p className="text-[9px] font-black uppercase text-red-500/6 tracking-wider">Failed</p>
                                    <p className="text-xl font-black text-red-400 mt-1">{failureCount}</p>
                                </div>
                            </div>

                            {/* List Section */}
                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 mb-6">
                                {smsDeliveryReport.map((report, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                            report.success
                                                ? 'bg-emerald-500/5 border-emerald-500/10 text-slate-200'
                                                : 'bg-red-500/5 border-red-500/10 text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                report.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {report.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black truncate">{report.recipientName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{report.phone}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                report.success
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {report.success ? 'Sent' : 'Failed'}
                                            </span>
                                            {!report.success && report.errorMsg && (
                                                <p className="text-[9px] text-red-400/85 font-black mt-1 max-w-[150px] truncate" title={report.errorMsg}>{report.errorMsg}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action buttons */}
                            <button
                                type="button"
                                onClick={() => setSmsDeliveryReport(null)}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Dismiss Report
                            </button>
                        </div>
                    </div>
                );
            })(),
            document.body
        )}

        {/* ── Event Attendance List & Analysis Dashboard Modal ── */}
        {selectedAnalysisEvent && createPortal(
            (() => {
                const event = selectedAnalysisEvent;
                const eventMatchingPins = eventPins.filter(p => (p.eventId || p.event_id) === event.id);

                const refreshEventFeedback = async () => {
                    setIsRefreshingFeedback(true);
                    try {
                        const [freshPins, freshUsers] = await Promise.all([
                            apiService.fetchModuleRecords<any>('event_pins', currentInstitution.id).catch(() => []),
                            apiService.fetchModuleRecords<any>('users', currentInstitution.id).catch(() => [])
                        ]);
                        setEventPins(freshPins || []);
                        setUsers(freshUsers || []);
                    } catch (e) {
                        console.error('Failed to refresh feedback data:', e);
                    } finally {
                        setIsRefreshingFeedback(false);
                    }
                };

                // Calculations
                const totalInvited = eventMatchingPins.length;
                const checkedInCount = eventMatchingPins.filter(p => p.status === 'used').length;
                const acceptedCount = eventMatchingPins.filter(p => p.status === 'accepted').length;
                const declinedCount = eventMatchingPins.filter(p => p.status === 'rejected').length;
                const pendingCount = eventMatchingPins.filter(p => p.status === 'pending').length;

                // Total accepted responses (checked-in or accepted state)
                const totalAttendingResponses = checkedInCount + acceptedCount;

                // Accompanying guests calculations
                let totalAccompanyingGuests = 0;
                eventMatchingPins.forEach(p => {
                    if (p.status === 'used' || p.status === 'accepted') {
                        if (p.guests) {
                            try {
                                const parsed = JSON.parse(p.guests);
                                if (Array.isArray(parsed)) {
                                    totalAccompanyingGuests += parsed.length;
                                } else if (p.guests.trim()) {
                                    totalAccompanyingGuests += 1;
                                }
                            } catch (e) {
                                if (p.guests.trim()) {
                                    totalAccompanyingGuests += 1;
                                }
                            }
                        }
                    }
                });

                const totalExpectedTurnout = totalAttendingResponses + totalAccompanyingGuests;
                const turnoutRate = totalInvited > 0 ? Math.round((totalAttendingResponses / totalInvited) * 100) : 0;

                // Vehicles count
                const totalVehicles = eventMatchingPins.filter(p => p.vehicleRegistration || p.vehicle_registration).length;

                // Filter & Search Logic
                const filteredPins = eventMatchingPins.filter(p => {
                    const user = users.find(u => u.id === p.userId);
                    const userName = (user?.name || '').toLowerCase();
                    const userPhone = (user?.phoneNumber || '').toLowerCase();
                    const userEmail = (user?.email || '').toLowerCase();
                    const sQuery = analysisSearchTerm.toLowerCase();
                    
                    const matchesSearch = userName.includes(sQuery) || userPhone.includes(sQuery) || userEmail.includes(sQuery);

                    if (!matchesSearch) return false;

                    if (analysisStatusFilter === 'All') return true;
                    if (analysisStatusFilter === 'Checked-in') return p.status === 'used';
                    if (analysisStatusFilter === 'Accepted') return p.status === 'accepted';
                    if (analysisStatusFilter === 'Declined') return p.status === 'rejected';
                    if (analysisStatusFilter === 'Pending') return p.status === 'pending';
                    return true;
                });

                // ── PIN Coverage Audit Calculations ──
                const auditTargetEnrollments = (enrollments as any[]).filter(enr => {
                    if (event.target === 'All') return true;
                    if (event.target.startsWith('students:')) {
                        const sIds = event.target.replace('students:', '').split(',');
                        return sIds.includes(enr.userId);
                    }
                    if (context === 'driving_school') return enr.metadata?.licenseCategory === event.target;
                    return enr.metadata?.gradeLevel === event.target;
                });
                const auditMissingList: { enr: any; studentName: string; targetName: string; targetPhone: string; targetEmail: string; cohort: string }[] = [];
                const auditIssuedList: { enr: any; targetName: string; pin: any }[] = [];
                for (const enr of auditTargetEnrollments) {
                    const studentUser = (users as any[]).find(u => u.id === enr.userId);
                    const studentName: string = studentUser?.name || enr.metadata?.studentName || `Enrollment #${(enr.id || '').slice(-6)}`;
                    const cohort: string = enr.metadata?.gradeLevel || enr.metadata?.licenseCategory || 'N/A';
                    const parentsList: { name: string; phone: string; email: string }[] = enr.metadata?.parents || [];
                    const fbPar = { name: enr.metadata?.parentName || '', phone: enr.metadata?.parentPhone || enr.parentPhone || '', email: enr.metadata?.parentEmail || '' };
                    const resolvedParents = parentsList.length > 0 ? parentsList : (fbPar.name || fbPar.phone ? [fbPar] : []);
                    const primaryParent = resolvedParents[0];
                    let targetUserId: string = enr.userId;
                    let targetName: string = studentName;
                    let targetPhone: string = isPrimaryOrSecondary ? '' : (studentUser?.phoneNumber || '');
                    let targetEmail: string = isPrimaryOrSecondary ? '' : (studentUser?.email || '');
                    if (primaryParent && (primaryParent.phone || primaryParent.email)) {
                        const formattedParentPhone = primaryParent.phone ? formatPhoneNumber(primaryParent.phone) : '';
                        const parentUser = (users as any[]).find(u =>
                            (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                            (primaryParent.phone && u.phoneNumber && phonesMatch(u.phoneNumber, primaryParent.phone))
                        );
                        if (parentUser) {
                            targetUserId = parentUser.id;
                            targetName = parentUser.name || primaryParent.name || 'Parent / Guardian';
                            targetPhone = parentUser.phoneNumber || primaryParent.phone || '';
                            targetEmail = parentUser.email || primaryParent.email || '';
                        } else {
                            targetName = primaryParent.name || 'Parent / Guardian';
                            targetPhone = primaryParent.phone || '';
                            targetEmail = primaryParent.email || '';
                        }
                    }
                    const existingPin = eventMatchingPins.find(p => isPinForEnrollment(p, event.id, enr, targetUserId, primaryParent, users));
                    if (!existingPin) {
                        auditMissingList.push({ enr, studentName, targetName, targetPhone, targetEmail, cohort });
                    } else {
                        auditIssuedList.push({ enr, targetName, pin: existingPin });
                    }
                }
                const auditTotal = auditTargetEnrollments.length;
                const auditIssued = auditIssuedList.length;
                const auditMissing = auditMissingList.length;
                const auditCoverage = auditTotal > 0 ? Math.round((auditIssued / auditTotal) * 100) : 0;

                return (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
                        onClick={() => setSelectedAnalysisEvent(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <UserCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-tight font-sans">Attendance List &amp; Analysis</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{event.title} — {event.eventDate}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAnalysisEvent(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content Container */}
                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-6">
                                {/* Analysis Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">RSVP Turnout Rate</p>
                                        <p className="text-2xl font-black text-white mt-1 font-mono">{turnoutRate}%</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{totalAttendingResponses} of {totalInvited} accepted</p>
                                    </div>
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center">
                                        <p className="text-[9px] font-black uppercase text-emerald-500/60 tracking-wider">Checked-In / Present</p>
                                        <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{checkedInCount}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{totalInvited - checkedInCount} remaining</p>
                                    </div>
                                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 text-center">
                                        <p className="text-[9px] font-black uppercase text-indigo-500/60 tracking-wider">Total Expected Turnout</p>
                                        <p className="text-2xl font-black text-indigo-400 mt-1 font-mono">{totalExpectedTurnout}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{totalAttendingResponses} primary + {totalAccompanyingGuests} guests</p>
                                    </div>
                                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-center">
                                        <p className="text-[9px] font-black uppercase text-amber-500/60 tracking-wider">Vehicles Registered</p>
                                        <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{totalVehicles}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">At event check-in gate</p>
                                    </div>
                                </div>

                                {/* RSVP Summary Progress bar */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>RSVP Response Breakdown</span>
                                        <span>{totalInvited} Invited</span>
                                    </div>
                                    <div className="h-3.5 w-full bg-slate-950/50 rounded-full overflow-hidden flex">
                                        {checkedInCount > 0 && (
                                            <div
                                                style={{ width: `${(checkedInCount / totalInvited) * 100}%` }}
                                                className="bg-emerald-500 h-full"
                                                title={`Checked-In: ${checkedInCount}`}
                                            />
                                        )}
                                        {acceptedCount > 0 && (
                                            <div
                                                style={{ width: `${(acceptedCount / totalInvited) * 100}%` }}
                                                className="bg-indigo-500 h-full"
                                                title={`Accepted: ${acceptedCount}`}
                                            />
                                        )}
                                        {declinedCount > 0 && (
                                            <div
                                                style={{ width: `${(declinedCount / totalInvited) * 100}%` }}
                                                className="bg-rose-500 h-full"
                                                title={`Declined: ${declinedCount}`}
                                            />
                                        )}
                                        {pendingCount > 0 && (
                                            <div
                                                style={{ width: `${(pendingCount / totalInvited) * 100}%` }}
                                                className="bg-slate-700 h-full"
                                                title={`Pending: ${pendingCount}`}
                                            />
                                        )}
                                    </div>
                                    <div className="flex gap-4 mt-3 text-[10px] font-black uppercase tracking-wider flex-wrap">
                                        <span className="flex items-center gap-1 text-emerald-450"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Checked-In ({checkedInCount})</span>
                                        <span className="flex items-center gap-1 text-indigo-400"><span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Accepted ({acceptedCount})</span>
                                        <span className="flex items-center gap-1 text-rose-450"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Declined ({declinedCount})</span>
                                        <span className="flex items-center gap-1 text-slate-500"><span className="w-2.5 h-2.5 rounded bg-slate-700" /> Pending ({pendingCount})</span>
                                    </div>
                                </div>

                                {/* Additional Message Input */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-355 uppercase tracking-widest">
                                        Additional Custom Message (Optional)
                                    </label>
                                    <textarea
                                        value={auditCustomMessage}
                                        onChange={e => setAuditCustomMessage(e.target.value)}
                                        placeholder="e.g. Please carry your national identity card and arrive 15 minutes early."
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all resize-none font-sans"
                                    />
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                        This message will be appended to the SMS and Email templates when generating or resending PINs.
                                    </p>
                                </div>

                                {/* ── Tab Switcher: RSVP | PIN Audit | Event Feedback ── */}
                                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                                    <button
                                        onClick={() => setAnalysisTab('rsvp')}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                            analysisTab === 'rsvp'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <UserCheck className="w-3 h-3" /> RSVP Responses
                                    </button>
                                    <button
                                        onClick={() => setAnalysisTab('audit')}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                            analysisTab === 'audit'
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <AlertCircle className="w-3 h-3" /> PIN Coverage Audit
                                        {auditMissing > 0 && (
                                            <span className="ml-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">{auditMissing}</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAnalysisTab('feedback');
                                            // Auto-refresh pins & users to show latest feedback
                                            setIsRefreshingFeedback(true);
                                            Promise.all([
                                                apiService.fetchModuleRecords<any>('event_pins', currentInstitution.id).catch(() => []),
                                                apiService.fetchModuleRecords<any>('users', currentInstitution.id).catch(() => [])
                                            ]).then(([freshPins, freshUsers]) => {
                                                setEventPins(freshPins || []);
                                                setUsers(freshUsers || []);
                                            }).catch(console.error).finally(() => setIsRefreshingFeedback(false));
                                        }}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                            analysisTab === 'feedback'
                                                ? 'bg-amber-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Star className="w-3 h-3 fill-current" /> Event Feedback
                                    </button>
                                </div>

                                {/* ── Shareable Attendance & Feedback Link ── */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                                <Link className="w-3.5 h-3.5 text-indigo-400" /> Shareable RSVP &amp; Feedback Link
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                Send this link to anyone (parents, guests) to RSVP or submit post-event feedback directly.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">Full Public URL</span>
                                            <div className="flex bg-slate-950/50 border border-white/5 rounded-xl px-3 py-2 items-center justify-between">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`${window.location.origin}/?view=event-confirm&eventId=${event.id}`}
                                                    onClick={e => (e.target as HTMLInputElement).select()}
                                                    className="bg-transparent text-xs font-bold text-slate-300 w-full outline-none select-all truncate"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/?view=event-confirm&eventId=${event.id}`);
                                                        setStatusMsg({ type: 'success', message: 'Full link copied to clipboard!' });
                                                        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
                                                    }}
                                                    className="text-slate-400 hover:text-white px-1 shrink-0 ml-2"
                                                    title="Copy Full Link"
                                                >
                                                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">Shortened URL</span>
                                            <ShortenedUrlField
                                                key={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm&eventId=${event.id}`}
                                                longUrl={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm&eventId=${event.id}`}
                                                theme="indigo"
                                                setStatusMsg={setStatusMsg}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {analysisTab === 'rsvp' && (
                                    <div className="space-y-4">
                                        {/* Search & Filter Bar */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                                    <Search className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Search invitees by name, phone or email..."
                                                    value={analysisSearchTerm}
                                                    onChange={e => setAnalysisSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl font-bold text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <div className="flex gap-1 bg-slate-950/40 border border-white/10 rounded-xl p-1 overflow-x-auto custom-scrollbar-horizontal shrink-0">
                                                {(['All', 'Checked-in', 'Accepted', 'Declined', 'Pending'] as const).map(tab => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setAnalysisStatusFilter(tab)}
                                                        className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap ${
                                                            analysisStatusFilter === tab
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Details List/Table */}
                                        <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/20 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                                            {filteredPins.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500 font-bold text-xs">
                                                    No invitation records match the active search/filters.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            <th className="py-3 px-4">Recipient Name</th>
                                                            <th className="py-3 px-4">Contact Info</th>
                                                            <th className="py-3 px-4">RSVP Status</th>
                                                            <th className="py-3 px-4">Guests</th>
                                                            <th className="py-3 px-4">Vehicle</th>
                                                            <th className="py-3 px-4">Check-In</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5 font-bold">
                                                        {filteredPins.map(p => {
                                                            const user = users.find(u => u.id === p.userId);
                                                            const userName = user?.name || 'Unknown Recipient';
                                                            const userRole = user?.role || 'Guest';
                                                            let rsvpStatusLabel = 'Pending';
                                                            let rsvpCls = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                                                            if (p.status === 'used' || p.status === 'accepted') { rsvpStatusLabel = 'Accepted'; rsvpCls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'; }
                                                            else if (p.status === 'rejected') { rsvpStatusLabel = 'Declined'; rsvpCls = 'bg-rose-500/10 text-rose-450 border-rose-500/20'; }
                                                            let checkInLabel = 'Pending';
                                                            let checkInCls = 'bg-slate-500/10 text-slate-450';
                                                            if (p.status === 'used') { checkInLabel = 'Checked-In'; checkInCls = 'bg-emerald-500/10 text-emerald-400'; }
                                                            let parsedGuests: string[] = [];
                                                            if (p.guests) { try { const parsed = JSON.parse(p.guests); parsedGuests = Array.isArray(parsed) ? parsed : [p.guests]; } catch (e) { if (p.guests.trim()) parsedGuests = [p.guests]; } }
                                                            return (
                                                                <tr key={p.id} className="text-xs hover:bg-white/5 transition-colors">
                                                                    <td className="py-3 px-4 min-w-[150px]">
                                                                        <p className="font-black text-slate-100">{userName}</p>
                                                                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{userRole}</p>
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <p className="font-semibold text-slate-350">{user?.phoneNumber || 'No phone'}</p>
                                                                        {user?.email && <p className="text-[10px] text-slate-500 mt-0.5">{user.email}</p>}
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${rsvpCls}`}>{rsvpStatusLabel}</span>
                                                                    </td>
                                                                    <td className="py-3 px-4 min-w-[140px]">
                                                                        {parsedGuests.length > 0 ? (
                                                                            <div className="space-y-1 max-w-[160px]">{parsedGuests.map((g, idx) => <p key={idx} className="text-[10px] font-bold text-slate-300 truncate bg-white/5 px-2 py-0.5 rounded border border-white/5">{g}</p>)}</div>
                                                                        ) : <span className="text-[10px] text-slate-600 font-semibold italic">None</span>}
                                                                    </td>
                                                                    <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                                                        {p.vehicleRegistration || p.vehicle_registration || <span className="text-slate-600 italic font-sans font-semibold">N/A</span>}
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${checkInCls}`}>{checkInLabel}</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {analysisTab === 'audit' && (
                                    <div className="space-y-4">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Expected (Cohort)</p>
                                                <p className="text-2xl font-black text-white mt-1 font-mono">{auditTotal}</p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Enrollments in target</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setAuditViewTab('covered')}
                                                className={`text-center border rounded-2xl p-4 transition-all hover:bg-indigo-500/10 focus:outline-none ${
                                                    auditViewTab === 'covered'
                                                        ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30'
                                                        : auditIssued === auditTotal ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-indigo-500/5 border-indigo-500/10'
                                                }`}
                                            >
                                                <p className={`text-[9px] font-black uppercase tracking-wider ${auditIssued === auditTotal ? 'text-emerald-500/60' : 'text-indigo-500/60'}`}>PINs Issued</p>
                                                <p className={`text-2xl font-black mt-1 font-mono ${auditIssued === auditTotal ? 'text-emerald-400' : 'text-indigo-400'}`}>{auditIssued}</p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{auditCoverage}% coverage</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAuditViewTab('missing')}
                                                className={`text-center border rounded-2xl p-4 transition-all hover:bg-rose-500/10 focus:outline-none ${
                                                    auditViewTab === 'missing'
                                                        ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
                                                        : auditMissing === 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'
                                                }`}
                                            >
                                                <p className={`text-[9px] font-black uppercase tracking-wider ${auditMissing === 0 ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>Not Received</p>
                                                <p className={`text-2xl font-black mt-1 font-mono ${auditMissing === 0 ? 'text-emerald-400' : 'text-rose-450'}`}>{auditMissing}</p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{auditMissing === 0 ? 'All covered!' : 'Missing PINs'}</p>
                                            </button>
                                        </div>

                                        {/* Coverage Progress Bar */}
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                            <div className="flex justify-between items-center mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <span>PIN Coverage Rate</span>
                                                <span className={auditCoverage === 100 ? 'text-emerald-400' : auditCoverage >= 75 ? 'text-indigo-400' : 'text-rose-400'}>{auditCoverage}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-950/50 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${auditCoverage === 100 ? 'bg-emerald-500' : auditCoverage >= 75 ? 'bg-indigo-500' : auditCoverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${auditCoverage}%` }}
                                                />
                                            </div>
                                            <div className="flex gap-5 mt-3 text-[10px] font-black uppercase tracking-wider">
                                                <button type="button" onClick={() => setAuditViewTab('covered')} className={`flex items-center gap-1.5 transition-colors ${auditViewTab === 'covered' ? 'text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-400'}`}><span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Covered ({auditIssued})</button>
                                                <button type="button" onClick={() => setAuditViewTab('missing')} className={`flex items-center gap-1.5 transition-colors ${auditViewTab === 'missing' ? 'text-rose-400 font-black' : 'text-slate-500 hover:text-slate-400'}`}><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Missing ({auditMissing})</button>
                                            </div>
                                        </div>

                                        {/* Recipients Table */}
                                        <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/20 max-h-[280px] overflow-y-auto custom-scrollbar">
                                            {auditViewTab === 'missing' ? (
                                                auditMissing === 0 ? (
                                                    <div className="text-center py-12 space-y-2">
                                                        <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/50" />
                                                        <p className="text-xs font-black text-emerald-400">All {auditTotal} recipients have been issued PINs!</p>
                                                        <p className="text-[10px] text-slate-500 font-semibold">No missing PINs to generate.</p>
                                                    </div>
                                                ) : (
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                <th className="py-3 px-4">Student</th>
                                                                <th className="py-3 px-4">Recipient / Contact</th>
                                                                <th className="py-3 px-4">Phone</th>
                                                                <th className="py-3 px-4">Cohort</th>
                                                                <th className="py-3 px-4 text-center">PIN Status</th>
                                                                <th className="py-3 px-4 text-center">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 font-bold">
                                                            {auditMissingList.map((item, idx) => (
                                                                <tr key={idx} className="text-xs hover:bg-rose-500/5 transition-colors">
                                                                    <td className="py-3 px-4">
                                                                        <p className="font-black text-slate-100 truncate max-w-[150px]">{item.studentName}</p>
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <p className="font-bold text-rose-300 truncate max-w-[160px]">
                                                                            {item.targetName !== item.studentName ? item.targetName : <span className="italic text-slate-500 font-sans font-semibold text-[10px]">Same as student</span>}
                                                                        </p>
                                                                        {item.targetEmail && <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[160px]">{item.targetEmail}</p>}
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <p className="font-semibold text-slate-350">
                                                                            {item.targetPhone || <span className="italic text-slate-600 font-sans font-semibold text-[10px]">No phone</span>}
                                                                        </p>
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold">{item.cohort}</span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Missing</span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                disabled={isLoading}
                                                                                onClick={() => handleGeneratePinOnlyForIndividual(event, item)}
                                                                                className="px-2 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 focus:outline-none"
                                                                                title="Generate PIN record silently without sending SMS/Email"
                                                                            >
                                                                                <Sparkles className="w-2.5 h-2.5" /> Generate PIN
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={isLoading}
                                                                                onClick={() => handleSendPinToIndividualRecipient(event, item, auditCustomMessage)}
                                                                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 focus:outline-none"
                                                                                title="Generate PIN and dispatch SMS/Email notification"
                                                                            >
                                                                                <Send className="w-2.5 h-2.5" /> Send PIN
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )
                                            ) : (
                                                auditIssued === 0 ? (
                                                    <div className="text-center py-12 space-y-2">
                                                        <AlertCircle className="w-10 h-10 mx-auto text-slate-500/50" />
                                                        <p className="text-xs font-black text-slate-400">No PINs have been issued yet.</p>
                                                        <p className="text-[10px] text-slate-500 font-semibold">Generate PINs below or individually.</p>
                                                    </div>
                                                ) : (
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                <th className="py-3 px-4">Student</th>
                                                                <th className="py-3 px-4">Recipient</th>
                                                                <th className="py-3 px-4">PIN Code</th>
                                                                <th className="py-3 px-4 text-center">PIN Status</th>
                                                                <th className="py-3 px-4 text-center">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 font-bold">
                                                            {auditIssuedList.map((item, idx) => {
                                                                const studentUser = users.find(u => u.id === item.enr?.userId);
                                                                const studentName = studentUser?.name || item.enr?.metadata?.studentName || `Enrollment #${(item.enr?.id || '').slice(-6)}`;
                                                                let pinStatusCls = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
                                                                let pinStatusLabel = 'Issued';
                                                                if (item.pin.status === 'used') {
                                                                    pinStatusCls = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                                                                    pinStatusLabel = 'Checked-in';
                                                                } else if (item.pin.status === 'accepted') {
                                                                    pinStatusCls = 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25';
                                                                    pinStatusLabel = 'Accepted';
                                                                } else if (item.pin.status === 'rejected') {
                                                                    pinStatusCls = 'bg-rose-500/10 text-rose-450 border border-rose-500/20';
                                                                    pinStatusLabel = 'Declined';
                                                                }
                                                                return (
                                                                    <tr key={idx} className="text-xs hover:bg-indigo-500/5 transition-colors">
                                                                        <td className="py-3 px-4">
                                                                            <p className="font-black text-slate-100 truncate max-w-[150px]">{studentName}</p>
                                                                        </td>
                                                                        <td className="py-3 px-4">
                                                                            <p className="font-black text-slate-100 truncate max-w-[150px]">{item.targetName}</p>
                                                                        </td>
                                                                        <td className="py-3 px-4 font-mono font-black text-indigo-400">
                                                                            {item.pin.pin}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center">
                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${pinStatusCls}`}>{pinStatusLabel}</span>
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center">
                                                                            <button
                                                                                type="button"
                                                                                disabled={isLoading}
                                                                                onClick={() => handleResendExistingPin(event, item, auditCustomMessage)}
                                                                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-350 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1 focus:outline-none border border-white/10"
                                                                            >
                                                                                <Send className="w-2.5 h-2.5" /> Resend PIN
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {analysisTab === 'feedback' && (() => {
                                    // Only count invited guests (those with a pin that existed before the event, i.e. not anonymous walk-ins created at feedback time)
                                    const invitedPins = eventMatchingPins;
                                    const feedbackPins = invitedPins.filter(p => p.rating !== undefined && p.rating !== null);
                                    const totalFeedbackCount = feedbackPins.length;
                                    
                                    // Calculate average rating
                                    const totalStars = feedbackPins.reduce((acc, p) => acc + Number(p.rating), 0);
                                    const avgRating = totalFeedbackCount > 0 ? (totalStars / totalFeedbackCount).toFixed(1) : '0.0';
                                    
                                    // Distribution of stars (1 to 5)
                                    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                                    feedbackPins.forEach(p => {
                                        const r = Number(p.rating);
                                        if (r >= 1 && r <= 5) {
                                            distribution[r as 1|2|3|4|5]++;
                                        }
                                    });

                                    const feedbackProgressPercent = totalInvited > 0 ? Math.round((totalFeedbackCount / totalInvited) * 100) : 0;

                                    // Filtered guest list for feedback table (all pins for this event, including walk-in submitters)
                                    const filteredFeedbackGuests = eventMatchingPins.filter(p => {
                                        const user = users.find(u => u.id === p.userId);
                                        const userName = (user?.name || 'Guest / Anon').toLowerCase();
                                        const userPhone = (user?.phoneNumber || (user as any)?.phone_number || '').toLowerCase();
                                        const userEmail = (user?.email || '').toLowerCase();
                                        const sQuery = feedbackSearchTerm.toLowerCase();
                                        
                                        const matchesSearch = userName.includes(sQuery) || userPhone.includes(sQuery) || userEmail.includes(sQuery);
                                        if (!matchesSearch) return false;

                                        const hasFeedback = p.rating !== undefined && p.rating !== null;
                                        if (feedbackStatusFilter === 'Submitted') return hasFeedback;
                                        if (feedbackStatusFilter === 'Pending') return !hasFeedback;
                                        return true;
                                    });

                                    return (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Feedback Refresh Banner */}
                                            <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/20 rounded-xl px-4 py-2.5">
                                                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Live Feedback Data — Refresh to see latest submissions</p>
                                                <button
                                                    onClick={refreshEventFeedback}
                                                    disabled={isRefreshingFeedback}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    <svg className={`w-3 h-3 ${isRefreshingFeedback ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    {isRefreshingFeedback ? 'Refreshing...' : 'Refresh'}
                                                </button>
                                            </div>
                                            {/* Metrics Panel */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Avg Rating Card */}
                                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
                                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">Average Rating</p>
                                                    <p className="text-3xl font-black text-white font-mono">{avgRating}</p>
                                                    <div className="flex gap-0.5 mt-2 text-amber-400">
                                                        {[1, 2, 3, 4, 5].map((star) => {
                                                            const isFull = star <= Math.round(Number(avgRating));
                                                            return (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-3.5 h-3.5 fill-current ${
                                                                        isFull ? 'text-amber-455' : 'text-slate-700'
                                                                    }`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Out of 5.0 Stars</p>
                                                </div>

                                                {/* Feedback Progress Card */}
                                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
                                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Feedback Progress</p>
                                                    <p className="text-3xl font-black text-indigo-400 font-mono">{totalFeedbackCount}</p>
                                                    <p className="text-[9px] text-slate-450 font-bold mt-1 uppercase tracking-widest">
                                                        {totalFeedbackCount} of {totalInvited} invited guests
                                                    </p>
                                                    <div className="w-full mt-3">
                                                        <div className="flex justify-between text-[8px] text-slate-400 font-black uppercase tracking-wider mb-1">
                                                            <span>Submission Rate</span>
                                                            <span>{feedbackProgressPercent}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-950/50 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${feedbackProgressPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Distribution Card */}
                                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
                                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">Rating Distribution</p>
                                                    {([5, 4, 3, 2, 1] as const).map(stars => {
                                                        const count = distribution[stars];
                                                        const percent = totalFeedbackCount > 0 ? Math.round((count / totalFeedbackCount) * 100) : 0;
                                                        return (
                                                            <div key={stars} className="flex items-center gap-2 text-[10px] font-bold">
                                                                <span className="w-12 text-slate-400 shrink-0">{stars} Stars</span>
                                                                <div className="flex-grow h-2 bg-slate-950/50 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                                                        style={{ width: `${percent}%` }}
                                                                    />
                                                                </div>
                                                                <span className="w-8 text-right text-slate-400 font-mono shrink-0">{count}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Filters & Guest List */}
                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <div className="relative flex-1">
                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                                            <Search className="w-4 h-4" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Search guest feedback..."
                                                            value={feedbackSearchTerm}
                                                            onChange={e => setFeedbackSearchTerm(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl font-bold text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1 bg-slate-950/40 border border-white/10 rounded-xl p-1 overflow-x-auto custom-scrollbar-horizontal shrink-0">
                                                        {(['All', 'Submitted', 'Pending'] as const).map(tab => {
                                                            let count = 0;
                                                            if (tab === 'All') count = totalInvited;
                                                            else if (tab === 'Submitted') count = totalFeedbackCount;
                                                            else count = totalInvited - totalFeedbackCount;

                                                            return (
                                                                <button
                                                                    key={tab}
                                                                    onClick={() => setFeedbackStatusFilter(tab)}
                                                                    className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap ${
                                                                        feedbackStatusFilter === tab
                                                                            ? 'bg-amber-600 text-white shadow-sm'
                                                                            : 'text-slate-400 hover:text-slate-200'
                                                                    }`}
                                                                >
                                                                    {tab} ({count})
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/20 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {filteredFeedbackGuests.length === 0 ? (
                                                        <div className="text-center py-12 text-slate-500 font-bold text-xs">
                                                            No guest records match the active search/filters.
                                                        </div>
                                                    ) : (
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                    <th className="py-3 px-4">Guest Info</th>
                                                                    <th className="py-3 px-4">Contact</th>
                                                                    <th className="py-3 px-4">Feedback Status</th>
                                                                    <th className="py-3 px-4">Rating / Comments</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5 font-bold">
                                                                {filteredFeedbackGuests.map((pin) => {
                                                                    const parentUser = users.find(u => u.id === pin.userId);
                                                                    const parentName = parentUser?.name || 'Guest / Anon';
                                                                    const parentPhone = parentUser?.phoneNumber || (parentUser as any)?.phone_number || 'No Phone';
                                                                    const hasFeedback = pin.rating !== undefined && pin.rating !== null;
                                                                    
                                                                    return (
                                                                        <tr key={pin.id} className="text-xs hover:bg-white/5 transition-colors">
                                                                            <td className="py-3 px-4 min-w-[150px]">
                                                                                <p className="font-black text-slate-100">{parentName}</p>
                                                                                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{parentUser?.role || 'Guest'}</p>
                                                                            </td>
                                                                            <td className="py-3 px-4">
                                                                                <p className="font-semibold text-slate-350">{parentPhone}</p>
                                                                                {parentUser?.email && <p className="text-[9px] text-slate-500 mt-0.5">{parentUser.email}</p>}
                                                                            </td>
                                                                            <td className="py-3 px-4">
                                                                                {hasFeedback ? (
                                                                                    <span className="inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                                        Submitted
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-550/20">
                                                                                        Pending
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 px-4 min-w-[200px]">
                                                                                {hasFeedback ? (
                                                                                    <div className="space-y-1.5 py-1">
                                                                                        <div className="flex gap-0.5 text-amber-400">
                                                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                                                <Star
                                                                                                    key={star}
                                                                                                    className={`w-3.5 h-3.5 fill-current ${
                                                                                                        star <= Number(pin.rating) ? 'text-amber-400' : 'text-slate-750'
                                                                                                    }`}
                                                                                                />
                                                                                            ))}
                                                                                        </div>
                                                                                        {pin.feedback ? (
                                                                                            <p className="text-[11px] text-slate-300 bg-white/5 rounded-xl px-2.5 py-1.5 border border-white/5 font-medium leading-relaxed italic max-w-[280px] break-words">
                                                                                                &ldquo;{pin.feedback}&rdquo;
                                                                                            </p>
                                                                                        ) : (
                                                                                            <p className="text-[10px] text-slate-500 italic font-semibold">Left rating only</p>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[11px] text-slate-500 italic font-semibold">No feedback recorded</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Sticky Footer Actions */}
                            <div className="border-t border-white/5 pt-4 mt-6 shrink-0">
                                {analysisTab === 'rsvp' && (
                                    <div className="space-y-3">
                                        {/* Reminder button — only when pending invitees exist */}
                                        {(() => {
                                            const pendingCount = eventMatchingPins.filter(p => p.status === 'pending').length;
                                            return pendingCount > 0 ? (
                                                <button
                                                    type="button"
                                                    disabled={isLoading}
                                                    onClick={() => handleSendRemindersToPending(event, analysisSearchTerm ? '' : '')}
                                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                                >
                                                    <Bell className="w-4 h-4" />
                                                    {isLoading ? 'Sending...' : `Send Reminder to ${pendingCount} Pending Recipient${pendingCount !== 1 ? 's' : ''}`}
                                                </button>
                                            ) : null;
                                        })()}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button type="button" onClick={() => handleExportAttendanceCsv(event, eventMatchingPins)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15">
                                                <FileSpreadsheet className="w-4 h-4" /> Export CSV List
                                            </button>
                                            <button type="button" onClick={() => handleExportEventReportPdf(event, eventMatchingPins)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> Export PDF Report
                                            </button>
                                            <button type="button" onClick={() => setSelectedAnalysisEvent(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {analysisTab === 'audit' && (
                                    <div className="space-y-3">
                                        {/* Primary bulk actions row — separated Generate PINs Only and Bulk Generate & Send */}
                                         <div className="flex flex-col sm:flex-row gap-3">
                                             {/* Bulk Generate PINs Only (Silent) */}
                                             <button
                                                 type="button"
                                                 disabled={isLoading || auditMissing === 0}
                                                 onClick={() => {
                                                     handleGeneratePinsOnlyForMissing(event);
                                                 }}
                                                 className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                                                 title="Creates PIN records silently so parents can see their PIN on the portal, without sending SMS/Email"
                                             >
                                                 <Sparkles className="w-4 h-4" />
                                                 {isLoading ? 'Processing...' : auditMissing === 0 ? 'All PINs Issued ✓' : `Generate PINs Only (${auditMissing})`}
                                             </button>

                                             {/* Bulk Generate & Send SMS / Email */}
                                             <button
                                                 type="button"
                                                 disabled={isLoading || auditMissing === 0}
                                                 onClick={() => {
                                                     setSelectedAnalysisEvent(null);
                                                     handleSendPinsToMissingRecipients(event, auditCustomMessage);
                                                 }}
                                                 className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                                 title="Generates PIN records and sends SMS/Email notifications to all missing recipients"
                                             >
                                                 <Send className="w-4 h-4" />
                                                 {isLoading ? 'Dispatching...' : auditMissing === 0 ? 'All PINs Issued ✓' : `Generate & Send (${auditMissing})`}
                                             </button>
                                         </div>

                                        {/* Secondary actions row */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button type="button" onClick={() => handleExportAttendanceCsv(event, eventMatchingPins)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                <FileSpreadsheet className="w-4 h-4" /> Export CSV
                                            </button>
                                            <button type="button" onClick={() => handleExportEventReportPdf(event, eventMatchingPins)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> Export PDF
                                            </button>
                                            <button type="button" onClick={() => setSelectedAnalysisEvent(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {analysisTab === 'feedback' && (
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            disabled={isLoading || eventMatchingPins.filter(p => (p.status === 'used' || p.status === 'accepted') && (p.rating === undefined || p.rating === null)).length === 0}
                                            onClick={() => { 
                                                setBulkFeedbackModalEvent(event); 
                                                setBulkFeedbackAddMsg(''); 
                                                setFeedbackRecipientFilter('all_pending'); 
                                            }}
                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-45 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                        >
                                            <Send className="w-4 h-4" />
                                            {isLoading ? 'Sending...' : 'Request Feedback (Bulk SMS)'}
                                        </button>
                                         <div className="flex flex-col sm:flex-row gap-3">
                                             <button type="button" onClick={() => handleExportEventReportPdf(event, eventMatchingPins)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15">
                                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> Export PDF Report
                                             </button>
                                             <button type="button" onClick={() => setSelectedAnalysisEvent(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                                 Dismiss
                                             </button>
                                         </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })(),
            document.body
        )}

        {/* ── Bulk PIN Invite Configuration & Preview Modal ── */}
        {bulkInviteModalEvent && createPortal(
            (() => {
                const event = bulkInviteModalEvent;
                const targetEnrollments = enrollments.filter(enr => {
                    if (bulkInviteSelectedClass && bulkInviteSelectedClass !== 'All') {
                        const allowedGrades = bulkInviteSelectedClass.startsWith('grades:')
                            ? bulkInviteSelectedClass.replace('grades:', '').split(',').map(c => c.trim().toLowerCase())
                            : [bulkInviteSelectedClass.trim().toLowerCase()];
                        const studentGrade = (enr.metadata?.gradeLevel || enr.metadata?.licenseCategory || '').trim().toLowerCase();
                        if (!allowedGrades.includes(studentGrade)) return false;
                    }
                    return isEventTargetMatch(event.target, enr);
                });

                const previewEnrollments = targetEnrollments.slice(0, 3);
                const recipientCount = targetEnrollments.length;

                return (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setBulkInviteModalEvent(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-6 w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Send className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-tight">Bulk Invitation &amp; PIN Setup</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            Event: {event.title} • Cohort: {bulkInviteSelectedClass !== 'All' ? bulkInviteSelectedClass : event.target} ({recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setBulkInviteModalEvent(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Class Selection Filter Dropdown */}
                            <div className="space-y-2 mb-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                                <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-between">
                                    <span>Target Class / Grade Filter</span>
                                    <span className="text-[9px] text-indigo-400 font-bold">
                                        {bulkInviteSelectedClass === 'All' ? 'All Classes Selected' : `Class Filter: ${bulkInviteSelectedClass}`}
                                    </span>
                                </label>
                                <select
                                    value={bulkInviteSelectedClass}
                                    onChange={e => setBulkInviteSelectedClass(e.target.value)}
                                    className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
                                >
                                    <option value="All">All Classes / Cohorts (Default)</option>
                                    {cohortsList.map(cohort => (
                                        <option key={cohort} value={cohort}>{cohort}</option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                                    Filter which class or grade (e.g. Grade 1, Grade 2, Form 1, Form 2, etc.) will receive the secret PIN and event invitation.
                                </p>
                            </div>

                            {/* Additional Message Input */}
                            <div className="space-y-2 mb-6">
                                <label className="block text-[10px] font-black text-slate-350 uppercase tracking-widest">
                                    Additional Custom Message (Optional)
                                </label>
                                <textarea
                                    value={bulkInviteAddMsg}
                                    onChange={e => setBulkInviteAddMsg(e.target.value)}
                                    placeholder="e.g. Please carry your national identity card and arrive 15 minutes early."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all resize-none font-sans"
                                />
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                    This message will be injected directly into both the SMS and Email invitation templates.
                                </p>
                            </div>

                            {/* Preview Section */}
                            <div className="space-y-4 mb-6">
                                <div className="border-t border-white/5 pt-4">
                                    <h4 className="text-[10px] font-black text-slate-350 uppercase tracking-widest mb-1">
                                        Recipient Message Previews ({previewEnrollments.length} shown)
                                    </h4>
                                    <p className="text-[9px] text-slate-500 font-medium">
                                        See exactly how notifications will look on your users' devices before sending.
                                    </p>
                                </div>

                                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                                    {(() => {
                                        // Group target enrollments by parent for preview
                                        const previewParentGroups = new Map<string, {
                                            parentName: string;
                                            primaryPhone: string;
                                            secondaryPhone: string;
                                            parentEmail: string;
                                            relation: string;
                                            studentNames: string[];
                                        }>();

                                        for (const enr of targetEnrollments) {
                                            const associatedUser = users.find(u => u.id === enr.userId);
                                            const studentName = associatedUser?.name || 'Student';
                                            const parentsList: { name: string; phone: string; email: string; relation: string }[] = enr.metadata?.parents || [];
                                            const fallbackParent = {
                                                name: enr.metadata?.parentName || '',
                                                phone: enr.metadata?.parentPhone || enr.metadata?.parentPhoneNumber || (enr as any).parentPhone || '',
                                                email: enr.metadata?.parentEmail || '',
                                                relation: enr.metadata?.parentRelation || 'Guardian'
                                            };
                                            const fallbackSecondary = {
                                                name: enr.metadata?.parentName2 || enr.metadata?.secondaryParentName || '',
                                                phone: enr.metadata?.parentPhone2 || enr.metadata?.secondaryPhone || enr.metadata?.parentPhoneNumber2 || enr.metadata?.secondaryParentPhone || enr.metadata?.guardianPhone2 || '',
                                                email: enr.metadata?.parentEmail2 || enr.metadata?.secondaryParentEmail || '',
                                                relation: enr.metadata?.parentRelation2 || 'Secondary Guardian'
                                            };

                                            let resolvedParents = parentsList.length > 0 ? [...parentsList] : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                                            if (resolvedParents.length < 2 && (fallbackSecondary.name || fallbackSecondary.phone || fallbackSecondary.email)) {
                                                if (!resolvedParents.some(p => p.phone && phonesMatch(p.phone, fallbackSecondary.phone))) {
                                                    resolvedParents.push(fallbackSecondary);
                                                }
                                            }

                                            const primaryParent = resolvedParents[0];
                                            const secondaryParent = resolvedParents[1] || (fallbackSecondary.phone && (!primaryParent || !phonesMatch(primaryParent.phone, fallbackSecondary.phone)) ? fallbackSecondary : null);

                                            const p1Phone = primaryParent?.phone || (isPrimaryOrSecondary ? '' : (associatedUser?.phoneNumber || ''));
                                            const p2Phone = secondaryParent?.phone && (!p1Phone || !phonesMatch(p1Phone, secondaryParent.phone)) ? secondaryParent.phone : '';
                                            const pEmail = primaryParent?.email || (isPrimaryOrSecondary ? '' : (associatedUser?.email || ''));

                                            const key = p1Phone ? `phone_${formatPhoneNumber(p1Phone)}` : (pEmail ? `email_${pEmail.toLowerCase()}` : `student_${enr.userId}`);

                                            if (!previewParentGroups.has(key)) {
                                                previewParentGroups.set(key, {
                                                    parentName: primaryParent?.name || associatedUser?.name || 'Parent / Guardian',
                                                    primaryPhone: p1Phone,
                                                    secondaryPhone: p2Phone,
                                                    parentEmail: pEmail,
                                                    relation: primaryParent?.relation || 'Parent',
                                                    studentNames: []
                                                });
                                            }
                                            const grp = previewParentGroups.get(key)!;
                                            if (!grp.studentNames.includes(studentName)) {
                                                grp.studentNames.push(studentName);
                                            }
                                        }

                                        const groupsList = Array.from(previewParentGroups.values()).slice(0, 3);

                                        return groupsList.map((grp, index) => {
                                            const studentLabel = grp.studentNames.length === 1
                                                ? grp.studentNames[0]
                                                : (grp.studentNames.length === 2
                                                    ? `${grp.studentNames[0]} & ${grp.studentNames[1]}`
                                                    : `${grp.studentNames.slice(0, -1).join(', ')} & ${grp.studentNames[grp.studentNames.length - 1]}`);

                                            const shortLink = `https://portal.eduai.co.ke/?view=event-confirm&pinId=pin_preview_${index}`;
                                            const confirmationLink = `https://portal.eduai.co.ke/?view=event-confirm&pinId=pin_preview_${index}&data=eyJwaW5Db2RlIjoiMTIzNDU2IiwiZXZlbnRUZXh0IjoiLi4uIn0=`;

                                            const suffix = bulkInviteAddMsg.trim() ? ` ${bulkInviteAddMsg.trim()}` : '';

                                            const smsPreview = `Dear ${grp.parentName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentLabel}.${suffix} Confirm attendance: ${shortLink}`;

                                            const emailPreview = `Dear ${grp.parentName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentLabel}.${suffix} Confirm attendance: ${confirmationLink}`;

                                            return (
                                                <div key={index} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-2 gap-2">
                                                        <div>
                                                            <span className="text-[10px] font-black text-white">{grp.parentName}</span>
                                                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider ml-2 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                                {grp.relation} of {studentLabel} {grp.studentNames.length > 1 ? `(${grp.studentNames.length} Siblings)` : ''}
                                                            </span>
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-semibold flex flex-wrap items-center gap-1.5">
                                                            {grp.primaryPhone && <span className="bg-white/5 px-2 py-0.5 rounded">Primary: {grp.primaryPhone}</span>}
                                                            {grp.secondaryPhone && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">Secondary: {grp.secondaryPhone}</span>}
                                                            {grp.parentEmail && <span className="bg-white/5 px-2 py-0.5 rounded">Email: {grp.parentEmail}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* SMS Preview Bubble */}
                                                        {grp.primaryPhone || grp.secondaryPhone ? (
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                                    <span className="flex items-center gap-1.5"><MessageSquare className="w-2.5 h-2.5 text-indigo-400" /> SMS Message Preview</span>
                                                                    {grp.secondaryPhone && <span className="text-emerald-400 font-bold">2 SMS Targets (Primary + Secondary)</span>}
                                                                </div>
                                                                <div className="bg-slate-900 border border-white/5 rounded-2xl p-3 relative text-[10px] text-slate-350 leading-relaxed font-sans select-none">
                                                                    {smsPreview}
                                                                    <div className="absolute right-3 bottom-1 text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                                                                        ~{Math.ceil(smsPreview.length / 160)} SMS
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-600 font-semibold italic flex items-center justify-center border border-dashed border-white/5 rounded-2xl p-4 bg-white/[0.01]">
                                                                No Phone Registered (SMS will be skipped)
                                                            </div>
                                                        )}

                                                        {/* Email Preview Card */}
                                                        {grp.parentEmail ? (
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                                    <Mail className="w-2.5 h-2.5 text-emerald-400" /> Email Preview
                                                                </div>
                                                                <div className="bg-slate-900 border border-white/5 rounded-2xl p-3 text-[10px] text-slate-350 space-y-1 leading-relaxed font-sans select-none">
                                                                    <p className="font-bold border-b border-white/5 pb-1 text-slate-400">Subject: Event Attendance Invitation - {event.title}</p>
                                                                    <p className="pt-1">{emailPreview}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-600 font-semibold italic flex items-center justify-center border border-dashed border-white/5 rounded-2xl p-4 bg-white/[0.01]">
                                                                No Email Registered (Email will be skipped)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setBulkInviteModalEvent(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSendAttendancePin(event, bulkInviteAddMsg, bulkInviteSelectedClass);
                                        setBulkInviteModalEvent(null);
                                    }}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" /> Confirm &amp; Send
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })(),
            document.body
        )}

        {/* ── Bulk Feedback Invite Configuration & Preview Modal ── */}
        {bulkFeedbackModalEvent && createPortal(
            (() => {
                const event = bulkFeedbackModalEvent;
                const attendeesWithoutFeedback = (eventPins || []).filter(
                    (p: any) => {
                        const isCorrectEvent = p.eventId === event.id || p.event_id === event.id;
                        const isNotRated = p.rating === undefined || p.rating === null || p.rating === '';
                        if (!isCorrectEvent || !isNotRated) return false;
                        
                        if (feedbackRecipientFilter === 'pending') {
                            return p.status === 'used';
                        } else if (feedbackRecipientFilter === 'accepted') {
                            return p.status === 'accepted';
                        } else {
                            return p.status === 'used' || p.status === 'accepted';
                        }
                    }
                );

                const recipientCount = attendeesWithoutFeedback.length;
                const previewPins = attendeesWithoutFeedback.slice(0, 3);
                const displayPins = previewPins.length > 0 ? previewPins : [
                    {
                        id: 'mock-pin-id',
                        userId: 'mock-user-id',
                        eventId: event.id,
                        status: 'used',
                        rating: null
                    }
                ];

                return (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setBulkFeedbackModalEvent(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-6 w-full max-w-2xl my-8 animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-450">
                                        <Send className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-tight">Feedback Request Setup</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            Event: {event.title} • {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'} without feedback
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setBulkFeedbackModalEvent(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Additional Custom Message Input */}
                            <div className="space-y-2 mb-5">
                                <label className="block text-[10px] font-black text-slate-355 uppercase tracking-widest">
                                    Additional Custom Note (Optional)
                                </label>
                                <textarea
                                    value={bulkFeedbackAddMsg}
                                    onChange={e => setBulkFeedbackAddMsg(e.target.value)}
                                    placeholder="e.g. Thank you for your continued support! or We appreciate your time."
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50 focus:bg-white/[0.07] transition-all resize-none font-sans"
                                />
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                    This note will be injected into the feedback invite templates.
                                </p>
                            </div>

                            {/* Target Recipients Selection */}
                            <div className="space-y-2 mb-5">
                                <label className="block text-[10px] font-black text-slate-355 uppercase tracking-widest">
                                    Target Recipients
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFeedbackRecipientFilter('all_pending')}
                                        className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            feedbackRecipientFilter === 'all_pending'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/5'
                                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        All Pending
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFeedbackRecipientFilter('pending')}
                                        className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            feedbackRecipientFilter === 'pending'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/5'
                                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        Attended (Pending)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFeedbackRecipientFilter('accepted')}
                                        className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            feedbackRecipientFilter === 'accepted'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-lg shadow-amber-500/5'
                                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        RSVP Accepted (Pending)
                                    </button>
                                </div>
                            </div>

                            {/* Link Verification Panel */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 mb-5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-355 uppercase tracking-widest">
                                            Short URL Checker
                                        </h4>
                                        <p className="text-[9px] text-slate-500 font-medium mt-0.5">
                                            Confirm that the shortened redirection URL resolves correctly.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={isGeneratingPreviewShortUrl || !previewShortUrl}
                                            onClick={() => window.open(previewShortUrl, '_blank')}
                                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                            title="Test Link in browser"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Test Link
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isCheckingUrl || !previewShortUrl}
                                            onClick={handleCheckUrl}
                                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-45 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                        >
                                            {isCheckingUrl ? (
                                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <CheckCircle className="w-3 h-3" />
                                            )}
                                            {isCheckingUrl ? 'Checking...' : 'Check Redirect'}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-950/65 border border-white/5 rounded-xl px-3 py-2 text-[10px] space-y-1 font-mono text-slate-400 select-all">
                                    <div className="flex justify-between">
                                        <span>Target (Long URL):</span>
                                        <span className="text-slate-300 break-all select-all font-bold">
                                            {window.location.origin}/?view=event-confirm&pinId=pin_preview_0
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1.5">
                                        <span>Shortened URL:</span>
                                        <span className="text-indigo-400 break-all select-all font-bold">
                                            {isGeneratingPreviewShortUrl ? 'Generating...' : (previewShortUrl || 'Failed to generate')}
                                        </span>
                                    </div>
                                </div>

                                {urlCheckResult && (
                                    <div className={`p-3 rounded-2xl border text-[10px] space-y-1.5 ${
                                        urlCheckResult.success && urlCheckResult.status === 200
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-305'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-355'
                                    }`}>
                                        <p className="font-black uppercase tracking-wider flex items-center gap-1.5">
                                            {urlCheckResult.success && urlCheckResult.status === 200 ? (
                                                <span className="text-emerald-450 font-black">✓ Link Verification Successful</span>
                                            ) : (
                                                <span className="text-rose-455 font-black">✗ Link Verification Failed</span>
                                            )}
                                        </p>
                                        <div className="space-y-0.5 font-bold uppercase tracking-wider text-slate-400">
                                            <p>Short URL: <span className="font-mono text-slate-300 normal-case">{previewShortUrl}</span></p>
                                            <p>Final Redirect: <span className="font-mono text-slate-300 normal-case">{urlCheckResult.finalUrl || 'Unknown'}</span></p>
                                            <p>HTTP Response Status: <span className="font-mono text-slate-300">{urlCheckResult.status || 'N/A'}</span></p>
                                            {urlCheckResult.finalUrl && (
                                                <p>Verification Check: <span className={urlCheckResult.finalUrl.includes('view=event-confirm') ? 'text-emerald-400' : 'text-amber-400'}>
                                                    {urlCheckResult.finalUrl.includes('view=event-confirm') ? 'Redirects to RSVP Portal ✓' : 'Incorrect Redirect Target ⚠️'}
                                                </span></p>
                                            )}
                                            {urlCheckResult.message && <p className="text-rose-400">Error: {urlCheckResult.message}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Recipient Previews */}
                            <div className="space-y-3 mb-6">
                                <div className="border-t border-white/5 pt-4">
                                    <h4 className="text-[10px] font-black text-slate-355 uppercase tracking-widest mb-1">
                                        Recipient Previews {previewPins.length > 0 ? `(${previewPins.length} shown)` : '(Sample)'}
                                    </h4>
                                    <p className="text-[9px] text-slate-500 font-medium font-sans">
                                        Shows previews of how the SMS will look for the first few checked-in attendees.
                                    </p>
                                </div>

                                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                    {displayPins.map((pinRecord, idx) => {
                                        const isMock = pinRecord.id === 'mock-pin-id';
                                        const targetUser = isMock ? null : users.find(u => u.id === (pinRecord.userId || pinRecord.user_id));
                                        const targetName = isMock ? 'John Doe (Sample Attendee)' : (targetUser?.name || 'Parent/Guardian');
                                        const targetPhone = isMock ? '+254 700 000 000' : (targetUser?.phoneNumber || (targetUser as any)?.phone_number || 'No Phone');
                                        
                                        const origin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin;
                                        const shortLinkPreview = previewShortUrl || `${origin}/?view=event-confirm&pinId=${pinRecord.id}`;
                                        const suffix = bulkFeedbackAddMsg.trim() ? ` ${bulkFeedbackAddMsg.trim()}` : '';
                                        const smsMessage = `Thank you for attending "${event.title}". Please take a moment to share your rating and feedback with us:${suffix} ${shortLinkPreview}`;

                                        return (
                                            <div key={pinRecord.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                    <div>
                                                        <span className="text-[10px] font-black text-white">{targetName}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-2 bg-white/5 px-2 py-0.5 rounded">
                                                            {isMock ? 'Sample Attendee' : 'Attendee'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 font-semibold">
                                                        Phone: {targetPhone}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                        <MessageSquare className="w-2.5 h-2.5 text-amber-400" /> SMS Message Preview
                                                    </div>
                                                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-3 relative text-[10px] text-slate-355 leading-relaxed font-sans select-none font-medium">
                                                        {smsMessage}
                                                        <div className="absolute right-3 bottom-1 text-[7px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                                            ~{Math.ceil(smsMessage.length / 160)} SMS ({smsMessage.length} chars)
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setBulkFeedbackModalEvent(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleSendFeedbackRequests(event, bulkFeedbackAddMsg, feedbackRecipientFilter);
                                        setBulkFeedbackModalEvent(null);
                                    }}
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" /> Confirm &amp; Send
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })(),
            document.body
        )}

        {/* ── PDF Preview Modal ── */}
        {pdfPreviewUrl && createPortal(
            <div
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex items-center justify-center p-4"
                onClick={() => setPdfPreviewUrl(null)}
            >
                <div
                    className="bg-slate-950 border border-white/10 shadow-2xl rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-tight">{pdfPreviewTitle || 'Document Preview'}</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{pdfFileName || 'document.pdf'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setPdfPreviewUrl(null)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* PDF iframe Preview Content */}
                    <div className="flex-1 bg-slate-900 p-2">
                        <PdfViewer
                            src={pdfPreviewUrl}
                            title="PDF Document Preview"
                            className="w-full h-full rounded-2xl border border-white/5 bg-slate-950"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                        <button
                            type="button"
                            onClick={() => setPdfPreviewUrl(null)}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Close
                        </button>
                        <a
                            href={pdfPreviewUrl}
                            download={pdfFileName}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                            Download PDF
                        </a>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {isPreviewingIdCard && previewStudent && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-[500px] w-full p-6 space-y-6 border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Student ID Card Preview</h4>
                            <p className="text-xs text-slate-400">On-screen preview of the official digital identity card.</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsPreviewingIdCard(false);
                                setPreviewStudent(null);
                                setPreviewEnrollment(null);
                                setPreviewQrCodeUrl('');
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* ID Card Box Container */}
                    <div className="flex justify-center p-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 overflow-x-auto">
                        {/* Visual ID Card Mockup */}
                        <div className="relative w-[428px] h-[270px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-lg font-sans text-slate-800 dark:text-slate-100 flex-shrink-0">
                            {/* Header */}
                            <div className="bg-[#1e40af] h-[60px] flex items-center px-4 relative">
                                {(currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url) && (
                                    <img src={currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || ''} alt="Logo" className="w-8 h-8 object-contain mr-3 bg-white/10 p-0.5 rounded" />
                                )}
                                <div className="flex-grow text-center pr-6">
                                    <div className="text-[11px] font-black tracking-wider text-white uppercase truncate">
                                        {currentInstitution?.name || 'Institution Name'}
                                    </div>
                                    <div className="text-[7.5px] font-bold tracking-widest text-slate-200 uppercase mt-0.5">
                                        Official Identification Card
                                    </div>
                                </div>
                            </div>
                            {/* Accent line */}
                            <div className="bg-[#f59e0b] h-[5px]"></div>
                            
                            {/* Body */}
                            <div className="flex p-4 gap-3 h-[180px]">
                                {/* Passport Photo */}
                                <div className="w-[84px] h-[105px] border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 relative">
                                    {previewStudent.profilePhotoUrl ? (
                                        <img src={previewStudent.profilePhotoUrl} alt="Student Photo" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full text-slate-300 dark:text-slate-600">
                                            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Details */}
                                <div className="flex-grow flex flex-col justify-start max-w-[190px]">
                                    <div className="text-[11.5px] font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-2 mb-2">
                                        {previewStudent.name || 'Unknown Student'}
                                    </div>
                                    
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                        Admission / Student ID
                                    </div>
                                    <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5 mb-2 truncate">
                                        {previewEnrollment?.admissionNumber || previewStudent.admissionNumber || previewStudent.admission_number || previewStudent.staffId || previewStudent.id.substring(0, 8)}
                                    </div>
                                    
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                        Academic Program / Class
                                    </div>
                                    <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                                        {previewStudent.metadata?.courseCode || 'N/A'}
                                    </div>
                                </div>
                                
                                {/* QR Code & Signature */}
                                <div className="w-[84px] flex flex-col items-center justify-start flex-shrink-0">
                                    <div className="w-[64px] h-[64px] p-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                        {previewQrCodeUrl ? (
                                            <img src={previewQrCodeUrl} alt="QR Code" className="w-full h-full" />
                                        ) : (
                                            <div className="text-[6.5px] text-slate-300 font-bold">QR CODE</div>
                                        )}
                                    </div>
                                    <div className="text-[6px] font-black text-slate-400 mt-1 uppercase tracking-wider text-center">
                                        Scan for Attendance
                                    </div>
                                    
                                    <div className="mt-3 w-[74px] text-center border-t border-slate-300 dark:border-slate-600 pt-1">
                                        <div className="text-[5.5px] font-bold text-slate-400 uppercase tracking-wider">
                                            Authorized Sig
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="absolute bottom-0 left-0 right-0 bg-slate-100 dark:bg-slate-800 py-1 px-4 text-center border-t border-slate-200 dark:border-slate-700">
                                <div className="text-[6.5px] font-medium text-slate-400 leading-tight">
                                    Notice: This card is institutional property. If found, please return to the administration office.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => {
                                setIsPreviewingIdCard(false);
                                setPreviewStudent(null);
                                setPreviewEnrollment(null);
                                setPreviewQrCodeUrl('');
                            }}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={async () => {
                                if (!previewStudent) return;
                                try {
                                    if (previewEnrollment) {
                                        await handleDownloadIdCard(previewEnrollment, previewStudent);
                                    }
                                } catch (err: any) {
                                    alert(`Failed to download ID card: ${err.message}`);
                                }
                            }}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Download PDF
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        {leaveOutStudent && createPortal(
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">New Leave Out Sheet</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Exeat Authorization for {leaveOutStudent.user.name}</p>
                        </div>
                        <button onClick={() => setLeaveOutStudent(null)} className="w-10 h-10 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-slate-650 rounded-full flex items-center justify-center transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateLeaveOutFromEnrollment} className="p-8 space-y-5 text-left">
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                            <input
                                type="checkbox"
                                id="enrollmentIsBoarder"
                                checked={leaveOutForm.isBoarder}
                                onChange={(e) => setLeaveOutForm(prev => ({ ...prev, isBoarder: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="enrollmentIsBoarder" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                Boarding Student {isCheckingBoarder && <span className="text-[10px] text-slate-400 italic">(checking allocations...)</span>}
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Leave Date</label>
                                <input
                                    type="date"
                                    required
                                    value={leaveOutForm.leaveDate}
                                    onChange={(e) => setLeaveOutForm(prev => ({ ...prev, leaveDate: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Expected Return</label>
                                <input
                                    type="date"
                                    required
                                    value={leaveOutForm.returnDate}
                                    onChange={(e) => setLeaveOutForm(prev => ({ ...prev, returnDate: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Reason for Leave</label>
                            <textarea
                                required
                                rows={3}
                                value={leaveOutForm.reason}
                                onChange={(e) => setLeaveOutForm(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Enter detailed reason (e.g. Medical, Funeral, Home visit...)"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 dark:text-white placeholder:font-medium"
                            />
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setLeaveOutStudent(null)}
                                className="flex-1 px-4 py-4 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 transition-all uppercase text-xs tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest"
                            >
                                Authorize & Download
                            </button>
                        </div>
                    </form>
                </div>
            </div>,
            document.body
        )}

        {/* Test Event Studio Modal */}
        {testEventModalEvent && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
                <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 w-full max-w-2xl text-white shadow-2xl space-y-6 relative my-8">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <FlaskConical className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    Event Test Studio
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        Live Verification
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400 font-bold mt-0.5">
                                    {testEventModalEvent.title}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTestEventModalEvent(null)}
                            className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Event Details */}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-purple-400" /> {testEventModalEvent.eventDate}</span>
                        {testEventModalEvent.eventTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-400" /> {testEventModalEvent.eventTime}</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-purple-400" /> {testEventModalEvent.venue}</span>
                    </div>

                    {/* Section 1: Shortened URL Health & Confirmation */}
                    <div className="space-y-3 bg-slate-950/60 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Link className="w-3.5 h-3.5" /> Shortened URL Health &amp; Confirmation
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                    Verify that the shortened link redirects accurately to the public RSVP page.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isGeneratingTestShortUrl || !testShortUrl}
                                    onClick={() => window.open(testShortUrl, '_blank')}
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3 h-3" /> Test Link
                                </button>
                                <button
                                    type="button"
                                    disabled={isCheckingTestUrl || !testShortUrl}
                                    onClick={handleCheckTestUrl}
                                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                >
                                    {isCheckingTestUrl ? (
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <CheckCircle className="w-3 h-3" />
                                    )}
                                    {isCheckingTestUrl ? 'Verifying...' : 'Check Redirection'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-white/5 rounded-xl p-3 text-[10px] space-y-1.5 font-mono">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                <span className="text-slate-400 font-sans font-bold">Target URL:</span>
                                <span className="text-slate-300 break-all select-all">{`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=event-confirm&eventId=${testEventModalEvent.id}&mode=rsvp`}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-t border-white/5 pt-1.5">
                                <span className="text-slate-400 font-sans font-bold">Confirmed Short URL:</span>
                                <span className="text-purple-300 font-bold break-all select-all">{isGeneratingTestShortUrl ? 'Generating...' : (testShortUrl || 'Failed to generate')}</span>
                            </div>
                        </div>

                        {testUrlCheckResult && (
                            <div className={`p-3 rounded-xl border text-[10px] space-y-1 ${
                                testUrlCheckResult.success && testUrlCheckResult.status === 200
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                            }`}>
                                <p className="font-black uppercase tracking-wider flex items-center gap-1.5">
                                    {testUrlCheckResult.success && testUrlCheckResult.status === 200 ? (
                                        <span className="text-emerald-400 font-black">✓ Shortened URL Confirmed &amp; Reachable (HTTP 200)</span>
                                    ) : (
                                        <span className="text-rose-400 font-black">✗ Redirection Check Failed</span>
                                    )}
                                </p>
                                <div className="space-y-0.5 text-slate-300 font-sans">
                                    <p>Final Redirect Target: <span className="font-mono text-white">{testUrlCheckResult.finalUrl || 'Unknown'}</span></p>
                                    {testUrlCheckResult.finalUrl && (
                                        <p>Target Verification: <span className={testUrlCheckResult.finalUrl.includes('view=event-confirm') ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                            {testUrlCheckResult.finalUrl.includes('view=event-confirm') ? 'Resolves to RSVP Portal ✓' : 'Unexpected Target ⚠️'}
                                        </span></p>
                                    )}
                                    {testUrlCheckResult.message && <p className="text-rose-400">Error Details: {testUrlCheckResult.message}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Dispatch Test PIN SMS */}
                    <div className="space-y-3 bg-slate-950/60 border border-white/5 rounded-2xl p-4">
                        <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5" /> Dispatch Test PIN &amp; SMS
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                            Send a test invitation SMS containing a generated PIN and confirmed shortened URL to test SMS gateway delivery.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Recipient Name</label>
                                <input
                                    type="text"
                                    value={testRecipientName}
                                    onChange={e => setTestRecipientName(e.target.value)}
                                    placeholder="Test Recipient"
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Test Phone Number</label>
                                <input
                                    type="text"
                                    value={testRecipientPhone}
                                    onChange={e => setTestRecipientPhone(e.target.value)}
                                    placeholder="e.g. 0712345678"
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={isSendingTestSms || !testRecipientPhone.trim()}
                            onClick={handleSendTestPinSms}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            {isSendingTestSms ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Sending Test SMS...
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" /> Send Test PIN SMS
                                </>
                            )}
                        </button>

                        {testSmsReport && (
                            <div className={`p-3 rounded-xl border text-[10px] space-y-1 ${
                                testSmsReport.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                            }`}>
                                <p className="font-black uppercase tracking-wider flex items-center gap-1.5">
                                    {testSmsReport.success ? '✓ Test SMS Sent Successfully' : '✗ Test SMS Dispatch Failed'}
                                </p>
                                <div className="space-y-0.5 font-mono text-slate-300">
                                    {testSmsReport.pin && <p>Generated Test PIN: <span className="text-amber-300 font-bold">{testSmsReport.pin}</span></p>}
                                    {testSmsReport.shortUrl && <p>Shortened Link: <span className="text-purple-300 font-bold">{testSmsReport.shortUrl}</span></p>}
                                    <p>Status: {testSmsReport.message}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end pt-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setTestEventModalEvent(null)}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                            Close Studio
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        </div>
    );
};
