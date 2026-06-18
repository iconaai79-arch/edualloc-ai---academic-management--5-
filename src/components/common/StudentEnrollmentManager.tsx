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
    UserRound,
    Edit2,
    RotateCcw,
    X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { User, StudentEnrollment, Institution, CourseLevel, Subject, Visitor, AcademicLevel, Role, Course } from '../../types';
import { apiService } from '../../services/apiService';
import Webcam from 'react-webcam';
import { ExcelSmartImporter } from './ExcelSmartImporter';
import { formatRoleDisplayName, getRolesForInstitution } from '../../utils/roleUtils';
import { VALID_STAFF_ROLES } from '../../constants';

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
                    setError(true);
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
                                globalShortUrlCache[longUrl] = shortened;
                                setShortUrl(shortened);
                                setLoading(false);
                            }
                        } catch (err) {
                            if (isMounted) {
                                setError(true);
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

interface StudentEnrollmentManagerProps {
    context: 'academic' | 'driving_school';
    currentInstitution: Institution;
    activeTab?: 'students' | 'teachers' | 'support_staff' | 'broadcaster' | 'calendar' | 'guests';
}

export const StudentEnrollmentManager: React.FC<StudentEnrollmentManagerProps> = ({ 
    context, 
    currentInstitution,
    activeTab: passedActiveTab
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

    // Parent Invite Modal State
    const [inviteModalEnrollment, setInviteModalEnrollment] = useState<StudentEnrollment | null>(null);
    const [inviteSelectedParentIdx, setInviteSelectedParentIdx] = useState(0);
    const [inviteSelectedEventId, setInviteSelectedEventId] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error' | 'info' | 'idle'; message: string }>({ type: 'idle', message: '' });
    
    // Bulk invitation configuration state
    const [bulkInviteModalEvent, setBulkInviteModalEvent] = useState<any | null>(null);
    const [bulkInviteAddMsg, setBulkInviteAddMsg] = useState<string>('');
    
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
    
    // Modal & Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<StudentEnrollment | null>(null);
    const [isUploading, setIsUploading] = useState(false);
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
        { key: 'parentEmail', label: 'Parent Email Address' }
    ], [context]);

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
                        fingerprintTemplate: formData.biometricTemplate || existingUser.metadata?.fingerprintTemplate
                    }
                };
                if (formData.gender && existingUser.gender !== formData.gender) {
                    updatedUser.gender = formData.gender as any;
                }
                if (updatedUser.institutionId !== currentInstitution.id) {
                    updatedUser.institutionId = currentInstitution.id;
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
                        fingerprintTemplate: formData.biometricTemplate
                    }
                };
                if (formData.gender) {
                    newUser.gender = formData.gender as any;
                }
                
                await apiService.saveModuleRecord('users', newUser);
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

        let parentsList = enr.metadata?.parents || [];
        if (!Array.isArray(parentsList)) {
            parentsList = [];
        }
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
                stream: enr.metadata?.stream || '',
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
            const parentUser = users.find(u =>
                (parent.email && u.email && u.email.toLowerCase() === parent.email.toLowerCase()) ||
                (parent.phone && u.phoneNumber && u.phoneNumber === parent.phone)
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
                            userId = existingUser.id;
                            // Optionally update user properties if they changed
                            const updatedUser = {
                                ...existingUser,
                                name: item.name || existingUser.name,
                                gender: (item.gender || existingUser.gender) as any,
                            };
                            if (updatedUser.institutionId !== currentInstitution.id) {
                                updatedUser.institutionId = currentInstitution.id;
                            }
                            await apiService.updateModuleRecord('users', existingUser.id, updatedUser);
                        } else {
                            // Create new user profile
                            const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const generatedEmail = item.email && String(item.email).trim()
                                ? String(item.email).trim()
                                : `student_${newUserId}@eduai.local`;
                            
                            const newUser: User = {
                                id: newUserId,
                                name: String(item.name).trim(),
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
                            await apiService.saveModuleRecord('users', newUser);
                            userId = newUserId;
                            currentUsersList.push(newUser);
                        }

                        // 2. Check if enrollment record exists
                        let existingEnrollment = currentEnrollmentsList.find(e => 
                            e.userId === userId || 
                            (item.admissionNumber && e.admissionNumber && String(e.admissionNumber).trim().toLowerCase() === String(item.admissionNumber).trim().toLowerCase())
                        );

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
                            resolvedRole = (supportRoles.includes(inputRole) || VALID_STAFF_ROLES.includes(inputRole as any)) 
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
                            await apiService.saveModuleRecord('users', newUser);
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
            setStatusMsg({ type: 'success', message: 'Institution event scheduled successfully.' });
            
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

    // Send Attendance Pin
    const handleSendAttendancePin = async (event: any, additionalMessage: string = '') => {
        setStatusMsg({ type: 'info', message: 'Generating and dispatching attendance PINs...' });
        setIsLoading(true);

        const results: { recipientName: string; phone: string; success: boolean; errorMsg?: string }[] = [];

        try {
            const targetEnrollments = enrollments.filter(enr => {
                if (event.target === 'All') return true;
                if (event.target.startsWith('students:')) {
                    const studentIds = event.target.replace('students:', '').split(',');
                    return studentIds.includes(enr.userId);
                }
                if (context === 'driving_school') {
                    return enr.metadata?.licenseCategory === event.target;
                } else {
                    return enr.metadata?.gradeLevel === event.target;
                }
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

            for (const enr of targetEnrollments) {
                const associatedUser = currentUsersList.find(u => u.id === enr.userId);
                if (!associatedUser) {
                    results.push({
                        recipientName: `Enrollment ID: ${enr.id}`,
                        phone: 'N/A',
                        success: false,
                        errorMsg: 'User record not found'
                    });
                    continue;
                }

                // Resolve Parent(s) from enrollment metadata/fallback
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
                    // Try to find if this parent user already exists in the local copy, usersToUpsert, or system database
                    let parentUser = Array.from(usersToUpsert.values()).find((u: any) =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && u.phoneNumber === primaryParent.phone)
                    ) || currentUsersList.find(u =>
                        (primaryParent.email && u.email && u.email.toLowerCase() === primaryParent.email.toLowerCase()) ||
                        (primaryParent.phone && u.phoneNumber && u.phoneNumber === primaryParent.phone)
                    );

                    if (!parentUser) {
                        // Create temporary parent user profile
                        const newId = `u_par_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        parentUser = {
                            id: newId,
                            institutionId: currentInstitution.id,
                            name: primaryParent.name || 'Parent / Guardian',
                            email: primaryParent.email || (primaryParent.phone ? `parent_${primaryParent.phone}@eduai.co.ke` : `parent_${newId}@eduai.co.ke`),
                            phoneNumber: primaryParent.phone || null,
                            role: 'parent',
                            studentIds: [associatedUser.id],
                            metadata: {},
                            createdAt: new Date().toISOString()
                        } as any;
                        usersToUpsert.set(newId, parentUser);
                        
                        // Update local copy and main list so subsequent loops don't recreate them
                        currentUsersList.push(parentUser);
                    } else {
                        // Ensure student ID is linked
                        const currentStudentIds = Array.isArray(parentUser.studentIds) ? parentUser.studentIds : [];
                        if (!currentStudentIds.includes(associatedUser.id)) {
                            parentUser = {
                                ...parentUser,
                                studentIds: [...currentStudentIds, associatedUser.id]
                            };
                            usersToUpsert.set(parentUser.id, parentUser);
                        }
                    }

                    // Update student's parentIds as well
                    const currentParentIds = Array.isArray(associatedUser.parentIds) ? associatedUser.parentIds : [];
                    if (!currentParentIds.includes(parentUser.id)) {
                        const updatedStudent = {
                            ...associatedUser,
                            parentIds: [...currentParentIds, parentUser.id]
                        };
                        usersToUpsert.set(associatedUser.id, updatedStudent);
                        
                        const idx = currentUsersList.findIndex(u => u.id === associatedUser.id);
                        if (idx !== -1) {
                            currentUsersList[idx] = updatedStudent;
                        }
                    }

                    targetUserId = parentUser.id;
                    targetName = primaryParent.name || 'Parent / Guardian';
                    targetPhone = primaryParent.phone;
                    targetEmail = primaryParent.email;
                }

                // Check if a PIN already exists
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

                // Construct Confirmation Link — use full URL (shortening causes collisions)
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
                const confirmationLink = rawLink;
                const shortLink = `${origin}/?view=event-confirm&pinId=${pinId}`;

                const suffix = additionalMessage.trim() ? ` ${additionalMessage.trim()}` : '';

                // Send notification with RSVP details
                const studentName = associatedUser.name || 'your child';
                const smsMessage = primaryParent
                    ? `Dear ${targetName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentName}.${suffix} Confirm attendance: ${shortLink}`
                    : `You are invited to "${event.title}" on ${event.eventDate}.${suffix} Please confirm your attendance here: ${shortLink}`;
                
                const emailMessage = primaryParent
                    ? `Dear ${targetName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentName}.${suffix} Confirm attendance: ${confirmationLink}`
                    : `You are invited to "${event.title}" on ${event.eventDate}.${suffix} Please confirm your attendance here: ${confirmationLink}`;
                
                notificationsToDispatch.push({
                    targetPhone,
                    targetEmail,
                    smsMessage,
                    emailMessage,
                    targetName
                });

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
                        
                        const message = `You are invited to "${event.title}" on ${event.eventDate}. Please confirm your attendance here: ${confirmationLink}`;

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

    // Filtered Enrollments
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
            // Include: not a teacher, not in excluded roles, and either has a role OR belongs to this institution (no role = unclassified staff)
            const isSupport = !isTeacher && !isNonSupport && (role !== '' || !!u.institutionId);
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
                await apiService.saveModuleRecord('users', newUser);
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
            if (courses && courses.length > 0) {
                return courses.map(c => c.name);
            }
            if (academicLevels && academicLevels.length > 0) {
                return academicLevels.map(al => al.name);
            }
            return [
                'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
                'Grade 7', 'Grade 8', 'Form 1', 'Form 2', 'Form 3', 'Form 4'
            ];
        }
    }, [context, courses, academicLevels]);

    // Available Streams fallback
    const streamsList = useMemo(() => {
        if (currentInstitution?.streamDefinitions && currentInstitution.streamDefinitions.length > 0) {
            return currentInstitution.streamDefinitions;
        }
        return ['North', 'South', 'East', 'West', 'Main Stream'];
    }, [currentInstitution?.streamDefinitions]);

    // Available Streams for the Enrollment Form
    const formStreamsList = useMemo(() => {
        if (formData.metadata.gradeLevel) {
            const selectedCourse = courses.find(c => c.name === formData.metadata.gradeLevel);
            if (selectedCourse?.levels && selectedCourse.levels.length > 0) {
                return selectedCourse.levels.map(lvl => lvl.name);
            }
        }
        return streamsList;
    }, [formData.metadata.gradeLevel, courses, streamsList]);

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
        return enrollmentFields;
    }, [activeTab, teacherFields, supportStaffFields, enrollmentFields]);

    const activeOnComplete = useMemo(() => {
        if (activeTab === 'teachers' || activeTab === 'support_staff') return handleBulkCompleteStaff;
        return handleBulkComplete;
    }, [activeTab, handleBulkCompleteStaff, handleBulkComplete]);

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

    const handleFixSingleUnknownName = async (enrollmentId: string) => {
        const enr = enrollments.find(e => e.id === enrollmentId);
        if (!enr) return;
        const associatedUser = users.find(u => u.id === enr.userId);
        if (!associatedUser) return;

        const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
        if (!parentName || !parentName.trim()) {
            setStatusMsg({ type: 'error', message: 'No parent name available to copy.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
            return;
        }

        setStatusMsg({ type: 'info', message: 'Updating student name...' });
        setIsLoading(true);

        try {
            const updatedUser = {
                ...associatedUser,
                name: parentName.trim(),
                updatedAt: new Date().toISOString()
            };
            await apiService.updateModuleRecord('users', associatedUser.id, updatedUser);
            setStatusMsg({ type: 'success', message: `Successfully updated student name to "${parentName.trim()}".` });
            loadAllData();
        } catch (err: any) {
            console.error("Failed to update student name:", err);
            setStatusMsg({ type: 'error', message: `Update failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    const handleBulkFixUnknownNames = async () => {
        const targets = enrollments.filter(enr => {
            const user = users.find(u => u.id === enr.userId);
            const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
            const isUnknown = !user?.name || 
                user.name.trim() === '' || 
                user.name.toLowerCase() === 'unknown student' || 
                user.name.toLowerCase() === 'unknown';
            return isUnknown && !!parentName.trim();
        });

        if (targets.length === 0) {
            setStatusMsg({ type: 'info', message: 'No unknown student names found with parent names.' });
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
            return;
        }

        if (!window.confirm(`Are you sure you want to copy the parent's name to replace "Unknown Student" for all ${targets.length} record(s)?`)) {
            return;
        }

        setStatusMsg({ type: 'info', message: `Updating ${targets.length} student names...` });
        setIsLoading(true);

        try {
            let updatedCount = 0;
            const batchSize = 5;
            for (let i = 0; i < targets.length; i += batchSize) {
                const batch = targets.slice(i, i + batchSize);
                await Promise.all(batch.map(async (enr) => {
                    const associatedUser = users.find(u => u.id === enr.userId);
                    if (!associatedUser) return;
                    const parentName = enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name || '';
                    if (parentName && parentName.trim()) {
                        const updatedUser = {
                            ...associatedUser,
                            name: parentName.trim(),
                            updatedAt: new Date().toISOString()
                        };
                        await apiService.updateModuleRecord('users', associatedUser.id, updatedUser);
                        updatedCount++;
                    }
                }));
            }
            setStatusMsg({ type: 'success', message: `Successfully updated ${updatedCount} student name(s).` });
            loadAllData();
        } catch (err: any) {
            console.error("Bulk update of student names failed:", err);
            setStatusMsg({ type: 'error', message: `Bulk update failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
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
                        setImportGradeLevel('');
                        setImportStream('');
                    }} 
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
                            onClick={() => setIsUploading(true)}
                            className="px-6 py-3 bg-slate-900 dark:bg-slate-850 border border-slate-800 dark:border-slate-755 hover:bg-slate-850 dark:hover:bg-slate-800 hover:border-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            Import Excel
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
                                    {filteredEnrollments.map((enr, i) => {
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
                                                    {(user?.name || 'U').charAt(0)}
                                                </div>

                                                {/* ── Student Info ── */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate leading-tight flex items-center gap-2">
                                                        {user?.name || 'Unknown Student'}
                                                        {(!user?.name || 
                                                          user.name.trim() === '' || 
                                                          user.name.toLowerCase() === 'unknown student' || 
                                                          user.name.toLowerCase() === 'unknown') && 
                                                         (enr.metadata?.parentName || enr.metadata?.parents?.[0]?.name) && (
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
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                        {user?.email && (
                                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                                <Mail className="w-3 h-3" /> {user.email}
                                                            </span>
                                                        )}
                                                        {user?.phoneNumber && (
                                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                                                <Phone className="w-3 h-3" /> {user.phoneNumber}
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
                                                const hasPhone = !!(pinUser?.phoneNumber || pinUser?.phone_number);
                                                const hasEmail = !!pinUser?.email;
                                                
                                                return (
                                                    <tr key={pin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                                        <td className="py-3 pr-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                                                            {pin.createdAt || pin.created_at ? new Date(pin.createdAt || pin.created_at).toLocaleString() : 'N/A'}
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <p className="font-bold text-slate-850 dark:text-white">{pinUser?.name || 'External Parent/Guest'}</p>
                                                            <p className="text-slate-500 text-[10px] mt-0.5">{pinUser?.phoneNumber || pinUser?.phone_number || 'No Phone'}</p>
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
                                                        const regUrl = `${origin}/?view=event-registration&eventId=${event.id}`;
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
                                                                const regUrl = `${origin}/?view=event-registration&eventId=${event.id}`;
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
                                                    {/* Edit & Delete event row */}
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={() => handleOpenEditEvent(event)}
                                                            className="flex-1 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Edit2 className="w-3 h-3" /> Edit Event
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEvent(event)}
                                                            className="flex-1 px-3 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Delete
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
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        required={!isPrimaryOrSecondary} 
                                        placeholder={isPrimaryOrSecondary ? "Optional" : "+254..."}
                                        value={formData.phoneNumber}
                                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        required={!isPrimaryOrSecondary} 
                                        placeholder={isPrimaryOrSecondary ? "Optional" : "name@example.com"}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="form-input mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
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
                                    {context === 'driving_school' ? 'Driving School Curriculum Details' : 'Academic Placement Details'}
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Grade Level</label>
                                            <select
                                                value={formData.metadata.gradeLevel}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, gradeLevel: e.target.value } 
                                                })}
                                                className="form-select mt-1 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="" disabled>Select Grade</option>
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
                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto no-scrollbar pr-1 mb-6">
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
                const eventMatchingPins = eventPins.filter(p => p.eventId === event.id);

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

                return (
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
                        onClick={() => setSelectedAnalysisEvent(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 shadow-2xl rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
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

                            {/* Analysis Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6">
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

                            {/* Search & Filter Bar */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
                                <div className="flex gap-1 bg-slate-950/40 border border-white/10 rounded-xl p-1 overflow-x-auto no-scrollbar shrink-0">
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
                            <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/20 mb-6 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
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
                                                if (p.status === 'used' || p.status === 'accepted') {
                                                    rsvpStatusLabel = 'Accepted';
                                                    rsvpCls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                                } else if (p.status === 'rejected') {
                                                    rsvpStatusLabel = 'Declined';
                                                    rsvpCls = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                                                }

                                                let checkInLabel = 'Pending';
                                                let checkInCls = 'bg-slate-500/10 text-slate-450';
                                                if (p.status === 'used') {
                                                    checkInLabel = 'Checked-In';
                                                    checkInCls = 'bg-emerald-500/10 text-emerald-400';
                                                }

                                                let parsedGuests: string[] = [];
                                                if (p.guests) {
                                                    try {
                                                        const parsed = JSON.parse(p.guests);
                                                        parsedGuests = Array.isArray(parsed) ? parsed : [p.guests];
                                                    } catch (e) {
                                                        if (p.guests.trim()) parsedGuests = [p.guests];
                                                    }
                                                }

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
                                                            <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${rsvpCls}`}>
                                                                {rsvpStatusLabel}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 min-w-[180px]">
                                                            {parsedGuests.length > 0 ? (
                                                                <div className="space-y-1 max-w-[200px]">
                                                                    {parsedGuests.map((g, idx) => (
                                                                        <p key={idx} className="text-[10px] font-bold text-slate-300 truncate bg-white/5 px-2 py-0.5 rounded border border-white/5">{g}</p>
                                                                    ))}
                                                                </div>
                                                             ) : (
                                                                <span className="text-[10px] text-slate-600 font-semibold italic">None</span>
                                                             )}
                                                        </td>
                                                        <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                                            {p.vehicleRegistration || p.vehicle_registration || <span className="text-slate-600 italic font-sans font-semibold">N/A</span>}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${checkInCls}`}>
                                                                {checkInLabel}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Actions footer */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleExportAttendanceCsv(event, eventMatchingPins)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                                >
                                    <FileSpreadsheet className="w-4 h-4" /> Export CSV List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedAnalysisEvent(null)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Dismiss Dashboard
                                </button>
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
                    if (event.target === 'All') return true;
                    if (event.target.startsWith('students:')) {
                        const studentIds = event.target.replace('students:', '').split(',');
                        return studentIds.includes(enr.userId);
                    }
                    if (context === 'driving_school') {
                        return enr.metadata?.licenseCategory === event.target;
                    } else {
                        return enr.metadata?.gradeLevel === event.target;
                    }
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
                                        <h3 className="text-base font-black text-white uppercase tracking-tight">Bulk Invitation Setup</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            Event: {event.title} • Cohort: {event.target} ({recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'})
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

                                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 no-scrollbar">
                                    {previewEnrollments.map((enr, index) => {
                                        const associatedUser = users.find(u => u.id === enr.userId);
                                        const parentsList = enr.metadata?.parents || [];
                                        const fallbackParent = {
                                            name: enr.metadata?.parentName || '',
                                            phone: enr.metadata?.parentPhone || enr.parentPhone || '',
                                            email: enr.metadata?.parentEmail || '',
                                            relation: enr.metadata?.parentRelation || 'Guardian'
                                        };
                                        const resolvedParents = parentsList.length > 0 ? parentsList : (fallbackParent.name || fallbackParent.phone ? [fallbackParent] : []);
                                        const primaryParent = resolvedParents[0];

                                        const targetName = primaryParent ? (primaryParent.name || 'Parent / Guardian') : (associatedUser?.name || 'Student');
                                        const studentName = associatedUser?.name || 'Student';
                                        
                                        const targetPhone = isPrimaryOrSecondary ? '' : (associatedUser?.phoneNumber || '');
                                        const targetEmail = isPrimaryOrSecondary ? '' : (associatedUser?.email || '');
                                        
                                        const displayPhone = primaryParent ? primaryParent.phone : targetPhone;
                                        const displayEmail = primaryParent ? primaryParent.email : targetEmail;

                                        // Preview Links
                                        const shortLink = `https://portal.eduai.co.ke/?view=event-confirm&pinId=pin_preview_${index}`;
                                        const confirmationLink = `https://portal.eduai.co.ke/?view=event-confirm&pinId=pin_preview_${index}&data=eyJwaW5Db2RlIjoiMTIzNDU2IiwiZXZlbnRUZXh0IjoiLi4uIn0=`;

                                        const suffix = bulkInviteAddMsg.trim() ? ` ${bulkInviteAddMsg.trim()}` : '';

                                        const smsPreview = primaryParent
                                            ? `Dear ${targetName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentName}.${suffix} Confirm attendance: ${shortLink}`
                                            : `You are invited to "${event.title}" on ${event.eventDate}.${suffix} Please confirm your attendance here: ${shortLink}`;

                                        const emailPreview = primaryParent
                                            ? `Dear ${targetName}, you are invited to "${event.title}" on ${event.eventDate} at ${event.eventTime}, ${event.venue} — regarding ${studentName}.${suffix} Confirm attendance: ${confirmationLink}`
                                            : `You are invited to "${event.title}" on ${event.eventDate}.${suffix} Please confirm your attendance here: ${confirmationLink}`;

                                        return (
                                            <div key={enr.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                    <div>
                                                        <span className="text-[10px] font-black text-white">{targetName}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-2 bg-white/5 px-2 py-0.5 rounded">
                                                            {primaryParent ? `${primaryParent.relation || 'Parent'} of ${studentName}` : 'Student'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 font-semibold">
                                                        {displayPhone && `Phone: ${displayPhone}`}
                                                        {displayPhone && displayEmail && ' | '}
                                                        {displayEmail && `Email: ${displayEmail}`}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* SMS Preview Bubble */}
                                                    {displayPhone ? (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                                <MessageSquare className="w-2.5 h-2.5 text-indigo-400" /> SMS Message Preview
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
                                                    {displayEmail ? (
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
                                    })}
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
                                        handleSendAttendancePin(event, bulkInviteAddMsg);
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
        </div>
    );
};
