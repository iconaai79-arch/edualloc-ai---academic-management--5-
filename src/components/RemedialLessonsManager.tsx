import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { User, Course, Subject, RemedialSession, RemedialRateSetting, RemedialPayout, Invoice, RemedialAllocation, RemedialSubject, StudentEnrollment, RemedialTimetableApproval, RemedialWeekendDuty } from '../types';
import { apiService, safeLocalStorage } from '../services/apiService';
import { SubscriptionExpiryBanner } from './common/SubscriptionExpiryBanner';
import { 
    Clock, Plus, Check, CheckCircle2, CreditCard, Printer, QrCode, Search, 
    DollarSign, AlertCircle, Trash2, Shield, Eye, Award, BookOpen, Layers, UserCheck,
    Globe, Copy, ExternalLink, Sparkles, Calendar, RefreshCw, X, Download,
    Flame, Zap, Sliders, Coffee, UserX, ArrowRight, RotateCcw, AlertTriangle, Lock, UserPlus,
    FileText, BarChart3, Filter, Pencil, Users, LayoutGrid, ShieldCheck, GraduationCap,
    Send, Megaphone, Share2, CheckSquare, Banknote, PenTool, Receipt, Archive, Inbox
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { rankSubstituteCandidates, getRemainingMinutes, isConfirmationExpired, isAcademicTeacher } from '../utils/remedialSubstitutionUtils';
import {
    generateTeacherPayoutLedgerPdf,
    generatePrefectAuditReportPdf,
    generateStudentBillingReportPdf,
    exportRemedialToExcel,
    generateRemedialMasterTimetablePdf,
    exportRemedialMasterTimetableToExcel,
    getSubjectCode,
    getTeacherCode,
    getClassShortCode,
    getDistinctTimetableClasses,
    matchAllocationStream,
    getAscSubjectColor
} from '../utils/remedialReportGenerator';

interface RemedialLessonsManagerProps {
    currentUser: User;
    users: User[];
    courses: Course[];
    subjects: Subject[];
    currentInstitution: any;
    onLogAction?: (msg: string) => void;
}

export const RemedialLessonsManager: React.FC<RemedialLessonsManagerProps> = ({
    currentUser,
    users = [],
    courses = [],
    subjects = [],
    currentInstitution,
    onLogAction
}) => {
    const institutionId = currentInstitution?.id || currentUser?.institutionId;

    // States
    const [sessions, setSessions] = useState<RemedialSession[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [rateSetting, setRateSetting] = useState<RemedialRateSetting | null>(null);
    const [payouts, setPayouts] = useState<RemedialPayout[]>([]);
    const [allocations, setAllocations] = useState<RemedialAllocation[]>([]);
    const [remedialSubjects, setRemedialSubjects] = useState<RemedialSubject[]>([]);
    const [fetchedSchoolSubjects, setFetchedSchoolSubjects] = useState<Subject[]>([]);
    const effectiveSchoolSubjects = useMemo(() => {
        if (subjects && subjects.length > 0) return subjects;
        return fetchedSchoolSubjects;
    }, [subjects, fetchedSchoolSubjects]);
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'teachers' | 'prefects' | 'sessions' | 'allocations' | 'subjects' | 'payouts' | 'billing' | 'rates' | 'portal_hub' | 'reports'>('teachers');

    // Tab: Prefects & Class Secretaries Management States
    const [prefectSearchQuery, setPrefectSearchQuery] = useState('');
    const [prefectClassFilter, setPrefectClassFilter] = useState('All');
    const [prefectRoleFilter, setPrefectRoleFilter] = useState<'All' | 'prefect' | 'secretary' | 'other'>('All');
    const [prefectViewMode, setPrefectViewMode] = useState<'matrix' | 'list'>('matrix');
    const [isAssignLeaderModalOpen, setIsAssignLeaderModalOpen] = useState(false);
    const [leaderModalTargetCourseId, setLeaderModalTargetCourseId] = useState('');
    const [leaderModalTargetStream, setLeaderModalTargetStream] = useState('');
    const [leaderModalCustomStream, setLeaderModalCustomStream] = useState('');
    const [leaderModalRole, setLeaderModalRole] = useState<string>('Class Prefect');
    const [leaderModalCustomRole, setLeaderModalCustomRole] = useState('');
    const [leaderModalSelectedStudentId, setLeaderModalSelectedStudentId] = useState('');
    const [leaderModalContactPhone, setLeaderModalContactPhone] = useState('');
    const [leaderModalStudentSearch, setLeaderModalStudentSearch] = useState('');
    const [isSavingLeader, setIsSavingLeader] = useState(false);
    
    // Remedial Subject Modal / Filter States
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState<RemedialSubject | null>(null);
    const [newSubjectId, setNewSubjectId] = useState('');
    const [customSubjectName, setCustomSubjectName] = useState('');
    const [newSubjectPriority, setNewSubjectPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [newSubjectWeeklyOccurrences, setNewSubjectWeeklyOccurrences] = useState<number>(1);
    const [newSubjectPreferredDayType, setNewSubjectPreferredDayType] = useState<'any' | 'weekdays' | 'weekends'>('any');
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'In Progress' | 'Prefect Confirmed' | 'Pending Duty Approval' | 'Pending Headteacher Approval' | 'Pending Operations Payout' | 'Cash Issued to DOS' | 'Approved' | 'Paid'>('all');
    const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>('All');
    const [selectedTimetableStream, setSelectedTimetableStream] = useState<string>('All');
    const [allocViewMode, setAllocViewMode] = useState<'asc_grid' | 'day_columns' | 'unallocated'>('asc_grid');
    const [ascDayScope, setAscDayScope] = useState<'all' | 'weekdays' | 'weekend' | 'Saturday' | 'Sunday'>('all');
    const [selectedCellAlloc, setSelectedCellAlloc] = useState<RemedialAllocation | null>(null);
    const [ascClassSearchQuery, setAscClassSearchQuery] = useState('');

    // Unallocated lessons waiting for free timetable periods
    const unallocatedAllocations = useMemo(() => {
        return allocations.filter(a => a.isUnallocated || a.dayOfWeek === ('Unallocated' as any) || !a.dayOfWeek || !a.startTime);
    }, [allocations]);

    // Weekend & Weekday Duty Roster State
    const [weekendDutyRoster, setWeekendDutyRoster] = useState<RemedialWeekendDuty[]>([]);
    const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
    const [dutyModalWeek, setDutyModalWeek] = useState('WEEK 1');
    const [dutyModalTeacherId, setDutyModalTeacherId] = useState('');
    const [dutyModalCourseId, setDutyModalCourseId] = useState('');
    const [dutyModalSubjectId, setDutyModalSubjectId] = useState('');
    const [dutyModalAutoAllocate, setDutyModalAutoAllocate] = useState(true);
    const [isSavingDuty, setIsSavingDuty] = useState(false);
    // Weekday duty specific state
    const [dutyModalType, setDutyModalType] = useState<'weekend' | 'weekday'>('weekend');
    const [dutyModalWeekday, setDutyModalWeekday] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
    // Bulk teacher list for weekday duty: [{teacherId, payRate, payType}]
    const [dutyTeacherList, setDutyTeacherList] = useState<{ teacherId: string; payRate: string; payType: 'hourly' | 'flat' }[]>([]);
    const [dutyTeacherPickId, setDutyTeacherPickId] = useState('');
    const [dutyTeacherPickRate, setDutyTeacherPickRate] = useState('');
    const [dutyTeacherPickPayType, setDutyTeacherPickPayType] = useState<'hourly' | 'flat'>('hourly');

    // Operations Manager Cash Handover State (Stage 4)
    const [isOpsCashModalOpen, setIsOpsCashModalOpen] = useState(false);
    const [opsCashVoucherRef, setOpsCashVoucherRef] = useState('');
    const [opsDisburseBatch, setOpsDisburseBatch] = useState<{ teacherId: string; teacherName: string; totalAmount: number; totalHours: number; sessionIds: string[] } | null>(null);
    const [isDisbursingOpsCash, setIsDisbursingOpsCash] = useState(false);

    // DOS Cash Payment with On-Screen Signature State (Stage 5)
    const [isDosPayModalOpen, setIsDosPayModalOpen] = useState(false);
    const [dosPayTeacherData, setDosPayTeacherData] = useState<{ teacherId: string; teacherName: string; totalAmount: number; totalHours: number; rate: number; sessionIds: string[]; cashVoucherRef?: string; operationsManagerName?: string } | null>(null);
    const [isSubmittingDosPayment, setIsSubmittingDosPayment] = useState(false);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [isCanvasDrawing, setIsCanvasDrawing] = useState(false);
    const [hasTeacherSigned, setHasTeacherSigned] = useState(false);
    const [viewingReceiptPayout, setViewingReceiptPayout] = useState<RemedialPayout | null>(null);
    
    // Remedial Timetable Workflow: DOS -> Headteacher Approval -> Dispersed to Teachers
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [isDisperseModalOpen, setIsDisperseModalOpen] = useState(false);
    const [workflowNotes, setWorkflowNotes] = useState('');
    const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false);
    const [targetHeadteacherId, setTargetHeadteacherId] = useState('');
    
    // Rates Form State
    const [hourlyRate, setHourlyRate] = useState<number>(1000);
    const [weekdayHourlyRate, setWeekdayHourlyRate] = useState<number>(1000);
    const [weekendHourlyRate, setWeekendHourlyRate] = useState<number>(1500);
    const [weekdayDutyFlatRate, setWeekdayDutyFlatRate] = useState<number>(200);
    const [weekdayStartTime, setWeekdayStartTime] = useState<string>('16:00');
    const [weekdayEndTime, setWeekdayEndTime] = useState<string>('18:00');
    const [weekendStartTime, setWeekendStartTime] = useState<string>('08:00');
    const [weekendEndTime, setWeekendEndTime] = useState<string>('12:00');
    const [saturdayStartTime, setSaturdayStartTime] = useState<string>('08:00');
    const [saturdayEndTime, setSaturdayEndTime] = useState<string>('12:00');
    const [sundayStartTime, setSundayStartTime] = useState<string>('09:00');
    const [sundayEndTime, setSundayEndTime] = useState<string>('13:00');
    const [maxLessonsPerDay, setMaxLessonsPerDay] = useState<number>(1);
    const [maxWeekendLessonsPerDay, setMaxWeekendLessonsPerDay] = useState<number>(2);
    const [feePerStudent, setFeePerStudent] = useState<number>(200);
    const [termFee, setTermFee] = useState<number>(3000);
    const [weekendBreakStartTime, setWeekendBreakStartTime] = useState<string>('10:00');
    const [weekendBreakEndTime, setWeekendBreakEndTime] = useState<string>('10:30');
    const [weekendBreakLabel, setWeekendBreakLabel] = useState<string>('Tea & Refreshment Break');
    const [includeWeekendBreak, setIncludeWeekendBreak] = useState<boolean>(true);
    const [saturdayBreakStartTime, setSaturdayBreakStartTime] = useState<string>('10:00');
    const [saturdayBreakEndTime, setSaturdayBreakEndTime] = useState<string>('10:30');
    const [saturdayBreakLabel, setSaturdayBreakLabel] = useState<string>('Saturday Refreshment Break');
    const [includeSaturdayBreak, setIncludeSaturdayBreak] = useState<boolean>(true);
    const [sundayBreakStartTime, setSundayBreakStartTime] = useState<string>('11:00');
    const [sundayBreakEndTime, setSundayBreakEndTime] = useState<string>('11:30');
    const [sundayBreakLabel, setSundayBreakLabel] = useState<string>('Sunday Recess Break');
    const [includeSundayBreak, setIncludeSundayBreak] = useState<boolean>(true);
    const [teacherPreferences, setTeacherPreferences] = useState<Record<string, { preferredDays: string[]; maxLessonsPerWeek?: number; notes?: string }>>({});
    const [isSavingTeacherPrefs, setIsSavingTeacherPrefs] = useState(false);
    const [lastSavedPrefsTime, setLastSavedPrefsTime] = useState<string | null>(null);
    const [teacherDaySearchQuery, setTeacherDaySearchQuery] = useState('');
    const [cancellationCutoffHours, setCancellationCutoffHours] = useState<number>(3);
    const [confirmationTimeoutMinutes, setConfirmationTimeoutMinutes] = useState<number>(45);

    // Teachers Tab Management State
    const [teacherCodes, setTeacherCodes] = useState<Record<string, string>>({});
    const [editingTeacherCodeId, setEditingTeacherCodeId] = useState<string | null>(null);
    const [tempTeacherCode, setTempTeacherCode] = useState<string>('');
    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
    const [teacherAllocationFilter, setTeacherAllocationFilter] = useState<'all' | 'allocated' | 'unallocated' | 'weekend'>('all');

    // Substitution / Reassignment State
    const [reassigningAlloc, setReassigningAlloc] = useState<RemedialAllocation | null>(null);
    const [reassignTeacherId, setReassignTeacherId] = useState<string>('');

    // Manual Allocation Modal State
    const [showAllocModal, setShowAllocModal] = useState(false);
    const [editingAlloc, setEditingAlloc] = useState<RemedialAllocation | null>(null);
    const [allocCourseId, setAllocCourseId] = useState('');
    const [allocStream, setAllocStream] = useState('All Streams');
    const [customAllocStream, setCustomAllocStream] = useState('');
    const [allocSubjectId, setAllocSubjectId] = useState('');
    const [allocTeacherId, setAllocTeacherId] = useState('');
    const [allocDay, setAllocDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'>('Monday');
    const [allocStartTime, setAllocStartTime] = useState('16:00');
    const [allocEndTime, setAllocEndTime] = useState('18:00');
    const [isJointAlloc, setIsJointAlloc] = useState<boolean>(false);
    const [jointStreamsSelected, setJointStreamsSelected] = useState<string[]>([]);
    const [jointCoursesSelected, setJointCoursesSelected] = useState<string[]>([]);
    const [customJointStream, setCustomJointStream] = useState<string>('');
    const [allowManualCollisionOverride, setAllowManualCollisionOverride] = useState<boolean>(false);

    // Timetable Collision & Overlap Resolution State
    const [showOverlapModal, setShowOverlapModal] = useState<boolean>(false);
    const [isResolvingOverlaps, setIsResolvingOverlaps] = useState<boolean>(false);
    const [multiAllocCellItems, setMultiAllocCellItems] = useState<{
        className: string;
        stream: string;
        day: string;
        startTime: string;
        endTime: string;
        allocations: RemedialAllocation[];
    } | null>(null);

    // QR Print / Preview State
    const [printingPrefect, setPrintingPrefect] = useState<User | null>(null);
    const [prefectQrUrl, setPrefectQrUrl] = useState<string>('');
    const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

    // Manual Log Session Modal State
    const [showLogModal, setShowLogModal] = useState(false);
    const [manualTeacherId, setManualTeacherId] = useState('');
    const [manualSubjectId, setManualSubjectId] = useState('');
    const [manualCourseId, setManualCourseId] = useState('');
    const [manualStream, setManualStream] = useState('All Streams');
    const [manualPrefectId, setManualPrefectId] = useState('');
    const [manualHours, setManualHours] = useState<number>(2);
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

    // Reports Hub State
    const [selectedReportType, setSelectedReportType] = useState<'master_timetable' | 'payout_ledger' | 'prefect_audit' | 'billing_statement' | 'workload_summary'>('master_timetable');
    const [reportStartDate, setReportStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [reportEndDate, setReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [reportTeacherFilter, setReportTeacherFilter] = useState<string>('All');
    const [reportClassFilter, setReportClassFilter] = useState<string>('All');
    const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // Master Timetable Report Specific Parameters (matching school printed schedule)
    const [timetableStage, setTimetableStage] = useState<string>('JS');
    const [timetableTerm, setTimetableTerm] = useState<string>('TERM 3');
    const [timetableWeek, setTimetableWeek] = useState<string>('WEEK 3');
    const [timetableYear, setTimetableYear] = useState<string>('2026');
    const [timetableSatDuty, setTimetableSatDuty] = useState<string>('38, 32');
    const [timetableSunDuty, setTimetableSunDuty] = useState<string>('14, 13');

    // Helper to safely apply loaded or cached rate settings
    const applyRateSettings = (r: any) => {
        if (!r) return;
        setRateSetting(r);
        setHourlyRate(r.hourlyRate ?? r.hourly_rate ?? 1000);
        setWeekdayHourlyRate(r.weekdayHourlyRate ?? r.weekday_hourly_rate ?? r.hourlyRate ?? r.hourly_rate ?? 1000);
        setWeekendHourlyRate(r.weekendHourlyRate ?? r.weekend_hourly_rate ?? 1500);
        setWeekdayDutyFlatRate(r.weekdayDutyFlatRate ?? r.weekday_duty_flat_rate ?? r.metadata?.weekdayDutyFlatRate ?? 200);
        setWeekdayStartTime(r.weekdayStartTime || r.weekday_start_time || '16:00');
        setWeekdayEndTime(r.weekdayEndTime || r.weekday_end_time || '18:00');
        const satStart = r.saturdayStartTime || r.saturday_start_time || r.metadata?.saturdayStartTime || r.metadata?.saturday_start_time || r.weekendStartTime || r.weekend_start_time || '08:00';
        const satEnd = r.saturdayEndTime || r.saturday_end_time || r.metadata?.saturdayEndTime || r.metadata?.saturday_end_time || r.weekendEndTime || r.weekend_end_time || '12:00';
        const sunStart = r.sundayStartTime || r.sunday_start_time || r.metadata?.sundayStartTime || r.metadata?.sunday_start_time || r.weekendStartTime || r.weekend_start_time || '09:00';
        const sunEnd = r.sundayEndTime || r.sunday_end_time || r.metadata?.sundayEndTime || r.metadata?.sunday_end_time || r.weekendEndTime || r.weekend_end_time || '13:00';
        setSaturdayStartTime(satStart);
        setSaturdayEndTime(satEnd);
        setSundayStartTime(sunStart);
        setSundayEndTime(sunEnd);
        setWeekendStartTime(satStart);
        setWeekendEndTime(satEnd);
        const cachedWeekendLimit = safeLocalStorage.getItem(`eduai_remedial_weekend_max_${institutionId}`);
        const weekendLimitVal = r.maxWeekendLessonsPerDay ?? 
                                r.max_weekend_lessons_per_day ?? 
                                r.metadata?.maxWeekendLessonsPerDay ?? 
                                r.metadata?.max_weekend_lessons_per_day ?? 
                                (cachedWeekendLimit ? Number(cachedWeekendLimit) : undefined) ?? 
                                2;
        setMaxLessonsPerDay(r.maxLessonsPerDay ?? r.max_lessons_per_day ?? 1);
        setMaxWeekendLessonsPerDay(weekendLimitVal);
        setFeePerStudent(r.feePerStudent ?? r.fee_per_student ?? 200);
        setTermFee(r.termFee ?? r.term_fee ?? 3000);
        const legBreakStart = r.weekendBreakStartTime || r.weekend_break_start_time || r.metadata?.weekendBreakStartTime || r.metadata?.weekend_break_start_time || '10:00';
        const legBreakEnd = r.weekendBreakEndTime || r.weekend_break_end_time || r.metadata?.weekendBreakEndTime || r.metadata?.weekend_break_end_time || '10:30';
        const legBreakLabel = r.weekendBreakLabel || r.weekend_break_label || r.metadata?.weekendBreakLabel || r.metadata?.weekend_break_label || 'Tea & Refreshment Break';
        const loadedIncludeBreak = r.includeWeekendBreak ?? r.include_weekend_break ?? r.metadata?.includeWeekendBreak ?? r.metadata?.include_weekend_break ?? true;

        setWeekendBreakStartTime(legBreakStart);
        setWeekendBreakEndTime(legBreakEnd);
        setWeekendBreakLabel(legBreakLabel);
        setIncludeWeekendBreak(loadedIncludeBreak !== false);

        const satBreakStart = r.saturdayBreakStartTime || r.saturday_break_start_time || r.metadata?.saturdayBreakStartTime || r.metadata?.saturday_break_start_time || legBreakStart;
        const satBreakEnd = r.saturdayBreakEndTime || r.saturday_break_end_time || r.metadata?.saturdayBreakEndTime || r.metadata?.saturday_break_end_time || legBreakEnd;
        const satBreakLabel = r.saturdayBreakLabel || r.saturday_break_label || r.metadata?.saturdayBreakLabel || r.metadata?.saturday_break_label || 'Saturday Refreshment Break';
        const satIncBreak = r.includeSaturdayBreak ?? r.include_saturday_break ?? r.metadata?.includeSaturdayBreak ?? r.metadata?.include_saturday_break ?? loadedIncludeBreak;

        setSaturdayBreakStartTime(satBreakStart);
        setSaturdayBreakEndTime(satBreakEnd);
        setSaturdayBreakLabel(satBreakLabel);
        setIncludeSaturdayBreak(satIncBreak !== false);

        const sunBreakStart = r.sundayBreakStartTime || r.sunday_break_start_time || r.metadata?.sundayBreakStartTime || r.metadata?.sunday_break_start_time || '11:00';
        const sunBreakEnd = r.sundayBreakEndTime || r.sunday_break_end_time || r.metadata?.sundayBreakEndTime || r.metadata?.sunday_break_end_time || '11:30';
        const sunBreakLabel = r.sundayBreakLabel || r.sunday_break_label || r.metadata?.sundayBreakLabel || r.metadata?.sunday_break_label || 'Sunday Recess Break';
        const sunIncBreak = r.includeSundayBreak ?? r.include_sunday_break ?? r.metadata?.includeSundayBreak ?? r.metadata?.include_sunday_break ?? loadedIncludeBreak;

        setSundayBreakStartTime(sunBreakStart);
        setSundayBreakEndTime(sunBreakEnd);
        setSundayBreakLabel(sunBreakLabel);
        setIncludeSundayBreak(sunIncBreak !== false);
        const loadedTeacherPrefs = r.teacherPreferences || r.teacher_preferences || r.metadata?.teacherPreferences || r.metadata?.teacher_preferences || {};
        if (loadedTeacherPrefs && typeof loadedTeacherPrefs === 'object' && Object.keys(loadedTeacherPrefs).length > 0) {
            setTeacherPreferences(prev => ({ ...prev, ...loadedTeacherPrefs }));
            if (institutionId) {
                safeLocalStorage.setItem(`remedial_teacher_prefs_${institutionId}`, JSON.stringify(loadedTeacherPrefs));
            }
        }
        const loadedCodes = r.teacherCodes || r.teacher_codes || r.metadata?.teacherCodes || r.metadata?.teacher_codes || {};
        if (loadedCodes && typeof loadedCodes === 'object' && Object.keys(loadedCodes).length > 0) {
            setTeacherCodes(prev => ({ ...loadedCodes, ...prev }));
        }
        setCancellationCutoffHours(r.cancellationCutoffHours ?? r.cancellation_cutoff_hours ?? r.metadata?.cancellationCutoffHours ?? 3);
        setConfirmationTimeoutMinutes(r.confirmationTimeoutMinutes ?? r.confirmation_timeout_minutes ?? r.metadata?.confirmationTimeoutMinutes ?? 45);
    };

    // Load Data with optimistic caching and instantaneous unblocking
    const loadData = async (skipCache = false) => {
        // 1. Optimistic hydration from cache for instant zero-latency UI rendering
        if (!skipCache && institutionId) {
            try {
                const cachedRates = safeLocalStorage.getItem(`remedial_rates_${institutionId}`);
                if (cachedRates) {
                    const parsed = JSON.parse(cachedRates);
                    if (Array.isArray(parsed) && parsed.length > 0) applyRateSettings(parsed[0]);
                }
                const cachedTeacherPrefs = safeLocalStorage.getItem(`remedial_teacher_prefs_${institutionId}`);
                if (cachedTeacherPrefs) {
                    const parsed = JSON.parse(cachedTeacherPrefs);
                    if (parsed && typeof parsed === 'object') setTeacherPreferences(prev => ({ ...prev, ...parsed }));
                }
                const cachedTeacherCodes = safeLocalStorage.getItem(`remedial_teacher_codes_${institutionId}`);
                if (cachedTeacherCodes) {
                    const parsed = JSON.parse(cachedTeacherCodes);
                    if (parsed && typeof parsed === 'object') setTeacherCodes(prev => ({ ...parsed, ...prev }));
                }
                const cachedAlloc = safeLocalStorage.getItem(`remedial_allocations_${institutionId}`);
                if (cachedAlloc) {
                    const parsed = JSON.parse(cachedAlloc);
                    if (Array.isArray(parsed) && parsed.length > 0) setAllocations(parsed);
                }
                const cachedSessions = safeLocalStorage.getItem(`remedial_sessions_${institutionId}`);
                if (cachedSessions) {
                    const parsed = JSON.parse(cachedSessions);
                    if (Array.isArray(parsed) && parsed.length > 0) setSessions(parsed);
                }
                const cachedSubs = safeLocalStorage.getItem(`remedial_subjects_${institutionId}`);
                if (cachedSubs) {
                    const parsed = JSON.parse(cachedSubs);
                    if (Array.isArray(parsed) && parsed.length > 0) setRemedialSubjects(parsed);
                }
                const cachedDuty = safeLocalStorage.getItem(`remedial_duty_roster_${institutionId}`);
                if (cachedDuty) {
                    const parsed = JSON.parse(cachedDuty);
                    if (Array.isArray(parsed) && parsed.length > 0) setWeekendDutyRoster(parsed);
                }
            } catch (err) {
                // Ignore cache parse warnings
            }
        }

        // Only show full loading spinner if we have zero cached items
        if (sessions.length === 0 && allocations.length === 0 && remedialSubjects.length === 0) {
            setLoading(true);
        }

        try {
            // 2. Fetch primary remedial operations in parallel (ultra-fast, ~100ms)
            const [sessResult, ratesResult, payResult, allocResult, remSubResult, dutyResult] = await Promise.allSettled([
                apiService.fetchRemedialSessions(institutionId),
                apiService.fetchRemedialRateSettings(institutionId),
                apiService.fetchRemedialPayouts(institutionId),
                typeof (apiService as any).fetchRemedialAllocations === 'function'
                    ? (apiService as any).fetchRemedialAllocations(institutionId)
                    : apiService.fetchModuleRecords<RemedialAllocation>('school_remedial_allocations', institutionId).catch(() => []),
                typeof (apiService as any).fetchRemedialSubjects === 'function'
                    ? (apiService as any).fetchRemedialSubjects(institutionId)
                    : apiService.fetchModuleRecords<RemedialSubject>('school_remedial_subjects', institutionId).catch(() => []),
                apiService.fetchModuleRecords<RemedialWeekendDuty>('school_remedial_duty_roster', institutionId).catch(() => [])
            ]);

            const sessList = sessResult.status === 'fulfilled' && Array.isArray(sessResult.value) ? sessResult.value : [];
            const rates = ratesResult.status === 'fulfilled' && Array.isArray(ratesResult.value) ? ratesResult.value : [];
            const payList = payResult.status === 'fulfilled' && Array.isArray(payResult.value) ? payResult.value : [];
            const allocList = allocResult.status === 'fulfilled' && Array.isArray(allocResult.value) ? allocResult.value : [];
            const remSubList = remSubResult.status === 'fulfilled' && Array.isArray(remSubResult.value) ? remSubResult.value : [];
            const dutyList = dutyResult.status === 'fulfilled' && Array.isArray(dutyResult.value) ? dutyResult.value : [];

            setSessions(sessList);
            setPayouts(payList);
            setAllocations(allocList);
            setRemedialSubjects(remSubList);
            setWeekendDutyRoster(dutyList);

            if (rates && rates.length > 0) {
                applyRateSettings(rates[0]);
                safeLocalStorage.setItem(`remedial_rates_${institutionId}`, JSON.stringify(rates));
            }
            if (allocList.length > 0) {
                safeLocalStorage.setItem(`remedial_allocations_${institutionId}`, JSON.stringify(allocList));
            }
            if (sessList.length > 0) {
                safeLocalStorage.setItem(`remedial_sessions_${institutionId}`, JSON.stringify(sessList));
            }
            if (remSubList.length > 0) {
                safeLocalStorage.setItem(`remedial_subjects_${institutionId}`, JSON.stringify(remSubList));
            }
            if (dutyList.length > 0) {
                safeLocalStorage.setItem(`remedial_duty_roster_${institutionId}`, JSON.stringify(dutyList));
            }

            // Unblock the user interface immediately!
            setLoading(false);

            // 3. Asynchronously fetch heavy tables (invoices, student enrollments, school subjects fallback) in the background
            Promise.allSettled([
                apiService.fetchInvoices(institutionId),
                apiService.fetchModuleRecords<StudentEnrollment>('student_enrollments', institutionId).catch(() => []),
                (!subjects || subjects.length === 0)
                    ? apiService.fetchModuleRecords<Subject>('subjects', institutionId).catch(() => [])
                    : Promise.resolve([])
            ]).then(([invRes, enrRes, subRes]) => {
                if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
                    setInvoices(invRes.value);
                }
                if (enrRes.status === 'fulfilled' && Array.isArray(enrRes.value)) {
                    setEnrollments(enrRes.value);
                }
                if (subRes.status === 'fulfilled' && Array.isArray(subRes.value) && subRes.value.length > 0) {
                    setFetchedSchoolSubjects(subRes.value);
                }
            }).catch(e => {
                console.warn('[Remedial] Background invoice/enrollment fetch warning:', e);
            });

        } catch (e) {
            console.error('Failed to load remedial data', e);
            setLoading(false);
        }
    };

    // Auto-load data on mount and whenever the active institution changes
    useEffect(() => {
        if (institutionId) {
            loadData();
        }
    }, [institutionId]);

    // Enriched users with active teacherCodes mapped for instant reactivity
    const enrichedUsers = useMemo(() => {
        return (users || []).map(u => {
            const customCode = teacherCodes[u.id];
            if (customCode) {
                return {
                    ...u,
                    teacherCode: customCode,
                    code: customCode,
                    metadata: {
                        ...(u.metadata || {}),
                        teacherCode: customCode,
                        remedialTeacherCode: customCode
                    }
                };
            }
            return u;
        });
    }, [users, teacherCodes]);

    // Sync initial teacher codes from user objects when users load
    useEffect(() => {
        if (!users || users.length === 0) return;
        const newMap: Record<string, string> = {};
        users.forEach(u => {
            if (u && isAcademicTeacher(u)) {
                const explicit = u.teacherCode || u.code || u.metadata?.teacherCode || u.metadata?.remedialTeacherCode || u.staffId;
                if (explicit && !teacherCodes[u.id]) {
                    newMap[u.id] = String(explicit).trim();
                }
            }
        });
        if (Object.keys(newMap).length > 0) {
            setTeacherCodes(prev => ({ ...newMap, ...prev }));
        }
    }, [users]);

    // Teachers and Prefects Lists (strictly verified academic teachers, excluding non-academic support staff)
    const teachersList = useMemo(() => {
        return (enrichedUsers || []).filter(u => isAcademicTeacher(u));
    }, [enrichedUsers]);

    // Filtered teachers for Teachers Tab
    const filteredTeachers = useMemo(() => {
        return teachersList.filter(teacher => {
            const teacherName = (teacher.name || '').toLowerCase();
            const teacherEmail = (teacher.email || '').toLowerCase();
            const teacherPhone = (teacher.phoneNumber || '').toLowerCase();
            const currentCode = (teacherCodes[teacher.id] || getTeacherCode(teacher.id, teacher.name, teachersList)).toLowerCase();
            const q = teacherSearchQuery.toLowerCase().trim();

            const matchesSearch = !q || teacherName.includes(q) || teacherEmail.includes(q) || teacherPhone.includes(q) || currentCode.includes(q);
            if (!matchesSearch) return false;

            const teacherAllocs = allocations.filter(a => a.teacherId === teacher.id);
            if (teacherAllocationFilter === 'allocated') {
                return teacherAllocs.length > 0;
            }
            if (teacherAllocationFilter === 'unallocated') {
                return teacherAllocs.length === 0;
            }
            if (teacherAllocationFilter === 'weekend') {
                const prefs = teacherPreferences[teacher.id]?.preferredDays || [];
                const hasWeekendAlloc = teacherAllocs.some(a => a.dayOfWeek === 'Saturday' || a.dayOfWeek === 'Sunday');
                const hasWeekendPref = prefs.includes('Saturday') || prefs.includes('Sunday');
                return hasWeekendAlloc || hasWeekendPref;
            }
            return true;
        });
    }, [teachersList, teacherSearchQuery, teacherAllocationFilter, allocations, teacherCodes, enrichedUsers, teacherPreferences]);

    const prefectsList = useMemo(() => {
        const list: any[] = [];
        const addedIds = new Set<string>();

        // 1. Existing user-level prefects
        (users || []).forEach(u => {
            if (u && ((u.role as string) === 'prefect' || (u.metadata as any)?.isPrefect)) {
                const leadPos = (u.metadata as any)?.leadershipPosition || ((u.role as string) === 'prefect' ? 'Class Prefect' : 'Class Leader');
                const uCourse = courses.find(c => c.id === u.courseId || (u.metadata as any)?.courseId || (c.name && (u as any).studentClass && c.name.trim().toLowerCase() === String((u as any).studentClass).trim().toLowerCase()));
                const stream = (u.metadata as any)?.stream || (u as any).stream || '';
                list.push({
                    ...u,
                    id: u.id,
                    name: `${u.name} (${leadPos})`,
                    rawName: u.name,
                    role: 'prefect',
                    leadershipPosition: leadPos,
                    admissionNumber: (u as any).admissionNumber || (u.metadata as any)?.admissionNumber || '',
                    courseId: uCourse?.id || u.courseId || (u.metadata as any)?.courseId || '',
                    className: uCourse?.name || (u.metadata as any)?.className || (u as any).studentClass || '',
                    stream,
                    email: u.email,
                    phoneNumber: u.phoneNumber || (u.metadata as any)?.phoneNumber || '',
                    metadata: {
                        ...(u.metadata || {}),
                        isPrefect: true,
                        leadershipPosition: leadPos,
                        className: uCourse?.name || (u.metadata as any)?.className || (u as any).studentClass || '',
                        stream
                    }
                });
                addedIds.add(u.id);
            }
        });

        // 2. Enrolled students who hold leadership positions
        (enrollments || []).forEach(enr => {
            const leadPos = (enr.leadershipPosition || enr.metadata?.leadershipPosition || (enr as any)?.leadership_position || '').trim();
            if (!leadPos) return;

            const studentUser = users.find(u => u.id === enr.userId);
            const rawId = studentUser?.id || enr.userId || enr.id;
            if (addedIds.has(rawId)) return;

            const studentName = studentUser?.name || enr.metadata?.studentName || enr.metadata?.name || enr.metadata?.fullName || 'Student Leader';
            const grade = enr.metadata?.gradeLevel || (studentUser as any)?.studentClass || '';
            const stream = enr.metadata?.stream || (studentUser as any)?.stream || '';

            // Match course/class
            const matchedCourse = courses.find(c => 
                c.id === enr.courseId || 
                (c.name && grade && c.name.trim().toLowerCase() === grade.trim().toLowerCase())
            );

            list.push({
                id: rawId,
                name: `${studentName} (${leadPos})`,
                rawName: studentName,
                role: 'prefect',
                institutionId: enr.institutionId || institutionId,
                courseId: matchedCourse?.id || enr.courseId || '',
                className: matchedCourse?.name || grade || '',
                stream: stream || '',
                leadershipPosition: leadPos,
                admissionNumber: enr.admissionNumber || enr.metadata?.admissionNumber || (studentUser as any)?.admissionNumber || '',
                enrollmentId: enr.id,
                email: studentUser?.email,
                phoneNumber: studentUser?.phoneNumber || enr.metadata?.phoneNumber || enr.metadata?.parentPhone || '',
                metadata: {
                    ...(studentUser?.metadata || {}),
                    isPrefect: true,
                    leadershipPosition: leadPos,
                    className: matchedCourse?.name || grade || '',
                    stream: stream || ''
                }
            });
            addedIds.add(rawId);
        });

        return list;
    }, [users, enrollments, courses, institutionId]);

    // Helper to get distinct streams for a class
    const getClassStreams = (course: Course): string[] => {
        const streamSet = new Set<string>();
        if (Array.isArray(course.streams) && course.streams.length > 0) {
            course.streams.forEach(s => s && streamSet.add(String(s).trim()));
        }
        if (Array.isArray(course.levels)) {
            course.levels.forEach(lvl => {
                const name = String(lvl.name || '').trim();
                if (name) streamSet.add(name);
            });
        }
        (enrollments || []).forEach(enr => {
            const isMatch = enr.courseId === course.id || 
                (enr.metadata?.gradeLevel && course.name && enr.metadata.gradeLevel.trim().toLowerCase() === course.name.trim().toLowerCase());
            if (isMatch) {
                const str = (enr.metadata?.stream || (enr as any).stream || '').trim();
                if (str && str !== 'All Streams') streamSet.add(str);
            }
        });
        (users || []).forEach(u => {
            if (u.role === 'student' && (u.courseId === course.id || (u as any).studentClass === course.name)) {
                const str = ((u.metadata as any)?.stream || (u as any).stream || '').trim();
                if (str && str !== 'All Streams') streamSet.add(str);
            }
        });
        allocations.forEach(a => {
            if (a.courseId === course.id || a.className === course.name) {
                if (a.stream && a.stream !== 'All Streams' && !a.stream.includes('+')) {
                    streamSet.add(a.stream.trim());
                }
            }
        });
        if (streamSet.size === 0) {
            const instStreams = (currentInstitution?.streamDefinitions || currentInstitution?.streams || []) as any[];
            if (Array.isArray(instStreams) && instStreams.length > 0) {
                instStreams.forEach(s => {
                    const sName = typeof s === 'string' ? s.trim() : (s?.name ? String(s.name).trim() : '');
                    if (sName) streamSet.add(sName);
                });
            }
        }
        if (streamSet.size === 0) {
            return ['General'];
        }
        return Array.from(streamSet).sort();
    };

    // Students eligible to be appointed as class prefects or secretaries
    const eligibleStudents = useMemo(() => {
        return (users || [])
            .filter(u => u.role === 'student' || !u.role || (u.role as string) === 'prefect')
            .map(u => {
                const enr = (enrollments || []).find(e => e.userId === u.id);
                const course = courses.find(c => c.id === enr?.courseId || c.id === u.courseId);
                const grade = enr?.metadata?.gradeLevel || (u as any).studentClass || course?.name || '';
                const stream = enr?.metadata?.stream || (u as any).stream || '';
                const admNo = enr?.admissionNumber || enr?.metadata?.admissionNumber || (u as any).admissionNumber || '';
                const currentLeadership = enr?.leadershipPosition || enr?.metadata?.leadershipPosition || (u.metadata as any)?.leadershipPosition || '';
                return {
                    id: u.id,
                    name: u.name,
                    admissionNumber: admNo,
                    courseId: course?.id || enr?.courseId || u.courseId || '',
                    className: course?.name || grade,
                    stream: stream,
                    phoneNumber: u.phoneNumber || enr?.metadata?.parentPhone || '',
                    currentLeadership,
                    enrollmentId: enr?.id
                };
            });
    }, [users, enrollments, courses]);

    // Modal filtered students list for assigning a leader
    const modalFilteredStudents = useMemo(() => {
        let list = eligibleStudents;
        if (leaderModalTargetCourseId) {
            const targetCourse = courses.find(c => c.id === leaderModalTargetCourseId);
            const courseName = targetCourse?.name?.toLowerCase().trim() || '';
            const classMatches = list.filter(st => {
                const matchesClass = st.courseId === leaderModalTargetCourseId || 
                    (st.className && courseName && st.className.toLowerCase().trim() === courseName);
                if (leaderModalTargetStream && leaderModalTargetStream !== '__custom__' && leaderModalTargetStream !== 'All Streams' && st.stream) {
                    return matchesClass && st.stream.toLowerCase().trim() === leaderModalTargetStream.toLowerCase().trim();
                }
                return matchesClass;
            });
            if (classMatches.length > 0) {
                list = classMatches;
            } else {
                const broaderMatches = list.filter(st => 
                    st.courseId === leaderModalTargetCourseId || 
                    (st.className && courseName && st.className.toLowerCase().trim() === courseName)
                );
                if (broaderMatches.length > 0) list = broaderMatches;
            }
        }

        if (leaderModalStudentSearch.trim()) {
            const q = leaderModalStudentSearch.toLowerCase().trim();
            list = eligibleStudents.filter(st => 
                (st.name || '').toLowerCase().includes(q) ||
                (st.admissionNumber || '').toLowerCase().includes(q) ||
                (st.className || '').toLowerCase().includes(q) ||
                (st.stream || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [eligibleStudents, leaderModalTargetCourseId, leaderModalTargetStream, leaderModalStudentSearch, courses]);

    // Filtered prefects & secretaries list
    const filteredPrefectsList = useMemo(() => {
        return prefectsList.filter(p => {
            const course = courses.find(c => c.id === p.courseId);
            const className = course?.name || p.className || '';
            const role = (p.leadershipPosition || '').toLowerCase();
            const isSecretary = role.includes('secretary');
            const isPrefect = role.includes('prefect') || role.includes('captain') || role.includes('head');

            if (prefectClassFilter !== 'All' && p.courseId !== prefectClassFilter && className !== prefectClassFilter) {
                return false;
            }

            if (prefectRoleFilter === 'prefect' && !isPrefect) return false;
            if (prefectRoleFilter === 'secretary' && !isSecretary) return false;
            if (prefectRoleFilter === 'other' && (isPrefect || isSecretary)) return false;

            if (prefectSearchQuery.trim()) {
                const q = prefectSearchQuery.toLowerCase().trim();
                const matchName = (p.rawName || p.name || '').toLowerCase().includes(q);
                const matchAdm = (p.admissionNumber || '').toLowerCase().includes(q);
                const matchClass = className.toLowerCase().includes(q);
                const matchStream = (p.stream || '').toLowerCase().includes(q);
                const matchRole = (p.leadershipPosition || '').toLowerCase().includes(q);
                const matchPhone = (p.phoneNumber || '').toLowerCase().includes(q);
                return matchName || matchAdm || matchClass || matchStream || matchRole || matchPhone;
            }

            return true;
        });
    }, [prefectsList, prefectClassFilter, prefectRoleFilter, prefectSearchQuery, courses]);

    // Statistics for Prefects & Secretaries Tab
    const prefectStats = useMemo(() => {
        const total = prefectsList.length;
        let prefectsCount = 0;
        let secretariesCount = 0;
        let otherCount = 0;
        const coveredClasses = new Set<string>();
        const coveredStreams = new Set<string>();

        prefectsList.forEach(p => {
            const role = (p.leadershipPosition || '').toLowerCase();
            if (role.includes('secretary')) secretariesCount++;
            else if (role.includes('prefect') || role.includes('captain')) prefectsCount++;
            else otherCount++;

            if (p.courseId || p.className) coveredClasses.add(p.courseId || p.className);
            if ((p.courseId || p.className) && p.stream) {
                coveredStreams.add(`${p.courseId || p.className}_${p.stream}`);
            }
        });

        return {
            total,
            prefectsCount,
            secretariesCount,
            otherCount,
            classesCovered: coveredClasses.size,
            totalClasses: courses.length,
            streamsCovered: coveredStreams.size
        };
    }, [prefectsList, courses]);

    // Handler to open assign leader modal
    const handleOpenAssignLeaderModal = (prefillCourseId?: string, prefillStream?: string, prefillRole?: string) => {
        setLeaderModalTargetCourseId(prefillCourseId || (courses[0]?.id || ''));
        setLeaderModalTargetStream(prefillStream || '');
        setLeaderModalCustomStream('');
        setLeaderModalRole(prefillRole || 'Class Prefect');
        setLeaderModalCustomRole('');
        setLeaderModalSelectedStudentId('');
        setLeaderModalContactPhone('');
        setLeaderModalStudentSearch('');
        setIsAssignLeaderModalOpen(true);
    };

    // Handler to save leader appointment
    const handleSaveLeaderAssignment = async () => {
        if (!leaderModalSelectedStudentId) {
            alert('Please select a student to appoint as leader.');
            return;
        }
        if (!leaderModalTargetCourseId) {
            alert('Please select a class.');
            return;
        }

        const finalRole = (leaderModalRole === '__custom__' ? leaderModalCustomRole.trim() : leaderModalRole) || 'Class Prefect';
        const finalStream = (leaderModalTargetStream === '__custom__' ? leaderModalCustomStream.trim() : leaderModalTargetStream) || '';
        const targetCourse = courses.find(c => c.id === leaderModalTargetCourseId);
        const targetStudent = users.find(u => u.id === leaderModalSelectedStudentId);

        try {
            setIsSavingLeader(true);

            // 1. Update user record FIRST to ensure user exists in database for FK constraint
            if (targetStudent) {
                const updatedUser: User = {
                    ...targetStudent,
                    courseId: leaderModalTargetCourseId,
                    phoneNumber: leaderModalContactPhone || targetStudent.phoneNumber,
                    metadata: {
                        ...(targetStudent.metadata || {}),
                        leadershipPosition: finalRole,
                        isPrefect: true,
                        studentClass: targetCourse?.name || '',
                        stream: finalStream || (targetStudent.metadata as any)?.stream || ''
                    }
                };
                await apiService.saveModuleRecord('users', updatedUser);
                Object.assign(targetStudent, updatedUser);
            }

            // 2. Update or create student enrollment
            let existingEnr = (enrollments || []).find(e => e.userId === leaderModalSelectedStudentId);
            if (existingEnr) {
                const updatedEnr: StudentEnrollment = {
                    ...existingEnr,
                    courseId: leaderModalTargetCourseId,
                    leadershipPosition: finalRole,
                    metadata: {
                        ...(existingEnr.metadata || {}),
                        leadershipPosition: finalRole,
                        isPrefect: true,
                        gradeLevel: targetCourse?.name || existingEnr.metadata?.gradeLevel || '',
                        stream: finalStream || existingEnr.metadata?.stream || '',
                        phoneNumber: leaderModalContactPhone || existingEnr.metadata?.phoneNumber || targetStudent?.phoneNumber || ''
                    },
                    updatedAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('student_enrollments', updatedEnr);
                setEnrollments(prev => prev.map(item => item.id === updatedEnr.id ? updatedEnr : item));
            } else {
                const newEnr: StudentEnrollment = {
                    id: `enr_lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    institutionId,
                    userId: leaderModalSelectedStudentId,
                    courseId: leaderModalTargetCourseId,
                    enrollmentType: 'academic',
                    status: 'Enrolled',
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    leadershipPosition: finalRole,
                    metadata: {
                        leadershipPosition: finalRole,
                        isPrefect: true,
                        gradeLevel: targetCourse?.name || '',
                        stream: finalStream,
                        studentName: targetStudent?.name || 'Student',
                        phoneNumber: leaderModalContactPhone || targetStudent?.phoneNumber || ''
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('student_enrollments', newEnr);
                setEnrollments(prev => [...prev, newEnr]);
            }

            setIsAssignLeaderModalOpen(false);
            alert(`Appointed ${targetStudent?.name || 'Student'} as ${finalRole} for ${targetCourse?.name || 'Class'}${finalStream ? ` (${finalStream})` : ''} successfully.`);
        } catch (err: any) {
            console.error('Failed to assign leader:', err);
            alert(err.message || 'Failed to save leader assignment.');
        } finally {
            setIsSavingLeader(false);
        }
    };

    // Handler to revoke a leader appointment
    const handleRevokeLeader = async (leader: any) => {
        const leadName = leader.rawName || leader.name || 'Student';
        const roleName = leader.leadershipPosition || 'Class Leader';
        if (!window.confirm(`Revoke ${roleName} appointment for ${leadName}? They will no longer hold this class leadership position.`)) {
            return;
        }

        try {
            setLoading(true);
            const enr = (enrollments || []).find(e => e.id === leader.enrollmentId || e.userId === leader.id);
            if (enr) {
                const updatedEnr: StudentEnrollment = {
                    ...enr,
                    leadershipPosition: '',
                    metadata: {
                        ...(enr.metadata || {}),
                        leadershipPosition: '',
                        isPrefect: false
                    },
                    updatedAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('student_enrollments', updatedEnr);
                setEnrollments(prev => prev.map(item => item.id === updatedEnr.id ? updatedEnr : item));
            }

            const targetUser = users.find(u => u.id === leader.id);
            if (targetUser) {
                const updatedUser: User = {
                    ...targetUser,
                    role: (targetUser.role as string) === 'prefect' ? 'student' : targetUser.role,
                    metadata: {
                        ...(targetUser.metadata || {}),
                        leadershipPosition: '',
                        isPrefect: false
                    }
                };
                await apiService.saveModuleRecord('users', updatedUser);
            }

            alert(`Revoked ${roleName} status for ${leadName}.`);
        } catch (err: any) {
            console.error('Failed to revoke leader:', err);
            alert(err.message || 'Failed to revoke leadership position.');
        } finally {
            setLoading(false);
        }
    };

    // Handler to bulk print all class leader QR badges
    const handlePrintAllPrefectsCards = () => {
        if (prefectsList.length === 0) {
            alert('No prefects or class secretaries currently configured to print.');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=900,height=900');
        if (!printWindow) return;

        const schoolName = String(currentInstitution?.name || 'School Remedial Program').toUpperCase();

        const cardsHtml = prefectsList.map(p => {
            const course = courses.find(c => c.id === p.courseId);
            const className = course?.name || p.className || 'Class';
            const stream = p.stream || 'All Streams';
            const role = p.leadershipPosition || 'Class Leader';
            const isSecretary = role.toLowerCase().includes('secretary');
            const token = `prefect_remedial_token_class_${p.courseId || 'general'}${p.stream ? `_${encodeURIComponent(p.stream)}` : ''}`;
            const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(token)}`;

            return `
                <div style="border:2px solid ${isSecretary ? '#7c3aed' : '#2563eb'};border-radius:16px;padding:16px;background:#ffffff;text-align:center;page-break-inside:avoid;box-shadow:0 2px 4px rgba(0,0,0,0.05);display:flex;flex-direction:column;justify-content:space-between;height:290px;">
                    <div>
                        <div style="font-size:9px;font-weight:900;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:2px;">${schoolName}</div>
                        <div style="font-size:12px;font-weight:900;color:#0f172a;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:6px;">REMEDIAL VERIFICATION BADGE</div>
                        <div style="font-size:14px;font-weight:900;color:${isSecretary ? '#6d28d9' : '#1d4ed8'};margin-bottom:2px;">${p.rawName || p.name}</div>
                        <div style="display:inline-block;background:${isSecretary ? '#f5f3ff' : '#eff6ff'};color:${isSecretary ? '#7c3aed' : '#2563eb'};border:1px solid ${isSecretary ? '#ddd6fe' : '#bfdbfe'};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;margin-bottom:6px;">
                            ${role}
                        </div>
                        <div style="font-size:11px;font-weight:700;color:#334155;">${className} &bull; Stream: ${stream}</div>
                        ${p.admissionNumber ? `<div style="font-size:9px;font-weight:600;color:#64748b;">Adm No: ${p.admissionNumber}</div>` : ''}
                    </div>
                    <div style="margin:6px 0;">
                        <img src="${qrSrc}" width="90" height="90" style="display:inline-block;border:1px solid #cbd5e1;border-radius:8px;padding:3px;background:#fff;" alt="QR Code" />
                    </div>
                    <div>
                        <div style="font-family:monospace;font-size:8px;font-weight:bold;color:#64748b;letter-spacing:0.5px;background:#f8fafc;padding:3px 6px;border-radius:4px;border:1px dashed #cbd5e1;">${token}</div>
                        <div style="font-size:8px;color:#94a3b8;margin-top:3px;">Scan to Verify Remedial Session Attendance</div>
                    </div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${schoolName} - Class Leaders QR Badges</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 10px; background: #fff; }
                    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin:0;font-size:18px;font-weight:900;text-transform:uppercase;color:#0f172a;">${schoolName}</h2>
                    <h4 style="margin:4px 0 0;font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:1px;">Remedial Class Prefects &amp; Class Secretaries QR Directory</h4>
                </div>
                <div class="grid">
                    ${cardsHtml}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // User Role Detection for Remedial Workflows
    const userRole = (currentUser?.role || '').toLowerCase();
    const isHeadteacherUser = [
        'head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress', 'admin', 'super_admin'
    ].includes(userRole);
    const isDosUser = [
        'dos', 'director_of_studies', 'academic_officer', 'deputy', 'deputy_principal', 'deputy_headteacher', 'admin', 'super_admin'
    ].includes(userRole);
    const isTeacherUser = userRole === 'teacher';

    // Extracted Headteachers / Principals directory
    const headteachersList = useMemo(() => {
        return users.filter(u => {
            const r = (u.role || '').toLowerCase();
            return ['head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress', 'admin', 'super_admin'].includes(r);
        });
    }, [users]);

    // Current Timetable Approval State from rateSetting.metadata.timetableApproval
    const timetableApproval: RemedialTimetableApproval = useMemo(() => {
        const existing = (rateSetting?.metadata as any)?.timetableApproval;
        if (existing && existing.status) {
            return existing;
        }
        return {
            status: allocations.length > 0 ? 'draft' : 'draft',
            forwardedBy: '',
            forwardedAt: '',
            approvedBy: '',
            approvedAt: '',
            approvalNotes: '',
            revisionNotes: '',
            forwardingNotes: ''
        };
    }, [rateSetting, allocations.length]);

    // Distinct teachers in allocations for dispersal & stats
    const distinctTeachersInAllocations = useMemo(() => {
        const map = new Map<string, { teacherId: string; teacherName: string; slotsCount: number; classes: Set<string>; subjects: Set<string> }>();
        allocations.forEach(a => {
            if (!a.teacherId) return;
            const existing = map.get(a.teacherId) || {
                teacherId: a.teacherId,
                teacherName: a.teacherName || 'Teacher',
                slotsCount: 0,
                classes: new Set<string>(),
                subjects: new Set<string>()
            };
            existing.slotsCount += 1;
            if (a.className) existing.classes.add(a.className);
            if (a.subjectName) existing.subjects.add(a.subjectName);
            map.set(a.teacherId, existing);
        });
        return Array.from(map.values()).map(v => ({
            ...v,
            classes: Array.from(v.classes),
            subjects: Array.from(v.subjects)
        }));
    }, [allocations]);

    // Helper to persist updated timetable approval status in rateSetting.metadata
    const updateTimetableApproval = async (approvalData: Partial<RemedialTimetableApproval>) => {
        try {
            const currentApproval = (rateSetting?.metadata as any)?.timetableApproval || {};
            const updatedApproval: RemedialTimetableApproval = {
                ...currentApproval,
                ...approvalData
            };
            const updatedMetadata = {
                ...((rateSetting as any)?.metadata || {}),
                timetableApproval: updatedApproval
            };
            const updatedRateSetting = {
                ...(rateSetting || {}),
                id: rateSetting?.id || `rates_${institutionId}`,
                institutionId,
                hourlyRate: rateSetting?.hourlyRate || hourlyRate,
                weekdayHourlyRate: rateSetting?.weekdayHourlyRate || weekdayHourlyRate,
                weekendHourlyRate: rateSetting?.weekendHourlyRate || weekendHourlyRate,
                weekdayStartTime: rateSetting?.weekdayStartTime || weekdayStartTime,
                weekdayEndTime: rateSetting?.weekdayEndTime || weekdayEndTime,
                weekendStartTime: rateSetting?.weekendStartTime || weekendStartTime,
                weekendEndTime: rateSetting?.weekendEndTime || weekendEndTime,
                saturdayStartTime: rateSetting?.saturdayStartTime || saturdayStartTime,
                saturdayEndTime: rateSetting?.saturdayEndTime || saturdayEndTime,
                sundayStartTime: rateSetting?.sundayStartTime || sundayStartTime,
                sundayEndTime: rateSetting?.sundayEndTime || sundayEndTime,
                feePerStudent: rateSetting?.feePerStudent || feePerStudent,
                termFee: rateSetting?.termFee || termFee,
                metadata: updatedMetadata,
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('school_remedial_rate_settings', updatedRateSetting);
            setRateSetting(updatedRateSetting as any);
            return updatedApproval;
        } catch (err: any) {
            console.error('Failed to update timetable approval status:', err);
            throw err;
        }
    };

    // Handler to open forward modal
    const handleOpenForwardModal = () => {
        if (allocations.length === 0) {
            alert('No remedial timetable allocations found. Please auto-generate or create allocations first before forwarding.');
            return;
        }
        setWorkflowNotes(
            timetableApproval.forwardingNotes || 
            `Compiled Remedial Timetable with ${allocations.length} sessions across ${courses.length} classes for Term review. Forwarded for official approval and teacher dispersal.`
        );
        setTargetHeadteacherId(headteachersList[0]?.id || '');
        setIsForwardModalOpen(true);
    };

    // Handler to confirm forward to Headteacher
    const handleConfirmForwardToHeadteacher = async () => {
        setIsSubmittingWorkflow(true);
        try {
            const targetHead = headteachersList.find(h => h.id === targetHeadteacherId);
            await updateTimetableApproval({
                status: 'pending_headteacher',
                forwardedBy: currentUser?.name || 'Director of Studies (DOS)',
                forwardedById: currentUser?.id || '',
                forwardedAt: new Date().toISOString(),
                forwardingNotes: workflowNotes.trim(),
                targetHeadteacherId: targetHead?.id || '',
                targetHeadteacherName: targetHead?.name || 'Headteacher / Principal',
                revisionNotes: ''
            });

            // Disperse communication record to school communications
            try {
                await apiService.saveModuleRecord('school_communications', {
                    id: `comm_remedial_approval_${Date.now()}`,
                    institutionId,
                    type: 'notification',
                    title: 'Remedial Timetable Awaiting Approval',
                    content: `Director of Studies (${currentUser?.name || 'DOS'}) has compiled and submitted the Remedial Timetable (${allocations.length} sessions, ${distinctTeachersInAllocations.length} teachers) for your review and dispersal sign-off.`,
                    senderId: currentUser?.id,
                    senderName: currentUser?.name || 'Director of Studies',
                    targetRole: 'headteacher',
                    priority: 'high',
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            } catch (commErr) {
                console.warn('Could not post communication notification:', commErr);
            }

            onLogAction?.(`Forwarded Remedial Timetable (${allocations.length} sessions) to Headteacher for approval.`);
            setIsForwardModalOpen(false);
            alert('Remedial Timetable successfully forwarded to the Headteacher for approval.');
        } catch (err: any) {
            alert(err.message || 'Failed to forward timetable.');
        } finally {
            setIsSubmittingWorkflow(false);
        }
    };

    // Handler to open approve modal
    const handleOpenApproveModal = () => {
        setWorkflowNotes(
            timetableApproval.approvalNotes || 
            `Approved by the Principal / Headteacher for immediate implementation. All allocated subject teachers are authorized to conduct sessions as scheduled.`
        );
        setIsApproveModalOpen(true);
    };

    // Handler to confirm approve and disperse
    const handleConfirmApproveAndDisperse = async () => {
        setIsSubmittingWorkflow(true);
        try {
            const teacherCount = distinctTeachersInAllocations.length;
            await updateTimetableApproval({
                status: 'approved_dispersed',
                approvedBy: currentUser?.name || 'Headteacher / Principal',
                approvedById: currentUser?.id || '',
                approvedAt: new Date().toISOString(),
                approvalNotes: workflowNotes.trim(),
                dispersedAt: new Date().toISOString(),
                dispersedBy: currentUser?.name || 'Headteacher',
                notificationSentCount: teacherCount
            });

            // Disperse individual notifications to allocated teachers
            for (const t of distinctTeachersInAllocations) {
                try {
                    await apiService.saveModuleRecord('school_communications', {
                        id: `comm_remedial_dispersed_${t.teacherId}_${Date.now()}`,
                        institutionId,
                        type: 'notification',
                        title: 'Official Remedial Timetable Dispersed',
                        content: `Dear ${t.teacherName}, your remedial timetable has been approved by the Headteacher (${currentUser?.name || 'Headteacher'}). You are allocated ${t.slotsCount} remedial sessions for ${t.subjects.join(', ')} across ${t.classes.join(', ')}.`,
                        senderId: currentUser?.id,
                        senderName: currentUser?.name || 'Headteacher',
                        recipientId: t.teacherId,
                        recipientName: t.teacherName,
                        status: 'sent',
                        createdAt: new Date().toISOString()
                    });
                } catch (commErr) {
                    // Best-effort notification
                }
            }

            onLogAction?.(`Headteacher approved and dispersed remedial timetable to ${teacherCount} teachers.`);
            setIsApproveModalOpen(false);
            alert(`Remedial Timetable Approved & Dispersed!\n\nThe master timetable has been officially signed off by the Headteacher and dispersed to ${teacherCount} subject teachers.`);
        } catch (err: any) {
            alert(err.message || 'Failed to approve and disperse timetable.');
        } finally {
            setIsSubmittingWorkflow(false);
        }
    };

    // Handler to open revision modal
    const handleOpenRevisionModal = () => {
        setWorkflowNotes('');
        setIsRevisionModalOpen(true);
    };

    // Handler to confirm return for revision
    const handleConfirmRequestRevision = async () => {
        if (!workflowNotes.trim()) {
            alert('Please specify the revision notes or changes requested for the DOS.');
            return;
        }
        setIsSubmittingWorkflow(true);
        try {
            await updateTimetableApproval({
                status: 'revision_requested',
                revisionNotes: workflowNotes.trim(),
                revisionRequestedAt: new Date().toISOString()
            });

            onLogAction?.(`Headteacher requested revisions on remedial timetable: "${workflowNotes.trim().slice(0, 60)}..."`);
            setIsRevisionModalOpen(false);
            alert('Timetable returned to the Director of Studies (DOS) for revision with your feedback remarks.');
        } catch (err: any) {
            alert(err.message || 'Failed to return timetable for revision.');
        } finally {
            setIsSubmittingWorkflow(false);
        }
    };

    // Handler to reopen draft
    const handleResetToDraft = async () => {
        if (!window.confirm('Reopen timetable as Draft? This allows editing slots before re-forwarding to the Headteacher.')) return;
        try {
            await updateTimetableApproval({
                status: 'draft',
                revisionNotes: ''
            });
            alert('Timetable status reset to Draft for revisions.');
        } catch (err: any) {
            alert(err.message || 'Failed to reset status.');
        }
    };

    // Handler to view / disperse notice memo to teachers
    const handleDisperseNoticeToTeachers = () => {
        setIsDisperseModalOpen(true);
    };

    // Auto-select matching prefect when class or stream changes in manual logging
    useEffect(() => {
        if (!manualCourseId) return;
        const selectedCourse = courses.find(c => c.id === manualCourseId);
        const courseName = selectedCourse?.name?.toLowerCase().trim() || '';

        // Find best matching enrolled leader for this class & stream
        const matchingPrefect = prefectsList.find(p => {
            const classMatch = p.courseId === manualCourseId || 
                (p.className && courseName && p.className.toLowerCase().trim() === courseName);
            if (!classMatch) return false;
            if (manualStream && manualStream !== 'All Streams' && p.stream) {
                return p.stream.toLowerCase().trim() === manualStream.toLowerCase().trim();
            }
            return true;
        });

        if (matchingPrefect) {
            setManualPrefectId(matchingPrefect.id);
        }
    }, [manualCourseId, manualStream, courses, prefectsList]);

    // Active Remedial Subjects for dropdowns
    const activeRemedialSubjectsList = useMemo(() => {
        if (remedialSubjects.length > 0) {
            const active = remedialSubjects.filter(rs => rs.isActive !== false);
            if (active.length > 0) return active.map(rs => ({ id: rs.subjectId, name: rs.subjectName }));
        }
        return effectiveSchoolSubjects.map(s => ({ id: s.id, name: s.name }));
    }, [remedialSubjects, effectiveSchoolSubjects]);

    // Filtered Sessions for Sessions Tab
    const filteredSessions = useMemo(() => {
        return (sessions || []).filter(session => {
            const matchesSearch = !searchQuery || 
                (session.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (session.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (session.className || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (session.stream || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (session.prefectName || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [sessions, searchQuery, statusFilter]);

    // Helper to calculate end time by adding minutes safely
    const addMinutesToTime = (timeStr: string, minutes: number = 60): string => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        if (isNaN(h)) return '';
        const totalMin = h * 60 + m + minutes;
        const newH = Math.floor((totalMin / 60) % 24);
        const newM = totalMin % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    };

    // Available streams for manual allocation modal
    const availableStreamsForAlloc = useMemo(() => {
        if (!allocCourseId) return [];
        const selectedCourse = courses.find(c => c.id === allocCourseId);
        const streamSet = new Set<string>();

        // 1. From course.levels
        if (selectedCourse?.levels && Array.isArray(selectedCourse.levels)) {
            selectedCourse.levels.forEach(lvl => {
                const name = String(lvl.name || '').trim();
                if (name) streamSet.add(name);
            });
        }

        // 2. From students enrolled in this course
        users.forEach(u => {
            if (u.role === 'student' && u.courseId === allocCourseId) {
                const sName = (u as any).stream || (u as any).streamName || (u as any).metadata?.stream || '';
                if (sName && typeof sName === 'string' && sName.trim()) {
                    streamSet.add(sName.trim());
                }
            }
        });

        // 3. From institution streams / streamDefinitions
        const instStreams = (currentInstitution?.streamDefinitions || currentInstitution?.streams || []) as any[];
        if (Array.isArray(instStreams)) {
            instStreams.forEach(s => {
                const sName = typeof s === 'string' ? s.trim() : (s?.name ? String(s.name).trim() : '');
                if (sName) streamSet.add(sName);
            });
        }

        return Array.from(streamSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [allocCourseId, courses, users, currentInstitution]);

    // Selected course name for allocation conflict detection
    const selectedAllocCourseName = useMemo(() => {
        return courses.find(c => c.id === allocCourseId)?.name || allocCourseId;
    }, [courses, allocCourseId]);

    // Effective stream for allocation modal
    const effectiveModalAllocStream = useMemo(() => {
        if (isJointAlloc) {
            return jointStreamsSelected.length > 0 ? jointStreamsSelected[0] : 'All Streams';
        }
        return allocStream === '__custom__' ? customAllocStream.trim() : allocStream;
    }, [isJointAlloc, jointStreamsSelected, allocStream, customAllocStream]);

    // Candidate timetable slots for the selected day in manual allocation modal
    const modalCandidateSlots = useMemo(() => {
        if (!allocDay) return [];
        const isSat = allocDay === 'Saturday';
        const isSun = allocDay === 'Sunday';

        if (isSat) {
            const slots: { periodNum: number; startTime: string; endTime: string; label: string; isBreak?: boolean }[] = [
                { periodNum: 1, startTime: saturdayStartTime || '08:00', endTime: '09:00', label: `Period 1 (${saturdayStartTime || '08:00'} - 09:00)` },
                { periodNum: 2, startTime: '09:00', endTime: saturdayBreakStartTime || '10:00', label: `Period 2 (09:00 - ${saturdayBreakStartTime || '10:00'})` },
            ];
            if (includeSaturdayBreak) {
                slots.push({
                    periodNum: 0,
                    startTime: saturdayBreakStartTime || '10:00',
                    endTime: saturdayBreakEndTime || '10:30',
                    label: `Recess (${saturdayBreakStartTime || '10:00'} - ${saturdayBreakEndTime || '10:30'})`,
                    isBreak: true
                });
            }
            slots.push(
                { periodNum: 3, startTime: saturdayBreakEndTime || '10:30', endTime: '11:30', label: `Period 3 (${saturdayBreakEndTime || '10:30'} - 11:30)` },
                { periodNum: 4, startTime: '11:30', endTime: saturdayEndTime || '12:30', label: `Period 4 (11:30 - ${saturdayEndTime || '12:30'})` }
            );
            return slots;
        }

        if (isSun) {
            const slots: { periodNum: number; startTime: string; endTime: string; label: string; isBreak?: boolean }[] = [
                { periodNum: 1, startTime: sundayStartTime || '09:00', endTime: '10:00', label: `Period 1 (${sundayStartTime || '09:00'} - 10:00)` },
                { periodNum: 2, startTime: '10:00', endTime: sundayBreakStartTime || '11:00', label: `Period 2 (10:00 - ${sundayBreakStartTime || '11:00'})` },
            ];
            if (includeSundayBreak) {
                slots.push({
                    periodNum: 0,
                    startTime: sundayBreakStartTime || '11:00',
                    endTime: sundayBreakEndTime || '11:30',
                    label: `Recess (${sundayBreakStartTime || '11:00'} - ${sundayBreakEndTime || '11:30'})`,
                    isBreak: true
                });
            }
            slots.push(
                { periodNum: 3, startTime: sundayBreakEndTime || '11:30', endTime: '12:30', label: `Period 3 (${sundayBreakEndTime || '11:30'} - 12:30)` },
                { periodNum: 4, startTime: '12:30', endTime: sundayEndTime || '13:30', label: `Period 4 (12:30 - ${sundayEndTime || '13:30'})` }
            );
            return slots;
        }

        // Weekday standard remedial slots:
        // Period 1: Morning 07:00 - 08:10 (Early Bird remedial period)
        // Period 2: Evening Early (e.g. 16:00 - 17:00)
        // Period 3: Evening Late (e.g. 17:00 - 18:00)
        const wStart = weekdayStartTime || '16:00';
        const wEnd = weekdayEndTime || '18:00';
        const wMid = addMinutesToTime(wStart, 60);

        const slots: { periodNum: number; startTime: string; endTime: string; label: string; isBreak?: boolean }[] = [
            { periodNum: 1, startTime: '07:00', endTime: '08:10', label: 'Period 1 • Early Bird (07:00 - 08:10)' },
            { periodNum: 2, startTime: wStart, endTime: wMid, label: `Period 2 • Evening A (${wStart} - ${wMid})` },
            { periodNum: 3, startTime: wMid, endTime: wEnd, label: `Period 3 • Evening B (${wMid} - ${wEnd})` }
        ];

        // Also add any other active start times on that day
        const existingTimes = Array.from(new Set(
            allocations.filter(a => a.dayOfWeek === allocDay && a.startTime).map(a => a.startTime as string)
        )).sort();

        existingTimes.forEach(t => {
            if (!slots.some(s => s.startTime === t)) {
                const matchA = allocations.find(a => a.dayOfWeek === allocDay && a.startTime === t);
                const endT = matchA?.endTime || addMinutesToTime(t, 60);
                slots.push({
                    periodNum: slots.length + 1,
                    startTime: t,
                    endTime: endT,
                    label: `Slot (${t} - ${endT})`
                });
            }
        });

        return slots;
    }, [allocDay, saturdayStartTime, saturdayEndTime, saturdayBreakStartTime, saturdayBreakEndTime, includeSaturdayBreak, sundayStartTime, sundayEndTime, sundayBreakStartTime, sundayBreakEndTime, includeSundayBreak, weekdayStartTime, weekdayEndTime, allocations]);

    // Active slot conflict detection for currently selected start and end time
    const activeModalSlotConflicts = useMemo(() => {
        if (!allocDay || !allocStartTime || !allocEndTime) {
            return { classConflicts: [] as RemedialAllocation[], teacherConflicts: [] as RemedialAllocation[] };
        }

        const classConflicts = allocations.filter(a => {
            if (a.dayOfWeek !== allocDay) return false;
            if (editingAlloc && a.id === editingAlloc.id) return false;
            
            // Course match
            const isSameCourse = allocCourseId && (a.courseId === allocCourseId || a.className === selectedAllocCourseName);
            if (!isSameCourse) return false;

            // Stream match
            let streamOverlaps = false;
            if (isJointAlloc) {
                streamOverlaps = jointStreamsSelected.some(js => matchAllocationStream(a, js) || matchAllocationStream({ stream: js }, a.stream));
            } else {
                streamOverlaps = matchAllocationStream(a, effectiveModalAllocStream) || matchAllocationStream({ stream: effectiveModalAllocStream }, a.stream);
            }
            if (!streamOverlaps) return false;

            const aStart = a.startTime || '00:00';
            const aEnd = a.endTime || '23:59';
            return (allocStartTime === aStart) || (allocStartTime < aEnd && allocEndTime > aStart);
        });

        const teacherConflicts = allocTeacherId ? allocations.filter(a => {
            if (a.dayOfWeek !== allocDay) return false;
            if (editingAlloc && a.id === editingAlloc.id) return false;
            if (a.teacherId !== allocTeacherId) return false;

            // If it's a joint lesson under same course, don't flag as clash
            if (isJointAlloc && (a.courseId === allocCourseId || a.className === selectedAllocCourseName)) return false;

            const aStart = a.startTime || '00:00';
            const aEnd = a.endTime || '23:59';
            return (allocStartTime === aStart) || (allocStartTime < aEnd && allocEndTime > aStart);
        }) : [];

        return { classConflicts, teacherConflicts };
    }, [allocDay, allocStartTime, allocEndTime, allocCourseId, selectedAllocCourseName, isJointAlloc, jointStreamsSelected, effectiveModalAllocStream, allocTeacherId, editingAlloc, allocations]);

    // Helper to evaluate slot status for the visual picker
    const getModalSlotAvailability = (slot: { startTime: string; endTime: string; isBreak?: boolean }) => {
        if (slot.isBreak) {
            return { isAvailable: false, isBreak: true, reason: 'Break / Recess', badgeColor: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' };
        }

        const classConflicts = allocations.filter(a => {
            if (a.dayOfWeek !== allocDay) return false;
            if (editingAlloc && a.id === editingAlloc.id) return false;

            const isSameCourse = allocCourseId && (a.courseId === allocCourseId || a.className === selectedAllocCourseName);
            if (!isSameCourse) return false;

            let streamOverlaps = false;
            if (isJointAlloc) {
                streamOverlaps = jointStreamsSelected.some(js => matchAllocationStream(a, js) || matchAllocationStream({ stream: js }, a.stream));
            } else {
                streamOverlaps = matchAllocationStream(a, effectiveModalAllocStream) || matchAllocationStream({ stream: effectiveModalAllocStream }, a.stream);
            }
            if (!streamOverlaps) return false;

            const aStart = a.startTime || '00:00';
            const aEnd = a.endTime || '23:59';
            return (slot.startTime === aStart) || (slot.startTime < aEnd && slot.endTime > aStart);
        });

        if (classConflicts.length > 0) {
            const first = classConflicts[0];
            return {
                isAvailable: false,
                isClassOccupied: true,
                count: classConflicts.length,
                reason: `${first.subjectName || 'Subject'} (${first.teacherName || 'Teacher'})`,
                conflicts: classConflicts,
                badgeColor: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            };
        }

        const teacherConflicts = allocTeacherId ? allocations.filter(a => {
            if (a.dayOfWeek !== allocDay) return false;
            if (editingAlloc && a.id === editingAlloc.id) return false;
            if (a.teacherId !== allocTeacherId) return false;

            if (isJointAlloc && (a.courseId === allocCourseId || a.className === selectedAllocCourseName)) return false;

            const aStart = a.startTime || '00:00';
            const aEnd = a.endTime || '23:59';
            return (slot.startTime === aStart) || (slot.startTime < aEnd && slot.endTime > aStart);
        }) : [];

        if (teacherConflicts.length > 0) {
            const first = teacherConflicts[0];
            return {
                isAvailable: false,
                isTeacherBusy: true,
                count: teacherConflicts.length,
                reason: `${first.teacherName || 'Teacher'} in ${first.className || 'Class'}`,
                conflicts: teacherConflicts,
                badgeColor: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            };
        }

        return {
            isAvailable: true,
            reason: 'Available (No Conflict)',
            badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        };
    };

    // Available streams for manual session log modal
    const availableStreamsForManualLog = useMemo(() => {
        if (!manualCourseId) return [];
        const selectedCourse = courses.find(c => c.id === manualCourseId);
        const streamSet = new Set<string>();

        if (selectedCourse?.levels && Array.isArray(selectedCourse.levels)) {
            selectedCourse.levels.forEach(lvl => {
                const name = String(lvl.name || '').trim();
                if (name) streamSet.add(name);
            });
        }

        users.forEach(u => {
            if (u.role === 'student' && u.courseId === manualCourseId) {
                const sName = (u as any).stream || (u as any).streamName || (u as any).metadata?.stream || '';
                if (sName && typeof sName === 'string' && sName.trim()) {
                    streamSet.add(sName.trim());
                }
            }
        });

        const instStreams = (currentInstitution?.streamDefinitions || currentInstitution?.streams || []) as any[];
        if (Array.isArray(instStreams)) {
            instStreams.forEach(s => {
                const sName = typeof s === 'string' ? s.trim() : (s?.name ? String(s.name).trim() : '');
                if (sName) streamSet.add(sName);
            });
        }

        return Array.from(streamSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [manualCourseId, courses, users, currentInstitution]);

    // Distinct streams for Timetable Filter Bar
    const distinctTimetableStreams = useMemo(() => {
        const streamSet = new Set<string>();
        allocations.forEach(a => {
            if (selectedTimetableClass === 'All' || a.courseId === selectedTimetableClass) {
                if (a.stream && a.stream !== 'All Streams') {
                    streamSet.add(a.stream);
                }
            }
        });

        if (selectedTimetableClass !== 'All') {
            const course = courses.find(c => c.id === selectedTimetableClass);
            if (course?.levels && Array.isArray(course.levels)) {
                course.levels.forEach(l => {
                    if (l.name) streamSet.add(l.name.trim());
                });
            }
        }

        return Array.from(streamSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [allocations, selectedTimetableClass, courses]);

    // Open Create Subject Modal
    const handleOpenCreateSubject = () => {
        setEditingSubject(null);
        setNewSubjectId('');
        setCustomSubjectName('');
        setNewSubjectPriority('Medium');
        setNewSubjectWeeklyOccurrences(1);
        setNewSubjectPreferredDayType('any');
        setShowSubjectModal(true);
    };

    // Open Edit Subject Modal
    const handleOpenEditSubject = (remSub: RemedialSubject) => {
        setEditingSubject(remSub);
        const matchSchool = effectiveSchoolSubjects.find(s => s.id === remSub.subjectId);
        if (matchSchool) {
            setNewSubjectId(remSub.subjectId);
            setCustomSubjectName('');
        } else {
            setNewSubjectId('custom');
            setCustomSubjectName(remSub.subjectName);
        }
        setNewSubjectPriority(remSub.priority || 'Medium');
        setNewSubjectWeeklyOccurrences(remSub.weeklyOccurrences || 1);
        setNewSubjectPreferredDayType(remSub.preferredDayType || 'any');
        setShowSubjectModal(true);
    };

    // Save Remedial Subject Handler (Create or Edit)
    const handleSaveRemedialSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        let subjectName = '';
        let subId = newSubjectId;

        if (newSubjectId === 'custom') {
            if (!customSubjectName.trim()) return alert('Please enter custom subject name');
            subjectName = customSubjectName.trim();
            subId = editingSubject ? editingSubject.subjectId : `custom_sub_${Date.now()}`;
        } else if (newSubjectId) {
            const found = effectiveSchoolSubjects.find(s => s.id === newSubjectId);
            subjectName = found ? found.name : newSubjectId;
        } else {
            return alert('Please select a subject or specify a custom name');
        }

        try {
            const subjectPayload: RemedialSubject = {
                ...(editingSubject || {}),
                id: editingSubject?.id || `rem_sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                institutionId,
                subjectId: subId,
                subjectName,
                isActive: editingSubject ? (editingSubject.isActive !== false) : true,
                priority: newSubjectPriority,
                weeklyOccurrences: newSubjectWeeklyOccurrences,
                preferredDayType: newSubjectPreferredDayType,
                createdAt: editingSubject?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (typeof (apiService as any).saveRemedialSubject === 'function') {
                await (apiService as any).saveRemedialSubject(subjectPayload);
            } else {
                await apiService.saveModuleRecord('school_remedial_subjects', subjectPayload);
            }

            onLogAction?.(`${editingSubject ? 'Updated' : 'Registered'} remedial subject "${subjectName}" (Priority: ${newSubjectPriority}, ${newSubjectWeeklyOccurrences}x/week)`);
            alert(`Remedial subject "${subjectName}" ${editingSubject ? 'updated' : 'added'} successfully!`);
            setShowSubjectModal(false);
            setEditingSubject(null);
            setNewSubjectId('');
            setCustomSubjectName('');
            setNewSubjectPriority('Medium');
            setNewSubjectWeeklyOccurrences(1);
            setNewSubjectPreferredDayType('any');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to save remedial subject');
        }
    };

    // Update specific subject rule (Priority, Weekly Occurrences, Preferred Day Placement)
    const handleUpdateSubjectRule = async (remSub: RemedialSubject, updates: Partial<RemedialSubject>) => {
        try {
            const updated: RemedialSubject = {
                ...remSub,
                ...updates
            };
            if (typeof (apiService as any).saveRemedialSubject === 'function') {
                await (apiService as any).saveRemedialSubject(updated);
            } else {
                await apiService.saveModuleRecord('school_remedial_subjects', updated);
            }
            setRemedialSubjects(prev => prev.map(s => s.id === remSub.id ? updated : s));
            onLogAction?.(`Updated remedial rules for ${remSub.subjectName}: Priority ${updated.priority || 'Medium'}, ${updated.weeklyOccurrences || 1}x/wk`);
        } catch (err: any) {
            alert('Failed to update subject rule: ' + err.message);
        }
    };

    // Apply Smart Core STEM & Priority Preset across all registered subjects
    const handleApplyCoreStemPreset = async () => {
        if (remedialSubjects.length === 0) return alert('No remedial subjects registered yet. Click "Register All School Subjects" first.');
        if (!window.confirm('Apply Smart STEM & Core Subject Priorities?\n\n• Mathematics, Sciences (Physics, Chemistry, Biology) and Core Languages set to High Priority (2x / week).\n• Humanities and Technicals set to Medium (1x / week).')) return;

        try {
            setLoading(true);
            const updatedList: RemedialSubject[] = [];
            for (const remSub of remedialSubjects) {
                const nameLower = remSub.subjectName.toLowerCase();
                const isCoreStem = nameLower.includes('math') || 
                                   nameLower.includes('calc') || 
                                   nameLower.includes('physic') || 
                                   nameLower.includes('chem') || 
                                   nameLower.includes('bio') || 
                                   nameLower.includes('eng') ||
                                   nameLower.includes('kisw');
                const isHumanity = nameLower.includes('hist') || 
                                   nameLower.includes('geo') || 
                                   nameLower.includes('cre') || 
                                   nameLower.includes('ire') || 
                                   nameLower.includes('agri') ||
                                   nameLower.includes('bus');

                const updated: RemedialSubject = {
                    ...remSub,
                    priority: isCoreStem ? 'High' : (isHumanity ? 'Medium' : 'Low'),
                    weeklyOccurrences: isCoreStem ? 2 : 1,
                    preferredDayType: isCoreStem ? 'any' : 'weekdays'
                };

                if (typeof (apiService as any).saveRemedialSubject === 'function') {
                    await (apiService as any).saveRemedialSubject(updated);
                } else {
                    await apiService.saveModuleRecord('school_remedial_subjects', updated);
                }
                updatedList.push(updated);
            }
            setRemedialSubjects(updatedList);
            onLogAction?.('Applied Smart Core STEM Priority & Occurrence Presets');
            alert('Smart Priorities Applied: Mathematics & Sciences set to High Priority (2x/week), humanities to Medium (1x/week).');
        } catch (err: any) {
            alert('Failed to apply presets: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Subject Active/Inactive Status
    const handleToggleSubjectStatus = async (remSub: RemedialSubject) => {
        try {
            const updated = { ...remSub, isActive: !remSub.isActive };
            if (typeof (apiService as any).saveRemedialSubject === 'function') {
                await (apiService as any).saveRemedialSubject(updated);
            } else {
                await apiService.saveModuleRecord('school_remedial_subjects', updated);
            }
            onLogAction?.(`Toggled remedial subject "${remSub.subjectName}" status to ${updated.isActive ? 'Active' : 'Inactive'}`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to update subject status');
        }
    };

    // Delete Remedial Subject
    const handleDeleteRemedialSubject = async (id: string, name: string) => {
        if (!window.confirm(`Delete remedial subject "${name}"?`)) return;
        try {
            if (typeof (apiService as any).deleteRemedialSubject === 'function') {
                await (apiService as any).deleteRemedialSubject(id);
            } else {
                await apiService.deleteModuleRecord('school_remedial_subjects', id);
            }
            onLogAction?.(`Deleted remedial subject "${name}"`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete remedial subject');
        }
    };

    // Auto-Register All School Subjects with Smart Defaults
    const handleRegisterAllSubjects = async () => {
        if (effectiveSchoolSubjects.length === 0) return alert('No general school subjects found in the institution.');
        if (!window.confirm(`Register all ${effectiveSchoolSubjects.length} school subjects as Active Remedial Subjects with priority defaults?`)) return;

        try {
            setLoading(true);
            const existingIds = new Set(remedialSubjects.map(rs => rs.subjectId));
            let count = 0;
            for (const sub of effectiveSchoolSubjects) {
                if (!existingIds.has(sub.id)) {
                    const nameLower = sub.name.toLowerCase();
                    const isCoreStem = nameLower.includes('math') || 
                                       nameLower.includes('physic') || 
                                       nameLower.includes('chem') || 
                                       nameLower.includes('bio') || 
                                       nameLower.includes('eng') ||
                                       nameLower.includes('kisw');
                    const newRemSub: RemedialSubject = {
                        id: `rem_sub_${Date.now()}_${(sub.id || '').slice(-4)}_${count}`,
                        institutionId,
                        subjectId: sub.id,
                        subjectName: sub.name,
                        isActive: true,
                        priority: isCoreStem ? 'High' : 'Medium',
                        weeklyOccurrences: isCoreStem ? 2 : 1,
                        preferredDayType: isCoreStem ? 'any' : 'weekdays',
                        createdAt: new Date().toISOString()
                    };
                    if (typeof (apiService as any).saveRemedialSubject === 'function') {
                        await (apiService as any).saveRemedialSubject(newRemSub);
                    } else {
                        await apiService.saveModuleRecord('school_remedial_subjects', newRemSub);
                    }
                    count++;
                }
            }
            onLogAction?.(`Registered ${count} new remedial subjects with priority rules.`);
            alert(`Successfully registered ${count} remedial subjects with priority rules!`);
            loadData();
        } catch (err: any) {
            alert('Failed to register subjects: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Teacher Day Preference Live-Saving Engine
    const saveTeacherPreferencesLive = async (nextPrefs: Record<string, { preferredDays: string[]; maxLessonsPerWeek?: number; notes?: string }>) => {
        setTeacherPreferences(nextPrefs);
        if (!institutionId) return;

        // Instant optimistic cache in safeLocalStorage
        safeLocalStorage.setItem(`remedial_teacher_prefs_${institutionId}`, JSON.stringify(nextPrefs));
        setIsSavingTeacherPrefs(true);

        try {
            const stableId = rateSetting?.id || `rate_setting_${institutionId}`;
            const existingMeta = (rateSetting?.metadata && typeof rateSetting.metadata === 'object') ? rateSetting.metadata : {};
            const payload: any = {
                ...(rateSetting || {}),
                id: stableId,
                institutionId,
                institution_id: institutionId,
                teacherPreferences: nextPrefs,
                teacher_preferences: nextPrefs,
                metadata: {
                    ...existingMeta,
                    teacherPreferences: nextPrefs,
                    teacher_preferences: nextPrefs
                }
            };

            setRateSetting(payload);

            // Sync cached rate settings so page reloads immediately have the latest preferences
            const cachedRates = safeLocalStorage.getItem(`remedial_rates_${institutionId}`);
            if (cachedRates) {
                try {
                    const parsed = JSON.parse(cachedRates);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed[0] = { ...parsed[0], ...payload };
                        safeLocalStorage.setItem(`remedial_rates_${institutionId}`, JSON.stringify(parsed));
                    }
                } catch (_) {}
            }

            await apiService.saveRemedialRateSetting(payload);
            setLastSavedPrefsTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch (err) {
            console.warn('[Remedials] Live save teacher preferences warning:', err);
        } finally {
            setIsSavingTeacherPrefs(false);
        }
    };

    // Teacher Day Preference Handlers (Auto-saves on every toggle or preset change)
    const handleToggleTeacherDay = (teacherId: string, day: string) => {
        const existing = teacherPreferences[teacherId] || { preferredDays: [] };
        const days = existing.preferredDays || [];
        const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
        const nextPrefs = {
            ...teacherPreferences,
            [teacherId]: {
                ...existing,
                preferredDays: newDays
            }
        };
        saveTeacherPreferencesLive(nextPrefs);
    };

    const handleSetTeacherDaysPreset = (teacherId: string, preset: 'weekdays' | 'weekends' | 'all' | 'clear') => {
        const dayMap = {
            weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            weekends: ['Saturday', 'Sunday'],
            all: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            clear: []
        };
        const nextPrefs = {
            ...teacherPreferences,
            [teacherId]: {
                ...(teacherPreferences[teacherId] || {}),
                preferredDays: dayMap[preset] as any
            }
        };
        saveTeacherPreferencesLive(nextPrefs);
    };

    // Save Rate Settings (including teacher preferences)
    const handleSaveRates = async () => {
        try {
            safeLocalStorage.setItem(`eduai_remedial_weekend_max_${institutionId}`, String(maxWeekendLessonsPerDay));
            safeLocalStorage.setItem(`remedial_teacher_prefs_${institutionId}`, JSON.stringify(teacherPreferences));
            const stableId = rateSetting?.id || `rate_setting_${institutionId}`;
            const existingMeta = (rateSetting?.metadata && typeof rateSetting.metadata === 'object') ? rateSetting.metadata : {};
            const data: any = {
                id: stableId,
                hourlyRate: weekdayHourlyRate,
                hourly_rate: weekdayHourlyRate,
                weekdayHourlyRate,
                weekday_hourly_rate: weekdayHourlyRate,
                weekendHourlyRate,
                weekend_hourly_rate: weekendHourlyRate,
                weekdayStartTime,
                weekday_start_time: weekdayStartTime,
                weekdayEndTime,
                weekday_end_time: weekdayEndTime,
                weekendStartTime: saturdayStartTime,
                weekend_start_time: saturdayStartTime,
                weekendEndTime: saturdayEndTime,
                weekend_end_time: saturdayEndTime,
                saturdayStartTime,
                saturday_start_time: saturdayStartTime,
                saturdayEndTime,
                saturday_end_time: saturdayEndTime,
                sundayStartTime,
                sunday_start_time: sundayStartTime,
                sundayEndTime,
                sunday_end_time: sundayEndTime,
                maxLessonsPerDay,
                max_lessons_per_day: maxLessonsPerDay,
                maxWeekendLessonsPerDay,
                max_weekend_lessons_per_day: maxWeekendLessonsPerDay,
                cancellationCutoffHours,
                cancellation_cutoff_hours: cancellationCutoffHours,
                confirmationTimeoutMinutes,
                confirmation_timeout_minutes: confirmationTimeoutMinutes,
                teacherPreferences,
                teacher_preferences: teacherPreferences,
                weekendBreakStartTime: saturdayBreakStartTime,
                weekend_break_start_time: saturdayBreakStartTime,
                weekendBreakEndTime: saturdayBreakEndTime,
                weekend_break_end_time: saturdayBreakEndTime,
                weekendBreakLabel: saturdayBreakLabel,
                weekend_break_label: saturdayBreakLabel,
                includeWeekendBreak: includeSaturdayBreak,
                include_weekend_break: includeSaturdayBreak,
                includeSaturdayBreak,
                include_saturday_break: includeSaturdayBreak,
                saturdayBreakStartTime,
                saturday_break_start_time: saturdayBreakStartTime,
                saturdayBreakEndTime,
                saturday_break_end_time: saturdayBreakEndTime,
                saturdayBreakLabel,
                saturday_break_label: saturdayBreakLabel,
                includeSundayBreak,
                include_sunday_break: includeSundayBreak,
                sundayBreakStartTime,
                sunday_break_start_time: sundayBreakStartTime,
                sundayBreakEndTime,
                sunday_break_end_time: sundayBreakEndTime,
                sundayBreakLabel,
                sunday_break_label: sundayBreakLabel,
                metadata: {
                    ...existingMeta,
                    saturdayStartTime,
                    saturday_start_time: saturdayStartTime,
                    saturdayEndTime,
                    saturday_end_time: saturdayEndTime,
                    sundayStartTime,
                    sunday_start_time: sundayStartTime,
                    sundayEndTime,
                    sunday_end_time: sundayEndTime,
                    maxWeekendLessonsPerDay,
                    max_weekend_lessons_per_day: maxWeekendLessonsPerDay,
                    cancellationCutoffHours,
                    cancellation_cutoff_hours: cancellationCutoffHours,
                    confirmationTimeoutMinutes,
                    confirmation_timeout_minutes: confirmationTimeoutMinutes,
                    weekendBreakStartTime: saturdayBreakStartTime,
                    weekend_break_start_time: saturdayBreakStartTime,
                    weekendBreakEndTime: saturdayBreakEndTime,
                    weekend_break_end_time: saturdayBreakEndTime,
                    weekendBreakLabel: saturdayBreakLabel,
                    weekend_break_label: saturdayBreakLabel,
                    includeWeekendBreak: includeSaturdayBreak,
                    include_weekend_break: includeSaturdayBreak,
                    includeSaturdayBreak,
                    include_saturday_break: includeSaturdayBreak,
                    saturdayBreakStartTime,
                    saturday_break_start_time: saturdayBreakStartTime,
                    saturdayBreakEndTime,
                    saturday_break_end_time: saturdayBreakEndTime,
                    saturdayBreakLabel,
                    saturday_break_label: saturdayBreakLabel,
                    includeSundayBreak,
                    include_sunday_break: includeSundayBreak,
                    sundayBreakStartTime,
                    sunday_break_start_time: sundayBreakStartTime,
                    sundayBreakEndTime,
                    sunday_break_end_time: sundayBreakEndTime,
                    sundayBreakLabel,
                    sunday_break_label: sundayBreakLabel,
                    teacherPreferences,
                    teacher_preferences: teacherPreferences
                },
                feePerStudent,
                fee_per_student: feePerStudent,
                termFee,
                term_fee: termFee,
                institutionId,
                institution_id: institutionId
            };
            setRateSetting(data);
            await apiService.saveRemedialRateSetting(data);
            setLastSavedPrefsTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            onLogAction?.(`Updated Remedial Rates & Rules: Weekday Rate KES ${weekdayHourlyRate}, Weekend Rate KES ${weekendHourlyRate}, Cutoff ${cancellationCutoffHours}h, Timeout ${confirmationTimeoutMinutes}m, Teacher Preferred Days configured`);
            alert('Remedial rates, rules, substitution window, and teacher preferred days updated successfully!');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to update rates');
        }
    };

    // DOS Administrative Actions for Substitution
    const handleDosAutoSubstitute = async (alloc: RemedialAllocation) => {
        try {
            setLoading(true);
            const { bestCandidate, rankedCandidates } = rankSubstituteCandidates({
                allocation: alloc,
                candidates: teachersList,
                allAllocations: allocations,
                declinedTeacherIds: alloc.declinedTeacherIds || [],
                teacherPreferences,
                classSubjectAllocations: (currentInstitution as any)?.classSubjectAllocations || {},
                maxLessonsPerDay,
                maxWeekendLessonsPerDay
            });

            if (!bestCandidate) {
                alert('No qualified substitute teacher is currently available without timetable collisions or exceeding daily lesson limits.');
                return;
            }

            const confirmMsg = `Auto-Assign Substitute:\n\nTop Candidate: ${bestCandidate.name}\nSubject Match: ${rankedCandidates[0]?.isSubjectMatch ? 'Yes' : 'No'}\nPriority Score: ${rankedCandidates[0]?.score}\nReasons: ${rankedCandidates[0]?.reasons.join(', ')}\n\nAssign ${bestCandidate.name} as pending substitute with a ${confirmationTimeoutMinutes}-minute confirmation deadline?`;
            if (!window.confirm(confirmMsg)) return;

            const updated: RemedialAllocation = {
                ...alloc,
                status: 'Substitute Pending',
                originalTeacherId: alloc.originalTeacherId || alloc.teacherId,
                originalTeacherName: alloc.originalTeacherName || alloc.teacherName,
                substituteTeacherId: bestCandidate.id,
                substituteTeacherName: bestCandidate.name,
                confirmationDeadline: new Date(Date.now() + confirmationTimeoutMinutes * 60000).toISOString(),
                cancelledAt: alloc.cancelledAt || new Date().toISOString()
            };

            await apiService.saveRemedialAllocation(updated);
            onLogAction?.(`DOS auto-assigned substitute ${bestCandidate.name} for ${alloc.subjectName} (${alloc.className} ${alloc.stream || ''}) on ${alloc.dayOfWeek}`);
            alert(`Substitute teacher ${bestCandidate.name} has been assigned and given ${confirmationTimeoutMinutes} minutes to confirm availability.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to auto-assign substitute');
        } finally {
            setLoading(false);
        }
    };

    const handleDosManualReassign = async (alloc: RemedialAllocation, targetTeacherId: string) => {
        if (!targetTeacherId) return;
        const targetTeacher = teachersList.find(t => t.id === targetTeacherId);
        if (!targetTeacher) return;

        if (!window.confirm(`Directly assign ${targetTeacher.name} as the confirmed teacher for ${alloc.subjectName} on ${alloc.dayOfWeek} at ${alloc.startTime}?`)) return;

        try {
            setLoading(true);
            const updated: RemedialAllocation = {
                ...alloc,
                status: 'Confirmed',
                teacherId: targetTeacher.id,
                teacherName: targetTeacher.name,
                substituteTeacherId: undefined,
                substituteTeacherName: undefined,
                confirmationDeadline: undefined
            };

            await apiService.saveRemedialAllocation(updated);
            onLogAction?.(`DOS directly assigned ${targetTeacher.name} to ${alloc.subjectName} (${alloc.className} ${alloc.stream || ''}) on ${alloc.dayOfWeek}`);
            alert(`Allocation updated! ${targetTeacher.name} is now the confirmed teacher for this lesson.`);
            setReassigningAlloc(null);
            setReassignTeacherId('');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to reassign teacher');
        } finally {
            setLoading(false);
        }
    };

    const handleDosApprovePendingSub = async (alloc: RemedialAllocation) => {
        if (!alloc.substituteTeacherId || !alloc.substituteTeacherName) return;
        if (!window.confirm(`Confirm and permanently transfer this lesson to substitute ${alloc.substituteTeacherName}?`)) return;

        try {
            setLoading(true);
            const updated: RemedialAllocation = {
                ...alloc,
                status: 'Confirmed',
                teacherId: alloc.substituteTeacherId,
                teacherName: alloc.substituteTeacherName,
                substituteTeacherId: undefined,
                substituteTeacherName: undefined,
                confirmationDeadline: undefined
            };

            await apiService.saveRemedialAllocation(updated);
            onLogAction?.(`DOS approved substitute ${alloc.substituteTeacherName} for ${alloc.subjectName} on ${alloc.dayOfWeek}`);
            alert(`Substitute ${alloc.substituteTeacherName} is now confirmed for this lesson!`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve substitute');
        } finally {
            setLoading(false);
        }
    };

    const handleDosRevertToOriginal = async (alloc: RemedialAllocation) => {
        const origId = alloc.originalTeacherId || alloc.teacherId;
        const origName = alloc.originalTeacherName || alloc.teacherName;
        if (!window.confirm(`Revert this allocation back to original teacher ${origName}? Any pending substitute requests will be cancelled.`)) return;

        try {
            setLoading(true);
            const updated: RemedialAllocation = {
                ...alloc,
                status: 'Confirmed',
                teacherId: origId,
                teacherName: origName,
                substituteTeacherId: undefined,
                substituteTeacherName: undefined,
                confirmationDeadline: undefined,
                cancellationReason: undefined,
                cancelledAt: undefined,
                declinedTeacherIds: []
            };

            await apiService.saveRemedialAllocation(updated);
            onLogAction?.(`DOS reverted ${alloc.subjectName} on ${alloc.dayOfWeek} back to original teacher ${origName}`);
            alert(`Allocation reverted back to ${origName}.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to revert allocation');
        } finally {
            setLoading(false);
        }
    };

    // Manual Log Submit
    const handleManualLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTeacherId || !manualSubjectId || !manualCourseId || !manualPrefectId) {
            return alert('Please fill in all fields');
        }

        // Daily Lesson Limit Check (weekday vs weekend)
        const manualDateObj = new Date(manualDate);
        const dayStr = manualDateObj.toDateString();
        const existingTeacherSessionsOnDate = sessions.filter(s => {
            return s.teacherId === manualTeacherId && new Date(s.startTime).toDateString() === dayStr;
        });
        const isWeekendDate = [0, 6].includes(manualDateObj.getDay());
        const effectiveDailyLimit = isWeekendDate ? maxWeekendLessonsPerDay : maxLessonsPerDay;
        const limitLabel = isWeekendDate ? 'weekend' : 'weekday';

        if (existingTeacherSessionsOnDate.length >= effectiveDailyLimit) {
            return alert(`Daily Quota Exceeded: Teacher has already reached the maximum ${limitLabel} limit of ${effectiveDailyLimit} remedial lesson(s) allowed per day on ${manualDate}.`);
        }

        try {
            const teacher = users.find(u => u.id === manualTeacherId);
            const remSubMatch = remedialSubjects.find(r => r.subjectId === manualSubjectId || r.id === manualSubjectId);
            const schoolSubMatch = effectiveSchoolSubjects.find(s => s.id === manualSubjectId);
            const resolvedSubjectName = schoolSubMatch?.name || remSubMatch?.subjectName || manualSubjectId || 'Unknown';
            const course = courses.find(c => c.id === manualCourseId);
            const prefect = users.find(u => u.id === manualPrefectId);

            const isSunday = manualDateObj.getDay() === 0;
            const isSaturday = manualDateObj.getDay() === 6;
            const defaultStart = isSunday ? (sundayStartTime || '09:00') : isSaturday ? (saturdayStartTime || '08:00') : (weekdayStartTime || '16:00');
            const startTime = new Date(`${manualDate}T${defaultStart}:00`).toISOString();
            const endTime = new Date(new Date(startTime).getTime() + manualHours * 60 * 60 * 1000).toISOString();

            const newSession: RemedialSession = {
                id: `rem_${Date.now()}`,
                teacherId: manualTeacherId,
                teacherName: teacher?.name || 'Unknown',
                subjectId: manualSubjectId,
                subjectName: resolvedSubjectName,
                courseId: manualCourseId,
                className: course?.name || 'Unknown',
                stream: manualStream || 'All Streams',
                prefectId: manualPrefectId,
                prefectName: prefect?.name || 'Unknown',
                prefectToken: `prefect_remedial_token_class_${manualCourseId}`,
                startTime,
                endTime,
                hours: manualHours,
                status: 'Approved', // Manually logged by Admin defaults to Approved
                createdAt: new Date().toISOString(),
                institutionId
            };

            await apiService.saveRemedialSession(newSession);
            onLogAction?.(`Manually logged approved remedial session for ${teacher?.name} in ${course?.name} (${manualStream || 'All Streams'}) (${manualHours} hrs)`);
            alert('Remedial session logged and approved successfully!');
            setShowLogModal(false);
            setManualStream('All Streams');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to log session');
        }
    };

    // Approve Prefect Confirmed Session
    const handleApproveSession = async (session: RemedialSession) => {
        try {
            const updated = {
                ...session,
                status: 'Approved' as const
            };
            await apiService.saveRemedialSession(updated);
            onLogAction?.(`Approved remedial session for ${session.teacherName} (${session.hours} hrs)`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve session');
        }
    };

    // Stage 2: Teacher on Duty (TOD) Review & Approval
    const handleApproveDutySession = async (session: RemedialSession) => {
        try {
            const updated: RemedialSession = {
                ...session,
                status: 'Pending Headteacher Approval',
                dutyApproved: true,
                dutyApprovedAt: new Date().toISOString(),
                dutyApprovedBy: currentUser?.name || 'Teacher on Duty'
            };
            await apiService.saveRemedialSession(updated);
            onLogAction?.(`[Stage 2] Teacher on Duty approved session for ${session.teacherName} (${session.hours} hrs)`);
            alert(`Remedial session verified by Teacher on Duty! It is now Pending Headteacher Approval.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve session as Teacher on Duty');
        }
    };

    // Stage 3: Headteacher / Principal Authorization
    const handleHeadteacherAuthorizeSession = async (session: RemedialSession) => {
        try {
            const updated: RemedialSession = {
                ...session,
                status: 'Pending Operations Payout',
                headteacherApproved: true,
                headteacherApprovedAt: new Date().toISOString(),
                headteacherApprovedBy: currentUser?.name || 'Headteacher / Principal'
            };
            await apiService.saveRemedialSession(updated);
            onLogAction?.(`[Stage 3] Headteacher authorized session for ${session.teacherName} (${session.hours} hrs)`);
            alert(`Session authorized by Headteacher! Forwarded to Operations Manager for cash payout.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to authorize session as Headteacher');
        }
    };

    // Stage 4: Operations Manager Cash Handover to DOS
    const handleConfirmOperationsCashHandover = async () => {
        if (!opsDisburseBatch) return;
        if (!opsCashVoucherRef.trim()) {
            alert('Please enter an Official Cash Voucher / Folio Reference Number for the physical cash handed to DOS.');
            return;
        }

        try {
            setIsDisbursingOpsCash(true);
            const now = new Date().toISOString();
            const opsManagerName = currentUser?.name || 'Operations Manager';
            const voucherRef = opsCashVoucherRef.trim();

            for (const sessId of opsDisburseBatch.sessionIds) {
                const sess = sessions.find(s => s.id === sessId);
                if (sess) {
                    const updated: RemedialSession = {
                        ...sess,
                        status: 'Cash Issued to DOS',
                        operationsDisbursed: true,
                        operationsDisbursedAt: now,
                        operationsDisbursedBy: opsManagerName,
                        cashVoucherRef: voucherRef
                    };
                    await apiService.saveRemedialSession(updated);
                }
            }

            onLogAction?.(`[Stage 4] Operations Manager released cash KES ${opsDisburseBatch.totalAmount.toLocaleString()} to DOS (Voucher #${voucherRef}) for ${opsDisburseBatch.teacherName}`);
            alert(`Cash successfully recorded as issued to DOS! Voucher Ref: #${voucherRef}. The DOS can now distribute cash to ${opsDisburseBatch.teacherName} and collect on-screen signature.`);
            setIsOpsCashModalOpen(false);
            setOpsDisburseBatch(null);
            setOpsCashVoucherRef('');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to record cash disbursement to DOS');
        } finally {
            setIsDisbursingOpsCash(false);
        }
    };

    // HTML5 Canvas On-Screen Signature Handlers for DOS Payment
    const handleCanvasStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsCanvasDrawing(true);
    };

    const handleCanvasDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isCanvasDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        setHasTeacherSigned(true);
    };

    const handleCanvasStop = () => {
        setIsCanvasDrawing(false);
    };

    const handleClearCanvasSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasTeacherSigned(false);
    };

    // Stage 5: Director of Studies (DOS) Cash Handover to Teacher with On-Screen Signature
    const handleConfirmDosPaymentWithSignature = async () => {
        if (!dosPayTeacherData) return;
        if (!hasTeacherSigned || !canvasRef.current) {
            alert('The teacher must sign on the signature pad before cash payment can be confirmed.');
            return;
        }

        try {
            setIsSubmittingDosPayment(true);
            const signatureDataUrl = canvasRef.current.toDataURL('image/png');
            const payoutId = `pay_${Date.now()}`;
            const dosName = currentUser?.name || 'Director of Studies';
            const now = new Date().toISOString();

            const newPayout: RemedialPayout = {
                id: payoutId,
                teacherId: dosPayTeacherData.teacherId,
                teacherName: dosPayTeacherData.teacherName,
                totalHours: dosPayTeacherData.totalHours,
                hourlyRate: dosPayTeacherData.rate,
                totalAmount: dosPayTeacherData.totalAmount,
                payoutDate: now.split('T')[0],
                status: 'Paid',
                institutionId,
                cashVoucherRef: dosPayTeacherData.cashVoucherRef,
                operationsManagerName: dosPayTeacherData.operationsManagerName,
                paidByDosName: dosName,
                paidAt: now,
                teacherSignatureDataUrl: signatureDataUrl,
                notes: `Paid in physical cash by DOS (${dosName}). Cash Voucher: #${dosPayTeacherData.cashVoucherRef || 'N/A'}`
            };

            await apiService.saveRemedialPayout(newPayout);

            // Update all related sessions to Paid with signature & DOS stamp
            for (const sessId of dosPayTeacherData.sessionIds) {
                const sess = sessions.find(s => s.id === sessId);
                if (sess) {
                    const updated: RemedialSession = {
                        ...sess,
                        status: 'Paid',
                        payoutId: payoutId,
                        paidByDosName: dosName,
                        paidAt: now,
                        teacherSignatureDataUrl: signatureDataUrl
                    };
                    await apiService.saveRemedialSession(updated);
                }
            }

            onLogAction?.(`[Stage 5] DOS ${dosName} disbursed cash KES ${dosPayTeacherData.totalAmount.toLocaleString()} to ${dosPayTeacherData.teacherName} with on-screen signature`);
            alert(`Payment completed and signed! Physical cash of KES ${dosPayTeacherData.totalAmount.toLocaleString()} officially receipted.`);
            setIsDosPayModalOpen(false);
            setDosPayTeacherData(null);
            setHasTeacherSigned(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to finalize DOS payment with signature');
        } finally {
            setIsSubmittingDosPayment(false);
        }
    };

    // Weekend Duty Roster: Appoint Duty Teacher & Auto-allocate Sat & Sun Lessons
    const handleSaveWeekendDuty = async () => {
        if (!dutyModalTeacherId) {
            alert('Please select a teacher on duty for the weekend.');
            return;
        }

        try {
            setIsSavingDuty(true);
            const teacher = users.find(u => u.id === dutyModalTeacherId);
            const teacherCode = teacher?.name 
                ? teacher.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 3) 
                : 'DUT';

            const dutyRecord: RemedialWeekendDuty = {
                id: `duty_${Date.now()}`,
                institutionId,
                weekLabel: dutyModalWeek,
                teacherId: dutyModalTeacherId,
                teacherName: teacher?.name || 'Duty Teacher',
                teacherCode,
                autoAllocatedSaturday: dutyModalAutoAllocate,
                autoAllocatedSunday: dutyModalAutoAllocate,
                saturdaySessionId: '',
                sundaySessionId: '',
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('school_remedial_duty_roster', dutyRecord);

            // Auto-allocate 1 Saturday lesson and 1 Sunday lesson
            if (dutyModalAutoAllocate) {
                const targetCourse = courses.find(c => c.id === dutyModalCourseId) || courses[0];
                const targetSubject = remedialSubjects.find(s => s.subjectId === dutyModalSubjectId) || remedialSubjects[0];

                const satAlloc: RemedialAllocation = {
                    id: `alloc_duty_sat_${Date.now()}`,
                    institutionId,
                    courseId: targetCourse?.id || 'GENERAL',
                    className: targetCourse?.name || 'Weekend Remedials',
                    stream: 'All Streams',
                    subjectId: targetSubject?.subjectId || 'GENERAL',
                    subjectName: targetSubject?.subjectName || 'Remedial General Duty',
                    teacherId: dutyModalTeacherId,
                    teacherName: teacher?.name || 'Teacher on Duty',
                    dayOfWeek: 'Saturday',
                    startTime: saturdayStartTime || '08:00',
                    endTime: '10:00',
                    isWeekend: true,
                    isDutyLesson: true,
                    priority: 'High',
                    isManual: true,
                    is_manual: true,
                    isAutoGenerated: false,
                    is_auto_generated: false,
                    createdAt: new Date().toISOString()
                };

                const sunAlloc: RemedialAllocation = {
                    id: `alloc_duty_sun_${Date.now()}`,
                    institutionId,
                    courseId: targetCourse?.id || 'GENERAL',
                    className: targetCourse?.name || 'Weekend Remedials',
                    stream: 'All Streams',
                    subjectId: targetSubject?.subjectId || 'GENERAL',
                    subjectName: targetSubject?.subjectName || 'Remedial General Duty',
                    teacherId: dutyModalTeacherId,
                    teacherName: teacher?.name || 'Teacher on Duty',
                    dayOfWeek: 'Sunday',
                    startTime: sundayStartTime || '09:00',
                    endTime: '11:00',
                    isWeekend: true,
                    isDutyLesson: true,
                    priority: 'High',
                    isManual: true,
                    is_manual: true,
                    isAutoGenerated: false,
                    is_auto_generated: false,
                    createdAt: new Date().toISOString()
                };

                await apiService.saveModuleRecord('school_remedial_allocations', satAlloc);
                await apiService.saveModuleRecord('school_remedial_allocations', sunAlloc);

                // Update timetable weekend duty codes
                setTimetableSatDuty(teacherCode);
                setTimetableSunDuty(teacherCode);
            }

            onLogAction?.(`Appointed ${teacher?.name} as Weekend Teacher on Duty for ${dutyModalWeek} (Allocated 1 Sat + 1 Sun duty lesson)`);
            alert(`Weekend Duty Teacher ${teacher?.name} appointed for ${dutyModalWeek}! 1 Saturday and 1 Sunday remedial lesson automatically allocated.`);
            setIsDutyModalOpen(false);
            setDutyModalTeacherId('');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to save weekend duty assignment');
        } finally {
            setIsSavingDuty(false);
        }
    };

    // Save Weekday Duty — one record per teacher, one allocation per teacher for the chosen weekday
    const handleSaveWeekdayDuty = async () => {
        if (dutyTeacherList.length === 0) {
            alert('Please add at least one teacher to the weekday duty list.');
            return;
        }
        try {
            setIsSavingDuty(true);
            const targetCourse = courses.find(c => c.id === dutyModalCourseId) || courses[0];
            const targetSubject = remedialSubjects.find(s => s.subjectId === dutyModalSubjectId) || remedialSubjects[0];
            const startTime = weekdayStartTime || '16:00';
            const endTime = weekdayEndTime || '18:00';

            for (const entry of dutyTeacherList) {
                const teacher = users.find(u => u.id === entry.teacherId);
                if (!teacher) continue;
                const teacherCode = teacher.name
                    ? teacher.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 3)
                    : 'DUT';

                const dutyPayRate = entry.payRate ? parseFloat(entry.payRate) : (weekdayDutyFlatRate || 200);
                const dutyPayType = entry.payType || 'flat';

                const dutyRecord: RemedialWeekendDuty = {
                    id: `duty_wd_${Date.now()}_${entry.teacherId.slice(-4)}`,
                    institutionId,
                    weekLabel: dutyModalWeek,
                    teacherId: entry.teacherId,
                    teacherName: teacher.name || 'Duty Teacher',
                    teacherCode,
                    courseId: targetCourse?.id,
                    className: targetCourse?.name,
                    subjectId: targetSubject?.subjectId,
                    subjectName: targetSubject?.subjectName,
                    dutyType: 'weekday',
                    weekdayDay: dutyModalWeekday,
                    weekdayStartTime: startTime,
                    weekdayEndTime: endTime,
                    weekdayAllocated: true,
                    dutyPayRate,
                    dutyPayType,
                    duty_type: 'weekday',
                    weekday_day: dutyModalWeekday,
                    weekday_start_time: startTime,
                    weekday_end_time: endTime,
                    weekday_allocated: true,
                    duty_pay_rate: dutyPayRate,
                    duty_pay_type: dutyPayType,
                    createdAt: new Date().toISOString(),
                };

                await apiService.saveModuleRecord('school_remedial_duty_roster', dutyRecord);

                // Auto-allocate one duty lesson on the selected weekday
                const wdAlloc: RemedialAllocation = {
                    id: `alloc_duty_wd_${Date.now()}_${entry.teacherId.slice(-4)}`,
                    institutionId,
                    courseId: targetCourse?.id || 'GENERAL',
                    className: targetCourse?.name || 'Weekday Remedials',
                    stream: 'All Streams',
                    subjectId: targetSubject?.subjectId || 'GENERAL',
                    subjectName: targetSubject?.subjectName || 'Remedial General Duty',
                    teacherId: entry.teacherId,
                    teacherName: teacher.name || 'Teacher on Duty',
                    dayOfWeek: dutyModalWeekday,
                    startTime,
                    endTime,
                    isWeekend: false,
                    isDutyLesson: true,
                    is_duty_lesson: true,
                    priority: 'High',
                    isManual: true,
                    is_manual: true,
                    isAutoGenerated: false,
                    is_auto_generated: false,
                    createdAt: new Date().toISOString(),
                };

                await apiService.saveModuleRecord('school_remedial_allocations', wdAlloc);
                onLogAction?.(`Appointed ${teacher.name} as Weekday TOD (${dutyModalWeekday}) for ${dutyModalWeek} — Flat Rate: KES ${dutyPayRate}/day`);
            }

            alert(`Weekday Duty (${dutyModalWeekday}) saved! ${dutyTeacherList.length} teacher(s) appointed for ${dutyModalWeek}.`);
            setIsDutyModalOpen(false);
            setDutyTeacherList([]);
            setDutyTeacherPickId('');
            setDutyTeacherPickRate('');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to save weekday duty assignment');
        } finally {
            setIsSavingDuty(false);
        }
    };

    // Unified duty save dispatcher
    const handleSaveDuty = () => {
        if (dutyModalType === 'weekday') {
            handleSaveWeekdayDuty();
        } else {
            handleSaveWeekendDuty();
        }
    };

    // Open Create Allocation Modal
    const handleOpenCreateAllocation = () => {
        setEditingAlloc(null);
        setAllocCourseId('');
        setAllocStream('All Streams');
        setCustomAllocStream('');
        setIsJointAlloc(false);
        setJointStreamsSelected([]);
        setJointCoursesSelected([]);
        setCustomJointStream('');
        setAllocSubjectId('');
        setAllocTeacherId('');
        setAllocDay('Monday');
        setAllocStartTime(weekdayStartTime || '16:00');
        setAllocEndTime(weekdayEndTime || '18:00');
        setAllowManualCollisionOverride(false);
        setShowAllocModal(true);
    };

    // Open Create Allocation Modal pre-filling slot, class, day, and time
    const handleOpenCreateAllocationForSlot = (targetClass?: string, targetStream?: string, day?: string, startTime?: string, endTime?: string) => {
        setEditingAlloc(null);
        const matchingCourse = courses.find(c => (c.name || '').trim() === (targetClass || '').trim() || c.id === targetClass);
        setAllocCourseId(matchingCourse?.id || targetClass || '');
        setAllocStream(targetStream && targetStream !== 'All Streams' ? targetStream : 'All Streams');
        setCustomAllocStream('');
        setIsJointAlloc(false);
        setJointStreamsSelected([]);
        setJointCoursesSelected([]);
        setCustomJointStream('');
        setAllocSubjectId('');
        setAllocTeacherId('');
        setAllocDay(((day as any) || 'Monday'));
        const isWeekend = ['Saturday', 'Sunday'].includes(day || '');
        setAllocStartTime(startTime || (isWeekend ? '08:00' : (weekdayStartTime || '16:00')));
        setAllocEndTime(endTime || (isWeekend ? '09:00' : (weekdayEndTime || '18:00')));
        setAllowManualCollisionOverride(false);
        setShowAllocModal(true);
    };

    // Open Create Allocation Modal pre-filling a specific teacher
    const handleOpenCreateAllocationForTeacher = (teacherId: string) => {
        setEditingAlloc(null);
        setAllocCourseId('');
        setAllocStream('All Streams');
        setCustomAllocStream('');
        setIsJointAlloc(false);
        setJointStreamsSelected([]);
        setJointCoursesSelected([]);
        setCustomJointStream('');
        setAllocSubjectId('');
        setAllocTeacherId(teacherId);
        setAllocDay('Monday');
        setAllocStartTime(weekdayStartTime || '16:00');
        setAllocEndTime(weekdayEndTime || '18:00');
        setAllowManualCollisionOverride(false);
        setShowAllocModal(true);
    };

    // Save Teacher Code (e.g. 01, 02, TR-01)
    const handleSaveTeacherCode = async (teacherId: string, newCode: string) => {
        const trimmed = newCode.trim();
        if (!trimmed) {
            setEditingTeacherCodeId(null);
            return;
        }

        const nextCodes = { ...teacherCodes, [teacherId]: trimmed };
        setTeacherCodes(nextCodes);
        setEditingTeacherCodeId(null);

        if (institutionId) {
            safeLocalStorage.setItem(`remedial_teacher_codes_${institutionId}`, JSON.stringify(nextCodes));
        }

        const targetUser = users.find(u => u.id === teacherId);
        if (targetUser) {
            const updatedUser: User = {
                ...targetUser,
                teacherCode: trimmed,
                code: trimmed,
                staffId: targetUser.staffId || trimmed,
                metadata: {
                    ...(targetUser.metadata || {}),
                    teacherCode: trimmed,
                    remedialTeacherCode: trimmed
                }
            };
            try {
                await apiService.saveModuleRecord('users', updatedUser);
            } catch (err) {
                console.warn('[Remedials] Failed to save teacher code to user table:', err);
            }
        }

        if (institutionId) {
            try {
                const updatedSetting = {
                    ...(rateSetting || {}),
                    id: rateSetting?.id || `rates_${institutionId}`,
                    institutionId,
                    metadata: {
                        ...((rateSetting as any)?.metadata || {}),
                        teacherCodes: nextCodes
                    }
                };
                setRateSetting(updatedSetting as any);
                await apiService.saveRemedialRateSetting(updatedSetting as any);
            } catch (err) {
                console.warn('[Remedials] Failed to update rateSetting for teacher code:', err);
            }
        }

        onLogAction?.(`Updated teacher code for ${targetUser?.name || 'teacher'} to ${trimmed}`);
    };

    // Auto-number teacher codes sequentially (01, 02, 03...)
    const handleAutoNumberTeacherCodes = async () => {
        if (!confirm('Auto-assign two-digit codes (01, 02, 03...) to all teachers? Existing codes will be preserved.')) return;
        const nextCodes = { ...teacherCodes };
        let counter = 1;
        for (const teacher of teachersList) {
            if (!nextCodes[teacher.id] && !teacher.teacherCode && !teacher.code && !teacher.metadata?.teacherCode) {
                const code = counter < 10 ? `0${counter}` : String(counter);
                nextCodes[teacher.id] = code;
                counter++;
            }
        }
        setTeacherCodes(nextCodes);
        if (institutionId) {
            safeLocalStorage.setItem(`remedial_teacher_codes_${institutionId}`, JSON.stringify(nextCodes));
            const updatedSetting = {
                ...(rateSetting || {}),
                id: rateSetting?.id || `rates_${institutionId}`,
                institutionId,
                metadata: {
                    ...((rateSetting as any)?.metadata || {}),
                    teacherCodes: nextCodes
                }
            };
            setRateSetting(updatedSetting as any);
            await apiService.saveRemedialRateSetting(updatedSetting as any).catch(() => {});
        }
        onLogAction?.('Auto-assigned sequential teacher codes (01, 02...) for remedial master timetable.');
    };

    // Open Edit Allocation Modal
    const handleOpenEditAllocation = (alloc: RemedialAllocation) => {
        setEditingAlloc(alloc);
        setAllocCourseId(alloc.courseId || '');

        const isJoint = !!(alloc.isJoint || alloc.is_joint || (alloc.jointStreams && alloc.jointStreams.length > 0));
        setIsJointAlloc(isJoint);

        let initialJointStreams: string[] = [];
        if (Array.isArray(alloc.jointStreams) && alloc.jointStreams.length > 0) {
            initialJointStreams = [...alloc.jointStreams];
        } else if (Array.isArray(alloc.joint_streams) && alloc.joint_streams.length > 0) {
            initialJointStreams = [...alloc.joint_streams];
        } else if (alloc.stream && alloc.stream.includes('+')) {
            initialJointStreams = alloc.stream.replace(/\(Joint\)/gi, '').split('+').map(s => s.trim()).filter(Boolean);
        }
        setJointStreamsSelected(initialJointStreams);
        setJointCoursesSelected(Array.isArray(alloc.jointCourses) ? alloc.jointCourses : (Array.isArray(alloc.joint_courses) ? alloc.joint_courses : []));
        setCustomJointStream('');

        const matchedCourse = courses.find(c => c.id === alloc.courseId);
        const courseStreams = matchedCourse?.streams || [];
        if (!alloc.stream || alloc.stream === 'All Streams') {
            setAllocStream('All Streams');
            setCustomAllocStream('');
        } else if (courseStreams.includes(alloc.stream)) {
            setAllocStream(alloc.stream);
            setCustomAllocStream('');
        } else if (!isJoint) {
            setAllocStream('__custom__');
            setCustomAllocStream(alloc.stream);
        } else {
            setAllocStream('All Streams');
            setCustomAllocStream('');
        }

        setAllocSubjectId(alloc.subjectId || '');
        setAllocTeacherId(alloc.teacherId || '');
        setAllocDay((alloc.dayOfWeek as any) || 'Monday');
        setAllocStartTime(alloc.startTime || (['Saturday', 'Sunday'].includes(alloc.dayOfWeek) ? (alloc.dayOfWeek === 'Sunday' ? (sundayStartTime || '09:00') : (saturdayStartTime || '08:00')) : (weekdayStartTime || '16:00')));
        setAllocEndTime(alloc.endTime || (['Saturday', 'Sunday'].includes(alloc.dayOfWeek) ? (alloc.dayOfWeek === 'Sunday' ? (sundayEndTime || '13:00') : (saturdayEndTime || '12:00')) : (weekdayEndTime || '18:00')));
        setAllowManualCollisionOverride(false);
        setShowAllocModal(true);
    };

    // Manual Allocation Handler (Create or Edit)
    const handleCreateManualAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allocCourseId || !allocSubjectId || !allocTeacherId) {
            return alert('Please select class, stream, subject, and teacher.');
        }

        if (isJointAlloc && jointStreamsSelected.length === 0 && !customJointStream.trim()) {
            return alert('Please select or add at least one stream for this joint class.');
        }

        try {
            const course = courses.find(c => c.id === allocCourseId);
            const remSubMatch = remedialSubjects.find(r => r.subjectId === allocSubjectId || r.id === allocSubjectId);
            const schoolSubMatch = effectiveSchoolSubjects.find(s => s.id === allocSubjectId);
            const resolvedSubjectName = schoolSubMatch?.name || remSubMatch?.subjectName || 'Subject';
            const teacher = users.find(u => u.id === allocTeacherId);
            const isWeekend = ['Saturday', 'Sunday'].includes(allocDay);

            let effectiveStream = allocStream === '__custom__'
                ? (customAllocStream.trim() || 'All Streams')
                : (allocStream || 'All Streams');

            let finalJointStreams: string[] = [];
            if (isJointAlloc) {
                finalJointStreams = [...jointStreamsSelected];
                if (customJointStream.trim() && !finalJointStreams.includes(customJointStream.trim())) {
                    finalJointStreams.push(customJointStream.trim());
                }
                if (finalJointStreams.length > 0) {
                    effectiveStream = `${finalJointStreams.join(' + ')} (Joint)`;
                } else {
                    effectiveStream = 'Joint Streams';
                }
            }

            // Multi-stream non-joint distribution check: If a class has multiple streams and user selected 'All Streams' without Joint Class
            const cStreams = course ? getClassStreams(course) : [];
            if (!isJointAlloc && !editingAlloc && effectiveStream === 'All Streams' && cStreams.length > 1) {
                const choice = window.confirm(
                    `Multi-Stream Class Allocation Notice:\n\n` +
                    `${course?.name} has ${cStreams.length} separate streams (${cStreams.join(', ')}).\n` +
                    `A single teacher cannot teach all streams at the exact same time unless it is a Joint Class.\n\n` +
                    `• Click [OK] to automatically DISTRIBUTE this lesson across different days for each stream (${cStreams.join(', ')}).\n` +
                    `• Click [Cancel] if you meant to combine all streams together as a Joint Class in one room (or choose a specific stream).`
                );

                if (!choice) return;

                // Automatically distribute across separate available days for each stream
                const daysList: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
                    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
                ];
                const createdDistAllocs: RemedialAllocation[] = [];
                const startDayIdx = daysList.indexOf(allocDay as any) >= 0 ? daysList.indexOf(allocDay as any) : 0;

                for (let sIdx = 0; sIdx < cStreams.length; sIdx++) {
                    const st = cStreams[sIdx];
                    let chosenDay = allocDay;

                    for (let d = 0; d < daysList.length; d++) {
                        const testDay = daysList[(startDayIdx + sIdx + d) % daysList.length];
                        const tBusy = [...allocations, ...createdDistAllocs].some(a => 
                            a.teacherId === allocTeacherId && a.dayOfWeek === testDay && a.startTime === allocStartTime
                        );
                        const sBusy = [...allocations, ...createdDistAllocs].some(a => 
                            (a.courseId === allocCourseId || a.className === course?.name) && a.stream === st && a.dayOfWeek === testDay
                        );
                        if (!tBusy && !sBusy) {
                            chosenDay = testDay;
                            break;
                        }
                    }

                    const newSingle: RemedialAllocation = {
                        id: `rem_alloc_${Date.now()}_${st.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substr(2, 4)}`,
                        courseId: allocCourseId,
                        className: course?.name || 'Class',
                        stream: st,
                        isJoint: false,
                        is_joint: false,
                        subjectId: allocSubjectId,
                        subjectName: resolvedSubjectName,
                        teacherId: allocTeacherId,
                        teacherName: teacher?.name || 'Teacher',
                        dayOfWeek: chosenDay as any,
                        startTime: allocStartTime,
                        endTime: allocEndTime,
                        isWeekend: ['Saturday', 'Sunday'].includes(chosenDay),
                        isManual: true,
                        is_manual: true,
                        isAutoGenerated: false,
                        is_auto_generated: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        institutionId
                    };

                    if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                        await (apiService as any).saveRemedialAllocation(newSingle);
                    } else {
                        await apiService.saveModuleRecord('school_remedial_allocations', newSingle);
                    }
                    createdDistAllocs.push(newSingle);
                }

                alert(
                    `Successfully Distributed across ${cStreams.length} Streams on Separate Days!\n\n` +
                    createdDistAllocs.map(a => `• ${a.stream}: ${a.dayOfWeek} (${a.startTime} - ${a.endTime})`).join('\n')
                );
                setShowAllocModal(false);
                setEditingAlloc(null);
                loadData();
                return;
            }

            if (!allowManualCollisionOverride) {
                if (!isWeekend) {
                    // Strict 1 period per day rule for weekdays (Monday through Friday)
                    const existingWeekdayClassAlloc = allocations.find(a => 
                        a.id !== editingAlloc?.id &&
                        a.dayOfWeek === allocDay &&
                        (a.courseId === allocCourseId || a.className === course?.name) &&
                        (
                            a.stream === effectiveStream ||
                            a.stream === 'All Streams' ||
                            effectiveStream === 'All Streams' ||
                            isJointAlloc ||
                            a.isJoint
                        )
                    );

                    if (existingWeekdayClassAlloc) {
                        return alert(
                            `Weekday Rule Violation:\n\n` +
                            `${course?.name || 'This class'} (${effectiveStream}) already has a remedial period scheduled on ${allocDay}:\n` +
                            `• ${existingWeekdayClassAlloc.subjectName} (${existingWeekdayClassAlloc.startTime} - ${existingWeekdayClassAlloc.endTime})\n\n` +
                            `Weekdays strictly follow the 1 period per day rule per class. Choose another day or check 'Allow overlap / joint lesson override'.`
                        );
                    }
                }

                // Universal slot overlap check for the class:
                const existingClassSlotCollision = allocations.find(a => {
                    if (a.id === editingAlloc?.id) return false;
                    if (a.dayOfWeek !== allocDay) return false;
                    const sameClass = a.courseId === allocCourseId || a.className === course?.name;
                    if (!sameClass) return false;
                    const streamConflict = matchAllocationStream(a, effectiveStream) || matchAllocationStream({ stream: effectiveStream }, a.stream);
                    if (!streamConflict) return false;
                    const aStart = a.startTime || '00:00';
                    const aEnd = a.endTime || '23:59';
                    const newStart = allocStartTime || '00:00';
                    const newEnd = allocEndTime || '23:59';
                    return (newStart < aEnd && newEnd > aStart) || (newStart === aStart);
                });

                if (existingClassSlotCollision) {
                    return alert(
                        `Slot Overlap Conflict:\n\n` +
                        `${course?.name || 'This class'} (${effectiveStream}) already has a lesson scheduled at this time on ${allocDay}:\n` +
                        `• ${existingClassSlotCollision.subjectName} with ${existingClassSlotCollision.teacherName} (${existingClassSlotCollision.startTime} - ${existingClassSlotCollision.endTime})\n\n` +
                        `Please choose an available slot or select another day/time.`
                    );
                }

                // Teacher conflict check at the exact same day and time
                const existingTeacherCollision = allocations.find(a => {
                    if (a.id === editingAlloc?.id) return false;
                    if (a.teacherId !== allocTeacherId) return false;
                    if (a.dayOfWeek !== allocDay) return false;
                    const aStart = a.startTime || '00:00';
                    const aEnd = a.endTime || '23:59';
                    const newStart = allocStartTime || '00:00';
                    const newEnd = allocEndTime || '23:59';
                    return (newStart < aEnd && newEnd > aStart) || (newStart === aStart);
                });
                if (existingTeacherCollision) {
                    return alert(
                        `Teacher Conflict:\n\n` +
                        `${teacher?.name || 'Selected teacher'} is already allocated to teach ${existingTeacherCollision.className} (${existingTeacherCollision.subjectName}) on ${allocDay} at ${existingTeacherCollision.startTime} - ${existingTeacherCollision.endTime}.\n\n` +
                        `Please select a different teacher or time slot.`
                    );
                }
            }

            const payloadAlloc: RemedialAllocation = {
                ...(editingAlloc || {}),
                id: editingAlloc?.id || `rem_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                courseId: allocCourseId,
                className: course?.name || editingAlloc?.className || 'Class',
                stream: effectiveStream,
                isJoint: isJointAlloc,
                is_joint: isJointAlloc,
                jointStreams: isJointAlloc ? finalJointStreams : [],
                joint_streams: isJointAlloc ? finalJointStreams : [],
                jointCourses: isJointAlloc ? jointCoursesSelected : [],
                joint_courses: isJointAlloc ? jointCoursesSelected : [],
                subjectId: allocSubjectId,
                subjectName: resolvedSubjectName,
                teacherId: allocTeacherId,
                teacherName: teacher?.name || editingAlloc?.teacherName || 'Teacher',
                dayOfWeek: allocDay,
                startTime: allocStartTime,
                endTime: allocEndTime,
                isWeekend,
                isManual: true,
                is_manual: true,
                isAutoGenerated: false,
                is_auto_generated: false,
                createdAt: editingAlloc?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                institutionId
            };

            if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                await (apiService as any).saveRemedialAllocation(payloadAlloc);
            } else {
                await apiService.saveModuleRecord('school_remedial_allocations', payloadAlloc);
            }
            onLogAction?.(`${editingAlloc ? 'Updated' : 'Allocated'} remedial ${resolvedSubjectName} for ${course?.name} (${effectiveStream}) to ${teacher?.name} on ${allocDay}`);
            alert(editingAlloc ? 'Remedial allocation updated successfully!' : 'Remedial allocation saved successfully!');
            setShowAllocModal(false);
            setEditingAlloc(null);
            setAllocStream('All Streams');
            setCustomAllocStream('');
            setIsJointAlloc(false);
            setJointStreamsSelected([]);
            setJointCoursesSelected([]);
            setCustomJointStream('');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to save allocation');
        }
    };

    // Smart Auto-Generate Timetable Engine (Strictly for Allocated Classes & Teachers with Manual Allocation)
    const handleAutoGenerateTimetable = async () => {
        if (courses.length === 0 || teachersList.length === 0) {
            return alert('Insufficient data to auto-generate remedial timetable. Please ensure classes and teachers are registered.');
        }

        // 1. Identify classes that have manual allocations (do NOT generate for unallocated classes)
        const manualAllocs = allocations.filter(a =>
            a.isManual === true ||
            a.is_manual === true ||
            (!a.isAutoGenerated && !a.is_auto_generated)
        );

        const allocatedCourseIds = new Set<string>();
        const allocatedCourseNames = new Set<string>();

        manualAllocs.forEach(a => {
            if (a.courseId) allocatedCourseIds.add(a.courseId);
            if (a.className) allocatedCourseNames.add(a.className.trim().toLowerCase());
            if (Array.isArray(a.jointCourses)) {
                a.jointCourses.forEach(jc => allocatedCourseIds.add(jc));
            }
        });

        // Filter courses strictly to those that have manual allocations
        const allocatedCourses = courses.filter(c =>
            allocatedCourseIds.has(c.id) ||
            allocatedCourseNames.has(c.name.trim().toLowerCase())
        );

        if (allocatedCourses.length === 0) {
            return alert(
                'No classes with manual allocations found.\n\n' +
                'Timetable auto-generation only generates sessions for classes and teachers that have already been allocated.\n\n' +
                'Classes that have not been allocated will not be generated. Please create manual allocation(s) for your classes and teachers first.'
            );
        }

        const confirmMsg = 
            `Auto-Generate Remedial Timetable for ${allocatedCourses.length} allocated class(es)?\n\n` +
            `• Allocated Classes: ${allocatedCourses.map(c => c.name).join(', ')}\n` +
            `• Unallocated Classes: Strictly skipped (will not be generated).\n` +
            `• Designated Teachers: Lessons generated strictly to teachers with manual allocations for each class & subject.\n` +
            `• Weekday 1-Period Rule: Strictly 1 remedial period per day per class on weekdays (Monday - Friday).\n` +
            `• Weekend Lessons: Up to ${maxWeekendLessonsPerDay} sessions per day on Saturday/Sunday.\n` +
            `• Preservation: Existing manual allocations are kept intact.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setLoading(true);

            // Clean up any previously auto-generated allocations for these classes to avoid duplicates while strictly preserving manual allocations
            const existingAutoAllocations = allocations.filter(a =>
                (a.isAutoGenerated === true || a.is_auto_generated === true) &&
                (allocatedCourseIds.has(a.courseId || '') || allocatedCourseNames.has(a.className?.trim().toLowerCase() || ''))
            );

            for (const oldAuto of existingAutoAllocations) {
                try {
                    await apiService.deleteModuleRecord('school_remedial_allocations', oldAuto.id);
                } catch (e) {
                    console.warn('Failed to delete old auto allocation', oldAuto.id, e);
                }
            }

            const daysOfWeek: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
                'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
            ];

            // Teacher tracking
            const teacherDailyCount: Record<string, Record<string, number>> = {};
            const teacherSlotBooked: Record<string, Set<string>> = {}; // key: `${teacherId}_${day}_${startTime}`
            teachersList.forEach(t => {
                teacherDailyCount[t.id] = {};
                teacherSlotBooked[t.id] = new Set();
                daysOfWeek.forEach(day => {
                    teacherDailyCount[t.id][day] = 0;
                });
            });

            // Class tracking
            // Class & Stream tracking
            const classDayBooked: Record<string, Set<string>> = {};
            const classSlotBooked: Record<string, Set<string>> = {};
            const streamDayBooked: Record<string, Set<string>> = {};
            allocatedCourses.forEach(c => {
                classDayBooked[c.id] = new Set();
                classSlotBooked[c.id] = new Set();
                const cStreams = getClassStreams(c);
                cStreams.forEach(s => {
                    streamDayBooked[`${c.id}_${s}`] = new Set();
                    streamDayBooked[`${c.name.trim().toLowerCase()}_${s}`] = new Set();
                });
            });

            // Pre-populate with existing manual allocations so they are never double-booked
            manualAllocs.forEach(ma => {
                if (ma.dayOfWeek && daysOfWeek.includes(ma.dayOfWeek as any)) {
                    const day = ma.dayOfWeek as any;
                    if (ma.teacherId && teacherDailyCount[ma.teacherId]) {
                        teacherDailyCount[ma.teacherId][day] = (teacherDailyCount[ma.teacherId][day] || 0) + 1;
                        if (ma.startTime) {
                            teacherSlotBooked[ma.teacherId]?.add(`${day}_${ma.startTime}`);
                        }
                    }
                    const matchedCourse = allocatedCourses.find(c => c.id === ma.courseId || c.name.trim().toLowerCase() === ma.className?.trim().toLowerCase());
                    if (matchedCourse) {
                        classDayBooked[matchedCourse.id]?.add(day);
                        if (ma.startTime) {
                            classSlotBooked[matchedCourse.id]?.add(`${day}_${ma.startTime}`);
                        }
                        const isJointAlloc = !!(ma.isJoint || ma.is_joint || (ma.jointStreams && ma.jointStreams.length > 0));
                        if (ma.stream && ma.stream !== 'All Streams') {
                            const sKey = `${matchedCourse.id}_${ma.stream}`;
                            if (!streamDayBooked[sKey]) streamDayBooked[sKey] = new Set();
                            streamDayBooked[sKey].add(day);
                        } else if (isJointAlloc) {
                            const cStreams = getClassStreams(matchedCourse);
                            cStreams.forEach(s => {
                                const sKey = `${matchedCourse.id}_${s}`;
                                if (!streamDayBooked[sKey]) streamDayBooked[sKey] = new Set();
                                streamDayBooked[sKey].add(day);
                            });
                        }
                    }
                }
            });

            const newAllocations: RemedialAllocation[] = [];
            let totalHighAllocated = 0;

            const priorityScore = (p: string) => (p === 'High' ? 3 : p === 'Medium' ? 2 : 1);

            // Iterate ONLY over allocated courses
            for (const course of allocatedCourses) {
                // Find all manual allocations belonging to this course
                const courseManuals = manualAllocs.filter(a =>
                    a.courseId === course.id ||
                    a.className?.trim().toLowerCase() === course.name.trim().toLowerCase() ||
                    (Array.isArray(a.jointCourses) && a.jointCourses.includes(course.id))
                );

                // Group by subject to determine which subjects and which teachers were manually allocated
                const allocatedSubjectsMap = new Map<string, {
                    subjectId: string;
                    subjectName: string;
                    teacherId: string;
                    teacherName: string;
                    priority: 'High' | 'Medium' | 'Low';
                    weeklyOccurrences: number;
                    preferredDayType: 'any' | 'weekdays' | 'weekends';
                    allowedDays?: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
                    allowedPeriods?: number[];
                    manualCount: number;
                    manualAllocations: RemedialAllocation[];
                }>();

                courseManuals.forEach(ma => {
                    const sId = ma.subjectId || ma.subjectName;
                    if (!sId) return;

                    if (!allocatedSubjectsMap.has(sId)) {
                        const cfg = remedialSubjects.find(rs => rs.subjectId === sId || rs.id === sId);
                        const schSub = effectiveSchoolSubjects.find(s => s.id === sId);
                        const name = ma.subjectName || schSub?.name || cfg?.subjectName || 'Subject';
                        const nameLower = name.toLowerCase();
                        const isCore = nameLower.includes('math') || nameLower.includes('calc') || nameLower.includes('physic') || nameLower.includes('chem') || nameLower.includes('bio') || nameLower.includes('eng') || nameLower.includes('kisw');

                        allocatedSubjectsMap.set(sId, {
                            subjectId: sId,
                            subjectName: name,
                            teacherId: ma.teacherId,
                            teacherName: ma.teacherName || 'Teacher',
                            priority: cfg?.priority || (isCore ? 'High' : 'Medium'),
                            weeklyOccurrences: cfg?.weeklyOccurrences ? Math.min(Math.max(cfg.weeklyOccurrences, 1), 4) : (isCore ? 2 : 1),
                            preferredDayType: cfg?.preferredDayType || 'any',
                            allowedDays: cfg?.allowedDays && cfg.allowedDays.length > 0 ? cfg.allowedDays : undefined,
                            allowedPeriods: cfg?.allowedPeriods && cfg.allowedPeriods.length > 0 ? cfg.allowedPeriods : undefined,
                            manualCount: 0,
                            manualAllocations: []
                        });
                    }

                    const entry = allocatedSubjectsMap.get(sId)!;
                    entry.manualCount++;
                    entry.manualAllocations.push(ma);
                    if (ma.teacherId) {
                        entry.teacherId = ma.teacherId;
                        entry.teacherName = ma.teacherName || entry.teacherName;
                    }
                });

                // Sort subjects for this course by priority
                const sortedSubjects = Array.from(allocatedSubjectsMap.values()).sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

                for (const subEntry of sortedSubjects) {
                    const courseStreams = getClassStreams(course);
                    const sampleManual = subEntry.manualAllocations[0];
                    const isJoint = !!(sampleManual?.isJoint || sampleManual?.is_joint || (sampleManual?.jointStreams && sampleManual.jointStreams.length > 0));

                    // When class has multiple streams and this subject is NOT joint, each stream requires separate allocation across different days!
                    const streamTargets: string[] = (courseStreams.length > 1 && !isJoint)
                        ? courseStreams
                        : [sampleManual?.stream || 'All Streams'];

                    for (const targetStream of streamTargets) {
                        // Check existing manual allocations for this specific stream
                        const alreadyAllocatedForStream = subEntry.manualAllocations.filter(m =>
                            targetStream === 'All Streams' || m.stream === targetStream || (isJoint && (m.isJoint || m.is_joint))
                        );
                        const neededOccurrences = Math.max(0, subEntry.weeklyOccurrences - alreadyAllocatedForStream.length);
                        const assignedDaysForStream = alreadyAllocatedForStream.map(m => m.dayOfWeek).filter(Boolean);

                        for (let occ = 0; occ < neededOccurrences; occ++) {
                            if (subEntry.priority === 'High') totalHighAllocated++;

                            // Candidate days filtered by allowedDays (hard restriction) then preferredDayType
                            let candidateDays = [...daysOfWeek];
                            if (subEntry.allowedDays && subEntry.allowedDays.length > 0) {
                                // Hard restriction: only these specific days allowed
                                candidateDays = candidateDays.filter(d => (subEntry.allowedDays as string[]).includes(d));
                            } else if (subEntry.preferredDayType === 'weekends') {
                                candidateDays = candidateDays.filter(d => ['Saturday', 'Sunday'].includes(d));
                            } else if (subEntry.preferredDayType === 'weekdays') {
                                candidateDays = candidateDays.filter(d => !['Saturday', 'Sunday'].includes(d));
                            }

                            // Sort candidate days by spacing distance from existing assignments of this subject/stream
                            candidateDays.sort((d1, d2) => {
                                const idx1 = daysOfWeek.indexOf(d1);
                                const idx2 = daysOfWeek.indexOf(d2);

                                const dist1 = assignedDaysForStream.length > 0
                                    ? Math.min(...assignedDaysForStream.map(pd => Math.abs(idx1 - daysOfWeek.indexOf(pd as any))))
                                    : 99;
                                const dist2 = assignedDaysForStream.length > 0
                                    ? Math.min(...assignedDaysForStream.map(pd => Math.abs(idx2 - daysOfWeek.indexOf(pd as any))))
                                    : 99;

                                const sKey1 = `${course.id}_${targetStream}`;
                                const sKey2 = `${course.id}_${targetStream}`;
                                const streamFree1 = streamDayBooked[sKey1]?.has(d1) ? 0 : 1;
                                const streamFree2 = streamDayBooked[sKey2]?.has(d2) ? 0 : 1;
                                if (streamFree1 !== streamFree2) return streamFree2 - streamFree1;

                                return dist2 - dist1;
                            });

                            let selectedDay: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday') | null = null;
                            let selectedTeacher: User | null = null;

                            // Identify the designated teacher who has the manual allocation for this class & subject
                            const designatedTeacher = users.find(u => u.id === subEntry.teacherId) || teachersList.find(t => t.id === subEntry.teacherId);

                                // Try candidate days first
                            for (const day of candidateDays) {
                                const isWeekend = ['Saturday', 'Sunday'].includes(day);
                                const sKey = `${course.id}_${targetStream}`;

                                // STRICT 1 PERIOD PER DAY ON WEEKDAYS FOR THIS STREAM:
                                if (!isWeekend && streamDayBooked[sKey]?.has(day)) continue;

                                const existingStreamCountOnDay = [...manualAllocs, ...newAllocations].filter(a =>
                                    (a.courseId === course.id || a.className?.trim().toLowerCase() === course.name.trim().toLowerCase()) &&
                                    (targetStream === 'All Streams' || a.stream === targetStream || a.stream === 'All Streams' || a.isJoint || a.is_joint) &&
                                    a.dayOfWeek === day
                                ).length;

                                const maxAllowedOnDay = isWeekend ? maxWeekendLessonsPerDay : 1;
                                if (existingStreamCountOnDay >= maxAllowedOnDay) continue;

                                let candidateStartTime = weekdayStartTime || '16:00';
                                if (day === 'Saturday') {
                                    candidateStartTime = existingStreamCountOnDay === 0 ? (saturdayStartTime || '08:00') : (includeSaturdayBreak ? (saturdayBreakEndTime || '10:30') : '10:00');
                                } else if (day === 'Sunday') {
                                    candidateStartTime = existingStreamCountOnDay === 0 ? (sundayStartTime || '09:00') : (includeSundayBreak ? (sundayBreakEndTime || '11:30') : '11:00');
                                }

                                // Enforce allowedPeriods: period number = existingStreamCountOnDay + 1
                                const thisPeriodNum = existingStreamCountOnDay + 1;
                                const allowedPeriods = subEntry.allowedPeriods;
                                if (allowedPeriods && allowedPeriods.length > 0 && !allowedPeriods.includes(thisPeriodNum)) continue;

                                // Strictly check designated teacher availability first (teacher cannot teach 2 streams at once)
                                if (designatedTeacher) {
                                    const dailyCount = teacherDailyCount[designatedTeacher.id]?.[day] || 0;
                                    const tLimit = isWeekend ? maxWeekendLessonsPerDay : maxLessonsPerDay;
                                    const isTimeSlotFree = !teacherSlotBooked[designatedTeacher.id]?.has(`${day}_${candidateStartTime}`);

                                    if (dailyCount < tLimit && isTimeSlotFree) {
                                        selectedDay = day;
                                        selectedTeacher = designatedTeacher;
                                        break;
                                    }
                                }
                            }

                            // Fallback across any day if preferred candidate days were filled
                            if (!selectedDay || !selectedTeacher) {
                                for (const fbDay of daysOfWeek) {
                                    const fbIsWeekend = ['Saturday', 'Sunday'].includes(fbDay);
                                    const sKey = `${course.id}_${targetStream}`;
                                    if (!fbIsWeekend && streamDayBooked[sKey]?.has(fbDay)) continue;

                                    const fbExistingStreamCount = [...manualAllocs, ...newAllocations].filter(a =>
                                        (a.courseId === course.id || a.className?.trim().toLowerCase() === course.name.trim().toLowerCase()) &&
                                        (targetStream === 'All Streams' || a.stream === targetStream || a.stream === 'All Streams' || a.isJoint || a.is_joint) &&
                                        a.dayOfWeek === fbDay
                                    ).length;
                                    const fbMax = fbIsWeekend ? maxWeekendLessonsPerDay : 1;
                                    if (fbExistingStreamCount >= fbMax) continue;

                                    let fbStartTime = weekdayStartTime || '16:00';
                                    if (fbDay === 'Saturday') {
                                        fbStartTime = fbExistingStreamCount === 0 ? (saturdayStartTime || '08:00') : (includeSaturdayBreak ? (saturdayBreakEndTime || '10:30') : '10:00');
                                    } else if (fbDay === 'Sunday') {
                                        fbStartTime = fbExistingStreamCount === 0 ? (sundayStartTime || '09:00') : (includeSundayBreak ? (sundayBreakEndTime || '11:30') : '11:00');
                                    }

                                    if (designatedTeacher) {
                                        const dailyCount = teacherDailyCount[designatedTeacher.id]?.[fbDay] || 0;
                                        const tLimit = fbIsWeekend ? maxWeekendLessonsPerDay : maxLessonsPerDay;
                                        const isTimeSlotFree = !teacherSlotBooked[designatedTeacher.id]?.has(`${fbDay}_${fbStartTime}`);

                                        if (dailyCount < tLimit && isTimeSlotFree) {
                                            selectedDay = fbDay;
                                            selectedTeacher = designatedTeacher;
                                            break;
                                        }
                                    }
                                }
                            }

                            // If stream or designated teacher reached maximum capacity, respect limit
                            if (!selectedDay || !selectedTeacher) {
                                console.warn(`[Timetable Engine] Stream ${targetStream} of ${course.name} or designated teacher ${subEntry.teacherName} at full weekly capacity. Weekday 1-period rule strictly preserved.`);
                                continue;
                            }

                            const isWeekend = ['Saturday', 'Sunday'].includes(selectedDay);
                            const streamDayLessonCount = [...manualAllocs, ...newAllocations].filter(a =>
                                (a.courseId === course.id || a.className?.trim().toLowerCase() === course.name.trim().toLowerCase()) &&
                                (targetStream === 'All Streams' || a.stream === targetStream || a.stream === 'All Streams' || a.isJoint || a.is_joint) &&
                                a.dayOfWeek === selectedDay
                            ).length;

                            let startTime = weekdayStartTime || '16:00';
                            let endTime = weekdayEndTime || '18:00';

                            if (selectedDay === 'Saturday') {
                                if (includeSaturdayBreak) {
                                    if (streamDayLessonCount === 0) {
                                        startTime = saturdayStartTime || '08:00';
                                        endTime = saturdayBreakStartTime || '10:00';
                                    } else {
                                        startTime = saturdayBreakEndTime || '10:30';
                                        endTime = saturdayEndTime || '12:30';
                                    }
                                } else {
                                    if (streamDayLessonCount === 0) {
                                        startTime = saturdayStartTime || '08:00';
                                        endTime = '10:00';
                                    } else {
                                        startTime = '10:00';
                                        endTime = saturdayEndTime || '12:00';
                                    }
                                }
                            } else if (selectedDay === 'Sunday') {
                                if (includeSundayBreak) {
                                    if (streamDayLessonCount === 0) {
                                        startTime = sundayStartTime || '09:00';
                                        endTime = sundayBreakStartTime || '11:00';
                                    } else {
                                        startTime = sundayBreakEndTime || '11:30';
                                        endTime = sundayEndTime || '13:30';
                                    }
                                } else {
                                    if (streamDayLessonCount === 0) {
                                        startTime = sundayStartTime || '09:00';
                                        endTime = '11:00';
                                    } else {
                                        startTime = '11:00';
                                        endTime = sundayEndTime || '13:00';
                                    }
                                }
                            }

                            // Register booking
                            teacherDailyCount[selectedTeacher.id][selectedDay] = (teacherDailyCount[selectedTeacher.id][selectedDay] || 0) + 1;
                            teacherSlotBooked[selectedTeacher.id].add(`${selectedDay}_${startTime}`);
                            classDayBooked[course.id].add(selectedDay);
                            classSlotBooked[course.id].add(`${selectedDay}_${startTime}`);
                            const sKey = `${course.id}_${targetStream}`;
                            if (!streamDayBooked[sKey]) streamDayBooked[sKey] = new Set();
                            streamDayBooked[sKey].add(selectedDay);
                            assignedDaysForStream.push(selectedDay);

                            newAllocations.push({
                                id: `rem_alloc_${Date.now()}_${course.id.slice(-4)}_${subEntry.subjectId.slice(-4)}_${targetStream.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)}_${selectedDay.slice(0, 3)}_${occ}`,
                                courseId: course.id,
                                className: course.name,
                                stream: targetStream,
                                isJoint: isJoint,
                                is_joint: isJoint,
                                jointStreams: isJoint ? (sampleManual?.jointStreams || courseStreams) : undefined,
                                joint_streams: isJoint ? (sampleManual?.joint_streams || courseStreams) : undefined,
                                jointCourses: isJoint ? sampleManual?.jointCourses : undefined,
                                joint_courses: isJoint ? sampleManual?.joint_courses : undefined,
                                subjectId: subEntry.subjectId,
                                subjectName: subEntry.subjectName,
                                teacherId: selectedTeacher.id,
                                teacherName: selectedTeacher.name,
                                dayOfWeek: selectedDay,
                                startTime,
                                endTime,
                                isWeekend,
                                priority: subEntry.priority,
                                isManual: false,
                                is_manual: false,
                                isAutoGenerated: true,
                                is_auto_generated: true,
                                createdAt: new Date().toISOString(),
                                institutionId
                            });
                        }
                    }
                }
            }

            // Save new allocations
            for (const alloc of newAllocations) {
                if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                    await (apiService as any).saveRemedialAllocation(alloc);
                } else {
                    await apiService.saveModuleRecord('school_remedial_allocations', alloc);
                }
            }

            // Reset timetable approval workflow state to Draft for DOS review & forwarding
            await updateTimetableApproval({
                status: 'draft',
                forwardedBy: '',
                forwardedAt: '',
                forwardingNotes: '',
                approvedBy: '',
                approvedAt: '',
                approvalNotes: '',
                revisionNotes: '',
                dispersedAt: '',
                notificationSentCount: 0
            });

            onLogAction?.(`Auto-generated ${newAllocations.length} remedial sessions for ${allocatedCourses.length} allocated classes strictly to teachers with manual allocations. Unallocated classes skipped.`);
            alert(
                `Remedial Timetable Auto-Generated Successfully!\n\n` +
                `• Allocated Classes Processed: ${allocatedCourses.length} (${allocatedCourses.map(c => c.name).join(', ')})\n` +
                `• Unallocated Classes: Skipped (0 sessions generated)\n` +
                `• Designated Teachers: Sessions strictly generated to teachers with manual allocations\n` +
                `• New Sessions Added: ${newAllocations.length}\n` +
                `• Weekday 1-Period Rule & Limits: Fully Enforced\n\n` +
                `STATUS: DRAFT (Pending Review)\nNext Step: Review the timetable below, then click "Forward to Headteacher for Approval".`
            );
            loadData();
        } catch (err: any) {
            console.error('Failed to auto-generate timetable', err);
            alert('Failed to auto-generate timetable: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Delete Allocation
    const handleDeleteAllocation = async (allocId: string) => {
        if (!window.confirm('Delete this remedial session allocation?')) return;
        try {
            await apiService.deleteModuleRecord('school_remedial_allocations', allocId);
            onLogAction?.(`Deleted remedial allocation #${allocId}`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete allocation');
        }
    };

    // Timetable Collision Detection
    const detectedCollisions = useMemo(() => {
        interface TimetableCollision {
            id: string;
            type: 'class_slot' | 'teacher_slot';
            title: string;
            dayOfWeek: string;
            startTime: string;
            endTime: string;
            className?: string;
            stream?: string;
            teacherId?: string;
            teacherName?: string;
            allocations: RemedialAllocation[];
        }

        const collisions: TimetableCollision[] = [];
        const processedClassKeys = new Set<string>();
        const processedTeacherKeys = new Set<string>();

        const allDistinctCls = getDistinctTimetableClasses(allocations, courses);
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

        // 1. Detect Class Slot Overlaps
        allDistinctCls.forEach(cls => {
            days.forEach(day => {
                const classDayAllocs = allocations.filter(a =>
                    !a.isUnallocated && a.dayOfWeek !== 'Unallocated' && !!a.startTime &&
                    a.dayOfWeek === day &&
                    (a.courseId === cls.className || a.className === cls.className) &&
                    matchAllocationStream(a, cls.stream)
                );

                const grouped: RemedialAllocation[][] = [];
                classDayAllocs.forEach(a => {
                    let found = false;
                    for (const grp of grouped) {
                        const ref = grp[0];
                        const refStart = ref.startTime || '00:00';
                        const refEnd = ref.endTime || '23:59';
                        const aStart = a.startTime || '00:00';
                        const aEnd = a.endTime || '23:59';
                        if (aStart === refStart || (aStart < refEnd && aEnd > refStart)) {
                            grp.push(a);
                            found = true;
                            break;
                        }
                    }
                    if (!found) grouped.push([a]);
                });

                grouped.forEach(grp => {
                    if (grp.length > 1) {
                        const key = `class_${cls.className}_${cls.stream}_${day}_${grp[0].startTime}`;
                        if (!processedClassKeys.has(key)) {
                            processedClassKeys.add(key);
                            collisions.push({
                                id: key,
                                type: 'class_slot',
                                title: `${cls.shortCode} • ${day} ${grp[0].startTime} - ${grp[0].endTime || ''}`,
                                dayOfWeek: day,
                                startTime: grp[0].startTime || '',
                                endTime: grp[0].endTime || '',
                                className: cls.className,
                                stream: cls.stream,
                                allocations: grp
                            });
                        }
                    }
                });
            });
        });

        // 2. Detect Teacher Double-Booking Collisions
        days.forEach(day => {
            const teacherMap = new Map<string, RemedialAllocation[]>();
            allocations.filter(a => !a.isUnallocated && a.dayOfWeek !== 'Unallocated' && !!a.startTime && a.dayOfWeek === day && a.teacherId).forEach(a => {
                const list = teacherMap.get(a.teacherId) || [];
                list.push(a);
                teacherMap.set(a.teacherId, list);
            });

            teacherMap.forEach((tAllocs, tId) => {
                const grouped: RemedialAllocation[][] = [];
                tAllocs.forEach(a => {
                    let found = false;
                    for (const grp of grouped) {
                        const ref = grp[0];
                        const refStart = ref.startTime || '00:00';
                        const refEnd = ref.endTime || '23:59';
                        const aStart = a.startTime || '00:00';
                        const aEnd = a.endTime || '23:59';
                        if (aStart === refStart || (aStart < refEnd && aEnd > refStart)) {
                            grp.push(a);
                            found = true;
                            break;
                        }
                    }
                    if (!found) grouped.push([a]);
                });

                grouped.forEach(grp => {
                    if (grp.length > 1) {
                        const isSharedJoint = grp.every(a => (a.isJoint || a.is_joint) && grp[0].courseId === a.courseId);
                        if (!isSharedJoint) {
                            const key = `teacher_${tId}_${day}_${grp[0].startTime}`;
                            if (!processedTeacherKeys.has(key)) {
                                processedTeacherKeys.add(key);
                                collisions.push({
                                    id: key,
                                    type: 'teacher_slot',
                                    title: `${grp[0].teacherName || 'Teacher'} • ${day} ${grp[0].startTime} - ${grp[0].endTime || ''}`,
                                    dayOfWeek: day,
                                    startTime: grp[0].startTime || '',
                                    endTime: grp[0].endTime || '',
                                    teacherId: tId,
                                    teacherName: grp[0].teacherName,
                                    allocations: grp
                                });
                            }
                        }
                    }
                });
            });
        });

        // 3. Detect Multi-Stream Non-Joint Allocations (where teacher is assigned to All Streams simultaneously without being joint)
        allocations.filter(a => !a.isUnallocated && a.dayOfWeek !== 'Unallocated' && !!a.startTime).forEach(a => {
            const isJoint = !!(a.isJoint || a.is_joint || (a.jointStreams && a.jointStreams.length > 0));
            if (!isJoint) {
                const cMatch = courses.find(c => c.id === a.courseId || c.name === a.className);
                if (cMatch) {
                    const cStreams = getClassStreams(cMatch);
                    if (cStreams.length > 1 && (!a.stream || a.stream === 'All Streams')) {
                        const key = `multistream_${a.id}`;
                        if (!processedTeacherKeys.has(key)) {
                            processedTeacherKeys.add(key);
                            collisions.push({
                                id: key,
                                type: 'teacher_slot',
                                title: `${a.teacherName || 'Teacher'} (${a.subjectName}) • ${a.className} (All Streams) • ${a.dayOfWeek} ${a.startTime}`,
                                dayOfWeek: a.dayOfWeek,
                                startTime: a.startTime || '',
                                endTime: a.endTime || '',
                                teacherId: a.teacherId,
                                teacherName: a.teacherName,
                                className: a.className,
                                stream: 'All Streams',
                                allocations: [a]
                            });
                        }
                    }
                }
            }
        });

        return collisions;
    }, [allocations, courses]);

    const totalOverlappingLessons = useMemo(() => {
        return detectedCollisions.reduce((acc, c) => {
            if (c.stream === 'All Streams' && c.allocations.length === 1) {
                const cMatch = courses.find(course => course.id === c.allocations[0].courseId || course.name === c.allocations[0].className);
                const cStreams = cMatch ? getClassStreams(cMatch) : [];
                return acc + Math.max(0, cStreams.length - 1);
            }
            return acc + (c.allocations.length - 1);
        }, 0);
    }, [detectedCollisions, courses]);

    // Move single allocation to another slot
    const handleMoveAllocToSlot = async (alloc: RemedialAllocation, targetDay: string, targetStart: string, targetEnd: string) => {
        try {
            const isWeekend = ['Saturday', 'Sunday'].includes(targetDay);
            const updated: RemedialAllocation = {
                ...alloc,
                dayOfWeek: targetDay as any,
                startTime: targetStart,
                endTime: targetEnd,
                isWeekend,
                isUnallocated: false,
                unallocatedReason: undefined,
                updatedAt: new Date().toISOString()
            };
            if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                await (apiService as any).saveRemedialAllocation(updated);
            } else {
                await apiService.saveModuleRecord('school_remedial_allocations', updated);
            }
            onLogAction?.(`Moved ${alloc.subjectName} allocation to ${targetDay} (${targetStart} - ${targetEnd})`);
            alert(`Moved ${alloc.subjectName} to ${targetDay} ${targetStart} - ${targetEnd}!`);
            setMultiAllocCellItems(prev => {
                if (!prev) return null;
                const remaining = prev.allocations.filter(a => a.id !== alloc.id);
                if (remaining.length <= 1) return null;
                return { ...prev, allocations: remaining };
            });
            await loadData();
        } catch (err: any) {
            alert('Failed to move allocation: ' + (err as any).message);
        }
    };

    // Move single allocation to unallocated pool
    const handleMoveAllocToUnallocated = async (alloc: RemedialAllocation, reason?: string) => {
        try {
            const updated: RemedialAllocation = {
                ...alloc,
                isUnallocated: true,
                unallocatedReason: reason || 'Manually moved to Unallocated shelf to ensure 1 lesson per period',
                dayOfWeek: 'Unallocated' as any,
                startTime: '',
                endTime: '',
                isWeekend: false,
                updatedAt: new Date().toISOString()
            };
            if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                await (apiService as any).saveRemedialAllocation(updated);
            } else {
                await apiService.saveModuleRecord('school_remedial_allocations', updated);
            }
            onLogAction?.(`Moved ${alloc.subjectName} allocation to Unallocated tab`);
            alert(`Moved ${alloc.subjectName} to Unallocated tab! The timetable slot is now cleared.`);
            setMultiAllocCellItems(prev => {
                if (!prev) return null;
                const remaining = prev.allocations.filter(a => a.id !== alloc.id);
                if (remaining.length <= 1) return null;
                return { ...prev, allocations: remaining };
            });
            await loadData();
        } catch (err: any) {
            alert('Failed to move to unallocated: ' + (err as any).message);
        }
    };

    // Auto-Spread overlapping lessons across unoccupied periods
    const handleAutoSpreadOverlaps = async (specificAllocationsToSpread?: RemedialAllocation[]) => {
        let targetsToResolve: { original: RemedialAllocation; others: RemedialAllocation[] }[] = [];

        if (specificAllocationsToSpread && specificAllocationsToSpread.length > 1) {
            targetsToResolve = [{
                original: specificAllocationsToSpread[0],
                others: specificAllocationsToSpread.slice(1)
            }];
        } else if (detectedCollisions.length > 0) {
            targetsToResolve = detectedCollisions.map(col => {
                if (col.stream === 'All Streams' && col.allocations.length === 1) {
                    const orig = col.allocations[0];
                    const cMatch = courses.find(c => c.id === orig.courseId || c.name === orig.className);
                    const cStreams = cMatch ? getClassStreams(cMatch) : [];
                    if (cStreams.length > 1) {
                        const stream0Alloc: RemedialAllocation = {
                            ...orig,
                            stream: cStreams[0],
                            updatedAt: new Date().toISOString()
                        };
                        const otherStreamAllocs: RemedialAllocation[] = cStreams.slice(1).map((s, sIdx) => ({
                            ...orig,
                            id: `rem_alloc_${Date.now()}_split_${sIdx}_${Math.random().toString(36).substr(2, 4)}`,
                            stream: s,
                            isAutoGenerated: true,
                            is_auto_generated: true,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }));
                        return {
                            original: stream0Alloc,
                            others: otherStreamAllocs
                        };
                    }
                }
                return {
                    original: col.allocations[0],
                    others: col.allocations.slice(1)
                };
            });
        } else {
            alert('No overlapping timetable sessions found to resolve.');
            return;
        }

        const totalToMove = targetsToResolve.reduce((acc, t) => acc + t.others.length, 0);
        const confirmMsg = 
            `Auto-Spread & Resolve Timetable Overlaps?\n\n` +
            `• Overlapping Lessons & Multi-Stream Clashes to Resolve: ${totalToMove}\n` +
            `• Rule: Exactly 1 lesson per period (apart from joint subjects).\n` +
            `• Multi-Stream Distribution: Separate stream lessons distributed to different days.\n` +
            `• Redistribution: Moves lessons to free periods across Wed, Thu, Fri, Mon, Sat, Sun.\n` +
            `• Safety Fallback: Any lessons with no free slots will be moved to the 'Unallocated' tab.\n\n` +
            `Proceed with auto-spread?`;

        if (!window.confirm(confirmMsg)) return;

        setIsResolvingOverlaps(true);
        try {
            let workingSet = [...allocations];
            const updatedAllocs: RemedialAllocation[] = [];
            let redistributedCount = 0;
            let unallocatedCount = 0;

            // Candidate slots in order of priority:
            // STRICT RULE: Only 1 period per weekday, using the configured evening window.
            const candidateSlots: { day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'; startTime: string; endTime: string; isWeekend: boolean }[] = [
                // Weekday evening window (1 period per day, Mon-Fri)
                { day: 'Tuesday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Wednesday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Thursday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Friday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Monday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },

                // Saturday slots
                { day: 'Saturday', startTime: saturdayStartTime || '08:00', endTime: '09:00', isWeekend: true },
                { day: 'Saturday', startTime: '09:00', endTime: saturdayBreakStartTime || '10:00', isWeekend: true },
                { day: 'Saturday', startTime: saturdayBreakEndTime || '10:30', endTime: '11:30', isWeekend: true },
                { day: 'Saturday', startTime: '11:30', endTime: '12:30', isWeekend: true },
                { day: 'Saturday', startTime: '12:30', endTime: saturdayEndTime || '13:30', isWeekend: true },

                // Sunday slots
                { day: 'Sunday', startTime: sundayStartTime || '09:00', endTime: '10:00', isWeekend: true },
                { day: 'Sunday', startTime: '10:00', endTime: sundayBreakStartTime || '11:00', isWeekend: true },
                { day: 'Sunday', startTime: sundayBreakEndTime || '11:30', endTime: '12:30', isWeekend: true },
                { day: 'Sunday', startTime: '12:30', endTime: sundayEndTime || '13:30', isWeekend: true }
            ];

            for (const target of targetsToResolve) {
                // If original stream was updated (e.g. from 'All Streams' to cStreams[0]), record it
                if (target.original) {
                    const existingOrig = allocations.find(a => a.id === target.original.id);
                    if (!existingOrig || existingOrig.stream !== target.original.stream) {
                        workingSet = workingSet.map(a => a.id === target.original.id ? target.original : a);
                        if (!updatedAllocs.some(a => a.id === target.original.id)) {
                            updatedAllocs.push(target.original);
                        }
                    }
                }

                for (const allocToMove of target.others) {
                    const cMatch = courses.find(c => c.id === allocToMove.courseId || c.name === allocToMove.className);
                    const classId = cMatch?.id || allocToMove.courseId;
                    const className = cMatch?.name || allocToMove.className;

                    let assignedSlot: typeof candidateSlots[0] | null = null;

                    for (const candidate of candidateSlots) {
                        // Class/stream collision check
                        const classBusy = workingSet.some(a => {
                            if (a.id === allocToMove.id) return false;
                            if (a.isUnallocated || a.dayOfWeek === 'Unallocated' || !a.startTime) return false;
                            if (a.dayOfWeek !== candidate.day) return false;
                            const sameCourse = a.courseId === classId || a.className === className;
                            if (!sameCourse) return false;
                            const streamMatch = matchAllocationStream(a, allocToMove.stream) || matchAllocationStream(allocToMove, a.stream);
                            if (!streamMatch) return false;

                            // Strict 1 period per day on weekdays for this stream
                            if (!candidate.isWeekend) {
                                return true;
                            }

                            const aStart = a.startTime || '00:00';
                            const aEnd = a.endTime || '23:59';
                            return (candidate.startTime < aEnd && candidate.endTime > aStart) || (candidate.startTime === aStart);
                        });
                        if (classBusy) continue;

                        // Teacher collision check
                        const teacherBusy = workingSet.some(a => {
                            if (a.id === allocToMove.id) return false;
                            if (a.isUnallocated || a.dayOfWeek === 'Unallocated' || !a.startTime) return false;
                            if (a.teacherId !== allocToMove.teacherId) return false;
                            if (a.dayOfWeek !== candidate.day) return false;
                            const aStart = a.startTime || '00:00';
                            const aEnd = a.endTime || '23:59';
                            return (candidate.startTime < aEnd && candidate.endTime > aStart) || (candidate.startTime === aStart);
                        });
                        if (teacherBusy) continue;

                        // Slot is available!
                        assignedSlot = candidate;
                        break;
                    }

                    if (assignedSlot) {
                        const updated: RemedialAllocation = {
                            ...allocToMove,
                            dayOfWeek: assignedSlot.day,
                            startTime: assignedSlot.startTime,
                            endTime: assignedSlot.endTime,
                            isWeekend: assignedSlot.isWeekend,
                            isUnallocated: false,
                            unallocatedReason: undefined,
                            updatedAt: new Date().toISOString()
                        };
                        workingSet = workingSet.map(a => a.id === updated.id ? updated : a);
                        updatedAllocs.push(updated);
                        redistributedCount++;
                    } else {
                        // NO OPEN SLOT FOUND: Move to Unallocated tab so original period only has 1 lesson!
                        const updated: RemedialAllocation = {
                            ...allocToMove,
                            isUnallocated: true,
                            unallocatedReason: `Moved to Unallocated Tab: All alternative slots on Wed, Thu, Fri, Mon, Sat, Sun were occupied or clashing.`,
                            dayOfWeek: 'Unallocated' as any,
                            startTime: '',
                            endTime: '',
                            isWeekend: false,
                            updatedAt: new Date().toISOString()
                        };
                        workingSet = workingSet.map(a => a.id === updated.id ? updated : a);
                        updatedAllocs.push(updated);
                        unallocatedCount++;
                    }
                }
            }

            // Save to storage / API
            for (const upd of updatedAllocs) {
                if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                    await (apiService as any).saveRemedialAllocation(upd);
                } else {
                    await apiService.saveModuleRecord('school_remedial_allocations', upd);
                }
            }

            onLogAction?.(`Auto-resolved overlaps: ${redistributedCount} redistributed to free periods, ${unallocatedCount} moved to unallocated tab.`);
            
            let summaryMsg = `Timetable Overlaps Resolved Successfully!\n\n`;
            if (redistributedCount > 0) {
                summaryMsg += `• ${redistributedCount} lesson(s) successfully redistributed to open periods.\n`;
            }
            if (unallocatedCount > 0) {
                summaryMsg += `• ${unallocatedCount} extra lesson(s) had no open slots and were safely moved to the 'Unallocated' tab.\n`;
            }
            summaryMsg += `• Result: Every period on the Master Timetable now strictly has 1 subject (apart from joint classes)!`;
            alert(summaryMsg);

            setShowOverlapModal(false);
            setMultiAllocCellItems(null);
            await loadData();
        } catch (err: any) {
            console.error('Error auto-resolving overlaps:', err);
            alert('Failed to resolve overlaps: ' + (err as any).message);
        } finally {
            setIsResolvingOverlaps(false);
        }
    };

    // Auto-Spread all unallocated lessons to open slots
    const handleAutoSpreadUnallocated = async () => {
        if (unallocatedAllocations.length === 0) {
            alert('There are no unallocated lessons to distribute.');
            return;
        }

        setIsResolvingOverlaps(true);
        try {
            let workingSet = [...allocations];
            const updatedAllocs: RemedialAllocation[] = [];
            let placedCount = 0;

            const candidateSlots: { day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'; startTime: string; endTime: string; isWeekend: boolean }[] = [
                // STRICT RULE: Only 1 period per weekday, using the configured evening window.
                { day: 'Tuesday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Wednesday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Thursday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Friday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },
                { day: 'Monday', startTime: weekdayStartTime || '16:00', endTime: weekdayEndTime || '18:00', isWeekend: false },

                // Saturday slots
                { day: 'Saturday', startTime: saturdayStartTime || '08:00', endTime: '09:00', isWeekend: true },
                { day: 'Saturday', startTime: '09:00', endTime: saturdayBreakStartTime || '10:00', isWeekend: true },
                { day: 'Saturday', startTime: saturdayBreakEndTime || '10:30', endTime: '11:30', isWeekend: true },
                { day: 'Saturday', startTime: '11:30', endTime: '12:30', isWeekend: true },
                { day: 'Saturday', startTime: '12:30', endTime: saturdayEndTime || '13:30', isWeekend: true },

                // Sunday slots
                { day: 'Sunday', startTime: sundayStartTime || '09:00', endTime: '10:00', isWeekend: true },
                { day: 'Sunday', startTime: '10:00', endTime: sundayBreakStartTime || '11:00', isWeekend: true },
                { day: 'Sunday', startTime: sundayBreakEndTime || '11:30', endTime: '12:30', isWeekend: true },
                { day: 'Sunday', startTime: '12:30', endTime: sundayEndTime || '13:30', isWeekend: true }
            ];

            for (const allocToMove of unallocatedAllocations) {
                const cMatch = courses.find(c => c.id === allocToMove.courseId || c.name === allocToMove.className);
                const classId = cMatch?.id || allocToMove.courseId;
                const className = cMatch?.name || allocToMove.className;

                let assignedSlot: typeof candidateSlots[0] | null = null;
                for (const candidate of candidateSlots) {
                    const classBusy = workingSet.some(a => {
                        if (a.id === allocToMove.id) return false;
                        if (a.isUnallocated || a.dayOfWeek === 'Unallocated' || !a.startTime) return false;
                        if (a.dayOfWeek !== candidate.day) return false;
                        const sameCourse = a.courseId === classId || a.className === className;
                        if (!sameCourse) return false;
                        const streamMatch = matchAllocationStream(a, allocToMove.stream) || matchAllocationStream(allocToMove, a.stream);
                        if (!streamMatch) return false;

                        // Strict 1 period per day on weekdays for this stream
                        if (!candidate.isWeekend) {
                            return true;
                        }

                        const aStart = a.startTime || '00:00';
                        const aEnd = a.endTime || '23:59';
                        return (candidate.startTime < aEnd && candidate.endTime > aStart) || (candidate.startTime === aStart);
                    });
                    if (classBusy) continue;

                    const teacherBusy = workingSet.some(a => {
                        if (a.id === allocToMove.id) return false;
                        if (a.isUnallocated || a.dayOfWeek === 'Unallocated' || !a.startTime) return false;
                        if (a.teacherId !== allocToMove.teacherId) return false;
                        if (a.dayOfWeek !== candidate.day) return false;
                        const aStart = a.startTime || '00:00';
                        const aEnd = a.endTime || '23:59';
                        return (candidate.startTime < aEnd && candidate.endTime > aStart) || (candidate.startTime === aStart);
                    });
                    if (teacherBusy) continue;

                    assignedSlot = candidate;
                    break;
                }

                if (assignedSlot) {
                    const updated: RemedialAllocation = {
                        ...allocToMove,
                        dayOfWeek: assignedSlot.day,
                        startTime: assignedSlot.startTime,
                        endTime: assignedSlot.endTime,
                        isWeekend: assignedSlot.isWeekend,
                        isUnallocated: false,
                        unallocatedReason: undefined,
                        updatedAt: new Date().toISOString()
                    };
                    workingSet = workingSet.map(a => a.id === updated.id ? updated : a);
                    updatedAllocs.push(updated);
                    placedCount++;
                }
            }

            if (placedCount === 0) {
                alert(`No free collision-free periods were found for the unallocated lessons.\n\nPlease check teacher availability or open additional periods.`);
                return;
            }

            for (const upd of updatedAllocs) {
                if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                    await (apiService as any).saveRemedialAllocation(upd);
                } else {
                    await apiService.saveModuleRecord('school_remedial_allocations', upd);
                }
            }

            onLogAction?.(`Auto-spread allocated ${placedCount} previously unallocated lessons.`);
            alert(`Auto-Spread Complete!\n\n• ${placedCount} lesson(s) placed into open timetable periods.\n• ${unallocatedAllocations.length - placedCount} lesson(s) remain unallocated.`);
            await loadData();
        } catch (err: any) {
            alert('Failed to auto-spread unallocated: ' + (err as any).message);
        } finally {
            setIsResolvingOverlaps(false);
        }
    };

    // Helper to compute correct payout amount for any session (considering Weekday TOD flat rates vs hourly rates)
    const computeSessionPayout = useCallback((s: RemedialSession) => {
        const sHours = s.hours || 1;
        const sDate = new Date(s.date || s.startTime);
        const dayIdx = sDate.getDay();
        const isWeekend = dayIdx === 0 || dayIdx === 6;
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = s.dayOfWeek || dayNames[dayIdx];

        // Check if teacher has a duty record for this session
        const isDuty = s.isDutyLesson || s.is_duty_lesson;
        const dutyRecord = weekendDutyRoster.find(d =>
            d.teacherId === s.teacherId && (
                (d.dutyType === 'weekday' && (d.weekdayDay === dayName || d.weekdayDay?.toLowerCase() === dayName?.toLowerCase())) ||
                (dayIdx === 6 && (d.saturdayAllocated || d.dutyType === 'weekend')) ||
                (dayIdx === 0 && (d.sundayAllocated || d.dutyType === 'weekend'))
            )
        );

        if (isDuty || dutyRecord) {
            const recRate = dutyRecord?.dutyPayRate ?? dutyRecord?.duty_pay_rate;
            const recType = dutyRecord?.dutyPayType || dutyRecord?.duty_pay_type;
            if (recRate !== undefined && recRate !== null) {
                return (recType === 'flat' || dutyRecord?.dutyType === 'weekday')
                    ? Number(recRate)
                    : sHours * Number(recRate);
            }
            if (dutyRecord?.dutyType === 'weekday' || (!isWeekend && isDuty)) {
                // Weekday TOD default flat rate per teacher per day (e.g. 200)
                return weekdayDutyFlatRate || 200;
            }
        }

        if (isWeekend) {
            return sHours * (weekendHourlyRate || 1500);
        }
        return sHours * (weekdayHourlyRate || hourlyRate || 1000);
    }, [weekendDutyRoster, weekdayDutyFlatRate, weekendHourlyRate, weekdayHourlyRate, hourlyRate]);

    // Calculate accrued unpaid earnings per teacher (distinguishing weekday vs weekend rates)
    const accruedPayouts = useMemo(() => {
        const unpaidApproved = sessions.filter(s => s.status === 'Approved');
        const grouped: Record<string, { teacherName: string; totalHours: number; totalAmount: number; sessionIds: string[] }> = {};

        unpaidApproved.forEach(s => {
            if (!grouped[s.teacherId]) {
                grouped[s.teacherId] = {
                    teacherName: s.teacherName || 'Unknown Teacher',
                    totalHours: 0,
                    totalAmount: 0,
                    sessionIds: []
                };
            }
            const sHours = s.hours || 1;
            const sessionAmount = computeSessionPayout(s);
            grouped[s.teacherId].totalHours += sHours;
            grouped[s.teacherId].totalAmount += sessionAmount;
            grouped[s.teacherId].sessionIds.push(s.id);
        });

        return Object.entries(grouped).map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacherName,
            totalHours: data.totalHours,
            sessionIds: data.sessionIds,
            rate: Math.round(data.totalAmount / (data.totalHours || 1)),
            totalAmount: data.totalAmount
        }));
    }, [sessions, hourlyRate, weekdayHourlyRate, weekendHourlyRate, computeSessionPayout]);

    // Stage 4: Batches awaiting Operations Manager Cash Handover to DOS (Pending Operations Payout)
    const pendingOpsHandoverBatches = useMemo(() => {
        const opsSessions = sessions.filter(s => s.status === 'Pending Operations Payout');
        const grouped: Record<string, { teacherName: string; totalHours: number; totalAmount: number; sessionIds: string[] }> = {};
        opsSessions.forEach(s => {
            if (!grouped[s.teacherId]) {
                grouped[s.teacherId] = {
                    teacherName: s.teacherName || 'Unknown Teacher',
                    totalHours: 0,
                    totalAmount: 0,
                    sessionIds: []
                };
            }
            const sHours = s.hours || 1;
            const sessionAmount = computeSessionPayout(s);
            grouped[s.teacherId].totalHours += sHours;
            grouped[s.teacherId].totalAmount += sessionAmount;
            grouped[s.teacherId].sessionIds.push(s.id);
        });
        return Object.entries(grouped).map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacherName,
            totalHours: data.totalHours,
            sessionIds: data.sessionIds,
            rate: Math.round(data.totalAmount / (data.totalHours || 1)),
            totalAmount: data.totalAmount
        }));
    }, [sessions, hourlyRate, weekdayHourlyRate, weekendHourlyRate, computeSessionPayout]);

    // Stage 5: Batches where cash has been issued to DOS, awaiting physical cash handover to teacher & on-screen signature
    const cashIssuedToDosBatches = useMemo(() => {
        const dosSessions = sessions.filter(s => s.status === 'Cash Issued to DOS');
        const grouped: Record<string, { teacherName: string; totalHours: number; totalAmount: number; sessionIds: string[]; cashVoucherRef?: string; operationsManagerName?: string }> = {};
        dosSessions.forEach(s => {
            if (!grouped[s.teacherId]) {
                grouped[s.teacherId] = {
                    teacherName: s.teacherName || 'Unknown Teacher',
                    totalHours: 0,
                    totalAmount: 0,
                    sessionIds: [],
                    cashVoucherRef: s.cashVoucherRef,
                    operationsManagerName: s.operationsDisbursedBy
                };
            }
            const sHours = s.hours || 1;
            const sessionAmount = computeSessionPayout(s);
            grouped[s.teacherId].totalHours += sHours;
            grouped[s.teacherId].totalAmount += sessionAmount;
            grouped[s.teacherId].sessionIds.push(s.id);
            if (s.cashVoucherRef) grouped[s.teacherId].cashVoucherRef = s.cashVoucherRef;
            if (s.operationsDisbursedBy) grouped[s.teacherId].operationsManagerName = s.operationsDisbursedBy;
        });
        return Object.entries(grouped).map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacherName,
            totalHours: data.totalHours,
            sessionIds: data.sessionIds,
            rate: Math.round(data.totalAmount / (data.totalHours || 1)),
            totalAmount: data.totalAmount,
            cashVoucherRef: data.cashVoucherRef,
            operationsManagerName: data.operationsManagerName
        }));
    }, [sessions, hourlyRate, weekdayHourlyRate, weekendHourlyRate, computeSessionPayout]);

    // Issue Payout Voucher
    const handleIssuePayout = async (accrued: any) => {
        if (!window.confirm(`Issue payout voucher for ${accrued.teacherName} of KES ${accrued.totalAmount.toLocaleString()}?`)) return;

        try {
            const payoutId = `pay_${Date.now()}`;
            const payoutData: RemedialPayout = {
                id: payoutId,
                teacherId: accrued.teacherId,
                teacherName: accrued.teacherName,
                totalHours: accrued.totalHours,
                hourlyRate: accrued.rate,
                totalAmount: accrued.totalAmount,
                payoutDate: new Date().toISOString().split('T')[0],
                status: 'Pending',
                institutionId
            };

            // Save payout
            await apiService.saveRemedialPayout(payoutData);

            // Mark sessions as Paid / linked to payout
            for (const sessId of accrued.sessionIds) {
                const sess = sessions.find(s => s.id === sessId);
                if (sess) {
                    await apiService.saveRemedialSession({
                        ...sess,
                        status: 'Paid',
                        payoutId: payoutId
                    });
                }
            }

            onLogAction?.(`Generated pending payout voucher ${payoutId} for ${accrued.teacherName}`);
            alert(`Payout voucher generated! Tell the teacher to sign the voucher anonymously using their portal.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to issue payout');
        }
    };

    // 1. Report: Teacher Payouts Ledger Data
    const reportPayoutsData = useMemo(() => {
        const filtered = (sessions || []).filter(s => {
            const sDate = s.date || s.startTime?.split('T')[0] || '';
            const matchStart = !reportStartDate || !sDate || sDate >= reportStartDate;
            const matchEnd = !reportEndDate || !sDate || sDate <= reportEndDate;
            const matchTeacher = reportTeacherFilter === 'All' || s.teacherId === reportTeacherFilter;
            const matchStatus = reportStatusFilter === 'all' || s.status === reportStatusFilter;
            return matchStart && matchEnd && matchTeacher && matchStatus;
        });

        const teacherMap: Record<string, {
            teacherName: string;
            teacherEmail?: string;
            weekdayHours: number;
            weekendHours: number;
            totalHours: number;
            hourlyRate: number;
            weekendRate: number;
            totalAmount: number;
            status: string;
            sessionCount: number;
        }> = {};

        filtered.forEach(s => {
            const tId = s.teacherId || 'unknown';
            if (!teacherMap[tId]) {
                const u = users.find(user => user.id === tId);
                teacherMap[tId] = {
                    teacherName: s.teacherName || u?.name || 'Unknown Teacher',
                    teacherEmail: u?.email,
                    weekdayHours: 0,
                    weekendHours: 0,
                    totalHours: 0,
                    hourlyRate: weekdayHourlyRate || hourlyRate || 1000,
                    weekendRate: weekendHourlyRate || 1500,
                    totalAmount: 0,
                    status: s.status === 'Paid' ? 'Paid' : (s.status === 'Approved' ? 'Approved' : 'Pending Verification'),
                    sessionCount: 0
                };
            }

            const hrs = s.hours || 1;
            const sDate = new Date(s.date || s.startTime);
            const isWeekend = sDate.getDay() === 0 || sDate.getDay() === 6;

            const sessionAmount = computeSessionPayout(s);

            if (isWeekend) {
                teacherMap[tId].weekendHours += hrs;
            } else {
                teacherMap[tId].weekdayHours += hrs;
            }
            teacherMap[tId].totalAmount += sessionAmount;
            teacherMap[tId].totalHours += hrs;
            teacherMap[tId].sessionCount += 1;
            if (s.status === 'Paid') teacherMap[tId].status = 'Paid';
        });

        return Object.values(teacherMap);
    }, [sessions, reportStartDate, reportEndDate, reportTeacherFilter, reportStatusFilter, weekdayHourlyRate, weekendHourlyRate, hourlyRate, users, weekendDutyRoster]);

    // 2. Report: Prefect QR Audit Trail Data
    const reportPrefectAuditData = useMemo(() => {
        return (sessions || []).filter(s => {
            const sDate = s.date || s.startTime?.split('T')[0] || '';
            const matchStart = !reportStartDate || !sDate || sDate >= reportStartDate;
            const matchEnd = !reportEndDate || !sDate || sDate <= reportEndDate;
            const matchTeacher = reportTeacherFilter === 'All' || s.teacherId === reportTeacherFilter;
            const matchClass = reportClassFilter === 'All' || s.courseId === reportClassFilter;
            const matchStatus = reportStatusFilter === 'all' || s.status === reportStatusFilter;
            return matchStart && matchEnd && matchTeacher && matchClass && matchStatus;
        }).map(s => {
            const course = courses.find(c => c.id === s.courseId);
            return {
                date: s.date || s.startTime?.split('T')[0] || 'N/A',
                subjectName: s.subjectName || 'Remedial Session',
                className: s.className || course?.name || 'Class',
                stream: s.stream || '',
                teacherName: s.teacherName || 'Teacher',
                prefectName: s.prefectName || 'Class Leader',
                qrToken: s.qrToken || (s.courseId ? `prefect_remedial_token_class_${s.courseId}` : ''),
                hours: s.hours || 1,
                status: s.status || 'Pending',
                verifiedAt: s.verifiedAt
            };
        });
    }, [sessions, reportStartDate, reportEndDate, reportTeacherFilter, reportClassFilter, reportStatusFilter, courses]);

    // 3. Report: Student Billing & Arrears Data
    const reportBillingData = useMemo(() => {
        const studentUsers = (users || []).filter(u => u.role === 'student' && (!institutionId || u.institutionId === institutionId));
        return studentUsers.filter(stu => {
            const matchClass = reportClassFilter === 'All' || stu.courseId === reportClassFilter;
            return matchClass;
        }).map(stu => {
            const course = courses.find(c => c.id === stu.courseId);
            const stuInvoices = (invoices || []).filter(inv => inv.studentId === stu.id);
            const remedialInv = stuInvoices.find(inv => 
                (inv.items || []).some(item => (item.description || '').toLowerCase().includes('remedial'))
            ) || stuInvoices[0];

            const totalBilled = remedialInv ? (remedialInv.totalAmount || remedialInv.amount || termFee) : termFee;
            const paid = remedialInv?.status === 'paid' ? totalBilled : 0;
            const balance = Math.max(0, totalBilled - paid);
            const status = balance <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');

            if (reportStatusFilter !== 'all' && status.toLowerCase() !== reportStatusFilter.toLowerCase()) {
                return null;
            }

            return {
                studentName: stu.name,
                className: course?.name || (stu as any).studentClass || 'Class',
                stream: (stu as any).stream || '',
                invoiceNumber: remedialInv?.invoiceNumber || (remedialInv?.id ? `INV-${remedialInv.id.slice(0, 6)}` : '-'),
                termFee: totalBilled,
                paidAmount: paid,
                balance,
                parentPhone: stu.phoneNumber || (stu as any).parentPhone || (stu.metadata as any)?.parentPhone || '-',
                status
            };
        }).filter(Boolean) as Array<{
            studentName: string;
            className: string;
            stream?: string;
            invoiceNumber?: string;
            termFee: number;
            paidAmount: number;
            balance: number;
            parentPhone?: string;
            status: string;
        }>;
    }, [users, courses, invoices, termFee, reportClassFilter, reportStatusFilter, institutionId]);

    // 4. Report: Workload & Subject Distribution Data
    const reportWorkloadData = useMemo(() => {
        const subjectStats: Record<string, {
            subjectName: string;
            priority: string;
            allocatedSessions: number;
            deliveredSessions: number;
            totalHours: number;
            teachers: Set<string>;
        }> = {};

        (allocations || []).forEach(a => {
            const sName = a.subjectName || 'General';
            if (!subjectStats[sName]) {
                const remSub = remedialSubjects.find(rs => rs.subjectName === sName);
                subjectStats[sName] = {
                    subjectName: sName,
                    priority: remSub?.priority || 'Medium',
                    allocatedSessions: 0,
                    deliveredSessions: 0,
                    totalHours: 0,
                    teachers: new Set<string>()
                };
            }
            subjectStats[sName].allocatedSessions += 1;
            if (a.teacherName) subjectStats[sName].teachers.add(a.teacherName);
        });

        (sessions || []).forEach(s => {
            const sName = s.subjectName || 'General';
            if (!subjectStats[sName]) {
                const remSub = remedialSubjects.find(rs => rs.subjectName === sName);
                subjectStats[sName] = {
                    subjectName: sName,
                    priority: remSub?.priority || 'Medium',
                    allocatedSessions: 0,
                    deliveredSessions: 0,
                    totalHours: 0,
                    teachers: new Set<string>()
                };
            }
            subjectStats[sName].deliveredSessions += 1;
            subjectStats[sName].totalHours += (s.hours || 1);
            if (s.teacherName) subjectStats[sName].teachers.add(s.teacherName);
        });

        return Object.values(subjectStats).map(st => ({
            ...st,
            teacherCount: st.teachers.size
        }));
    }, [allocations, sessions, remedialSubjects]);

    // Executive KPI Summaries
    const reportKpis = useMemo(() => {
        const totalDeliveredHours = (sessions || []).reduce((acc, s) => acc + (s.hours || 0), 0);
        const verifiedCount = (sessions || []).filter(s => s.status === 'Prefect Confirmed' || s.status === 'Approved' || s.status === 'Paid').length;
        const totalSessionsCount = sessions?.length || 0;
        const totalAccruedLiability = reportPayoutsData.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
        const totalBilled = reportBillingData.reduce((acc, b) => acc + (b.termFee || 0), 0);
        const totalCollected = reportBillingData.reduce((acc, b) => acc + (b.paidAmount || 0), 0);
        const totalArrears = reportBillingData.reduce((acc, b) => acc + (b.balance || 0), 0);

        return {
            totalDeliveredHours,
            verifiedCount,
            totalSessionsCount,
            verificationRate: totalSessionsCount > 0 ? Math.round((verifiedCount / totalSessionsCount) * 100) : 100,
            totalAccruedLiability,
            totalBilled,
            totalCollected,
            totalArrears
        };
    }, [sessions, reportPayoutsData, reportBillingData]);

    // Report PDF Download Action
    const handleDownloadReportPdf = async () => {
        setIsExporting(true);
        try {
            const filterSummary = `${reportStartDate} to ${reportEndDate}${reportTeacherFilter !== 'All' ? ` | Teacher: ${(users.find(u => u.id === reportTeacherFilter)?.name || reportTeacherFilter)}` : ''}${reportClassFilter !== 'All' ? ` | Class: ${(courses.find(c => c.id === reportClassFilter)?.name || reportClassFilter)}` : ''}`;

            if (selectedReportType === 'master_timetable') {
                const doc = await generateRemedialMasterTimetablePdf({
                    institution: currentInstitution,
                    allocations,
                    courses,
                    users: teachersList,
                    rateSetting,
                    termName: timetableTerm,
                    weekName: timetableWeek,
                    yearName: timetableYear,
                    stageName: timetableStage,
                    saturdayDutyStaff: timetableSatDuty,
                    sundayDutyStaff: timetableSunDuty
                });
                const cleanFileName = `${timetableStage ? `${timetableStage}_` : ''}${timetableWeek.replace(/\s+/g, '_')}_${timetableTerm.replace(/\s+/g, '_')}_${timetableYear}_REMEDIAL_TT.pdf`;
                doc.save(cleanFileName);
                onLogAction?.('Exported Official Remedial Master Timetable PDF');
            } else if (selectedReportType === 'payout_ledger') {
                const doc = await generateTeacherPayoutLedgerPdf({
                    institution: currentInstitution,
                    payoutsData: reportPayoutsData,
                    dateRange: { startDate: reportStartDate, endDate: reportEndDate },
                    rateSetting,
                    filtersSummary: filterSummary
                });
                doc.save(`Remedial_Teacher_Payout_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
                onLogAction?.('Exported Teacher Remedial Payout Ledger PDF');
            } else if (selectedReportType === 'prefect_audit') {
                const doc = await generatePrefectAuditReportPdf({
                    institution: currentInstitution,
                    sessionsData: reportPrefectAuditData,
                    filtersSummary: filterSummary
                });
                doc.save(`Remedial_Prefect_QR_Verification_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
                onLogAction?.('Exported Prefect QR Verification Audit PDF');
            } else if (selectedReportType === 'billing_statement') {
                const doc = await generateStudentBillingReportPdf({
                    institution: currentInstitution,
                    billingData: reportBillingData,
                    filtersSummary: filterSummary
                });
                doc.save(`Remedial_Student_Billing_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
                onLogAction?.('Exported Student Remedial Billing Statement PDF');
            } else if (selectedReportType === 'workload_summary') {
                handlePrintTimetable();
                onLogAction?.('Printed Remedial Workload Timetable');
            }
        } catch (err: any) {
            console.error('PDF export failed:', err);
            alert('Failed to generate report PDF: ' + (err.message || 'Unknown error'));
        } finally {
            setIsExporting(false);
        }
    };

    // Report Excel Export Action
    const handleExportExcel = () => {
        try {
            if (selectedReportType === 'master_timetable') {
                exportRemedialMasterTimetableToExcel({
                    fileName: `${timetableStage ? `${timetableStage}_` : ''}${timetableWeek.replace(/\s+/g, '_')}_${timetableTerm.replace(/\s+/g, '_')}_${timetableYear}_Remedial_Timetable`,
                    allocations,
                    courses,
                    users: teachersList,
                    termName: timetableTerm,
                    weekName: timetableWeek,
                    yearName: timetableYear,
                    saturdayDutyStaff: timetableSatDuty,
                    sundayDutyStaff: timetableSunDuty
                });
                onLogAction?.('Exported Remedial Master Timetable to Excel');
            } else if (selectedReportType === 'payout_ledger') {
                exportRemedialToExcel({
                    fileName: 'Remedial_Teacher_Payout_Ledger',
                    sheetName: 'Teacher Payouts',
                    data: reportPayoutsData.map((p, idx) => ({
                        '#': idx + 1,
                        'Teacher Name': p.teacherName,
                        'Email': p.teacherEmail || '-',
                        'Weekday Hours': p.weekdayHours,
                        'Weekend Hours': p.weekendHours,
                        'Total Hours': p.totalHours,
                        'Tariff Rate (KES)': p.hourlyRate,
                        'Weekend Tariff (KES)': p.weekendRate,
                        'Gross Payable (KES)': p.totalAmount,
                        'Status': p.status,
                        'Sessions Count': p.sessionCount
                    }))
                });
                onLogAction?.('Exported Teacher Remedial Payouts to Excel');
            } else if (selectedReportType === 'prefect_audit') {
                exportRemedialToExcel({
                    fileName: 'Remedial_Prefect_QR_Audit',
                    sheetName: 'Prefect Audit Log',
                    data: reportPrefectAuditData.map((s, idx) => ({
                        '#': idx + 1,
                        'Date': s.date,
                        'Subject': s.subjectName,
                        'Class': s.className,
                        'Stream': s.stream || 'Whole Class',
                        'Teacher': s.teacherName,
                        'Prefect Signer': s.prefectName,
                        'QR Token': s.qrToken,
                        'Hours': s.hours,
                        'Status': s.status
                    }))
                });
                onLogAction?.('Exported Prefect Remedial Audit to Excel');
            } else if (selectedReportType === 'billing_statement') {
                exportRemedialToExcel({
                    fileName: 'Remedial_Student_Billing_Ledger',
                    sheetName: 'Student Billing',
                    data: reportBillingData.map((b, idx) => ({
                        '#': idx + 1,
                        'Student Name': b.studentName,
                        'Class': b.className,
                        'Stream': b.stream || '-',
                        'Invoice Number': b.invoiceNumber,
                        'Term Fee (KES)': b.termFee,
                        'Paid Amount (KES)': b.paidAmount,
                        'Arrears Balance (KES)': b.balance,
                        'Parent Contact': b.parentPhone,
                        'Status': b.status
                    }))
                });
                onLogAction?.('Exported Student Remedial Billing to Excel');
            } else if (selectedReportType === 'workload_summary') {
                exportRemedialToExcel({
                    fileName: 'Remedial_Workload_Subject_Summary',
                    sheetName: 'Subject Workload',
                    data: reportWorkloadData.map((w, idx) => ({
                        '#': idx + 1,
                        'Subject': w.subjectName,
                        'Priority': w.priority,
                        'Allocated Slots': w.allocatedSessions,
                        'Delivered Sessions': w.deliveredSessions,
                        'Delivered Hours': w.totalHours,
                        'Teachers Assigned': w.teacherCount
                    }))
                });
                onLogAction?.('Exported Remedial Workload Summary to Excel');
            }
        } catch (err: any) {
            alert('Failed to export Excel spreadsheet: ' + err.message);
        }
    };


    // QR Code Generation Effect whenever printingPrefect changes
    useEffect(() => {
        if (!printingPrefect) {
            setPrefectQrUrl('');
            return;
        }

        const token = `prefect_remedial_token_class_${printingPrefect.courseId}`;
        let isMounted = true;
        setIsGeneratingQr(true);

        const generateQr = async () => {
            const QRCodeLib = (window as any).QRCode || (window as any).QRCodeLib;
            if (QRCodeLib && typeof QRCodeLib.toDataURL === 'function') {
                try {
                    QRCodeLib.toDataURL(token, {
                        width: 360,
                        margin: 2,
                        errorCorrectionLevel: 'H',
                        color: {
                            dark: '#1e1b4b',
                            light: '#ffffff'
                        }
                    }, (err: any, url: string) => {
                        if (isMounted) {
                            setIsGeneratingQr(false);
                            if (!err && url) {
                                setPrefectQrUrl(url);
                            } else {
                                setPrefectQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
                            }
                        }
                    });
                    return;
                } catch (err) {
                    console.error('QRCode generation error:', err);
                }
            }

            // Fallback if window.QRCode is not yet loaded
            if (isMounted) {
                setIsGeneratingQr(false);
                setPrefectQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`);
            }
        };

        generateQr();

        return () => {
            isMounted = false;
        };
    }, [printingPrefect]);

    // Image loader helper for PDF card generation
    const loadImgAsset = (url: string | null | undefined): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
            let safeUrl = (url || '').trim();
            if (!safeUrl) return resolve(null);
            if (safeUrl.startsWith('data:image/svg+xml;utf8,')) {
                safeUrl = safeUrl.replace('data:image/svg+xml;utf8,', 'data:image/svg+xml;charset=utf-8,');
            }
            const img = new Image();
            if (!safeUrl.startsWith('data:') && !safeUrl.startsWith('blob:')) {
                img.crossOrigin = "Anonymous";
            }
            img.src = safeUrl;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });
    };

    // Download Prefect QR Pass as A6 PDF
    const downloadPrefectCardPdf = async (
        prefect: User, 
        qrDataUrl: string, 
        courseName: string, 
        institutionName: string,
        logoUrl?: string | null
    ) => {
        try {
            const effectiveLogoUrl = logoUrl || currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo || null;
            const logoImg = effectiveLogoUrl ? await loadImgAsset(effectiveLogoUrl) : null;

            const lib = (window as any).jspdf || (window as any).jsPDF;
            const jsPDFClass = lib?.jsPDF || lib || jsPDF;
            const doc = new jsPDFClass({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a6'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Outer double border
            doc.setDrawColor(79, 70, 229);
            doc.setLineWidth(1);
            doc.roundedRect(6, 6, pageWidth - 12, 136, 6, 6, 'S');
            
            doc.setDrawColor(199, 210, 254);
            doc.setLineWidth(0.4);
            doc.roundedRect(8, 8, pageWidth - 16, 132, 4, 4, 'S');

            let yPos = 10;

            // 1. School Logo (if available)
            if (logoImg) {
                const maxLogoW = 15;
                const maxLogoH = 13;
                const aspect = (logoImg.naturalWidth || logoImg.width) > 0 ? (logoImg.naturalHeight || logoImg.height) / (logoImg.naturalWidth || logoImg.width) : 1;
                let logoW = maxLogoW;
                let logoH = logoW * aspect;
                if (logoH > maxLogoH) {
                    logoH = maxLogoH;
                    logoW = logoH / aspect;
                }
                const logoX = (pageWidth - logoW) / 2;
                try {
                    doc.addImage(logoImg, 'PNG', logoX, yPos, logoW, logoH);
                } catch {
                    try {
                        doc.addImage(logoImg, 'JPEG', logoX, yPos, logoW, logoH);
                    } catch (e) {
                        console.warn('Could not render logo in PDF:', e);
                    }
                }
                yPos += logoH + 2.5;
            } else {
                yPos = 15;
            }

            // 2. Institution Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 27, 75);
            const instText = (institutionName || 'School Remedial Program').toUpperCase();
            const maxInstWidth = pageWidth - 24;
            const instLines: string[] = doc.splitTextToSize(instText, maxInstWidth);
            instLines.forEach((l: string) => {
                doc.text(l, pageWidth / 2, yPos, { align: 'center' });
                yPos += 4.5;
            });

            // 3. Badge Pill
            doc.setFontSize(7.5);
            doc.setTextColor(79, 70, 229);
            doc.text('CLASS PREFECT VALIDATION CARD', pageWidth / 2, yPos, { align: 'center' });
            yPos += 3.5;

            // 4. Horizontal Rule
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, yPos, pageWidth - 14, yPos);
            yPos += 4.5;

            // 5. Prefect Name (Auto-fit & wrap to ensure it always fits inside the card)
            const rawName = (prefect.name || 'STUDENT PREFECT').toUpperCase().trim();
            const maxNameWidth = pageWidth - 24; // 81mm within safe card border
            let nameFontSize = 12;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(nameFontSize);

            while (doc.getTextWidth(rawName) > maxNameWidth && nameFontSize > 8) {
                nameFontSize -= 0.5;
                doc.setFontSize(nameFontSize);
            }

            // Split into lines if still exceeding width or containing brackets
            const nameLines: string[] = doc.splitTextToSize(rawName, maxNameWidth);
            doc.setTextColor(15, 23, 42);
            const nameLineHeight = nameFontSize * 0.38 + 1.2;
            nameLines.forEach((line: string) => {
                doc.text(line, pageWidth / 2, yPos, { align: 'center' });
                yPos += nameLineHeight;
            });
            yPos += 1;

            // 6. Stream Name
            doc.setFontSize(8.5);
            doc.setTextColor(79, 70, 229);
            doc.text(`STREAM: ${(courseName || 'Class').toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 4;

            // 7. QR Code Image
            const qrSource = qrDataUrl || prefectQrUrl;
            // Compute available vertical space for QR Code dynamically
            const maxQrSize = Math.min(48, Math.max(38, 134 - 30 - yPos));
            if (qrSource) {
                const qrX = (pageWidth - maxQrSize) / 2;
                doc.addImage(qrSource, 'PNG', qrX, yPos, maxQrSize, maxQrSize);
            }
            yPos += maxQrSize + 3.5;

            // 8. Token ID
            doc.setFont('courier', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            const tokenStr = `Token: prefect_remedial_token_class_${prefect.courseId}`;
            doc.text(tokenStr, pageWidth / 2, yPos, { align: 'center' });
            yPos += 4;

            // 9. Instructions
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(71, 85, 105);
            doc.text('Scan this QR code to verify session start and end.', pageWidth / 2, yPos, { align: 'center' });
            yPos += 3.5;
            doc.text('Authorized by Academic Administration', pageWidth / 2, yPos, { align: 'center' });

            // 10. Bottom Footer
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(79, 70, 229);
            doc.text('REMEDIAL LESSONS SCAN PASS', pageWidth / 2, 134, { align: 'center' });

            const filename = `Prefect_${prefect.name.replace(/[^a-zA-Z0-9]/g, '_')}_Remedial_QR.pdf`;
            doc.save(filename);
        } catch (err) {
            console.error('Failed to generate prefect QR PDF:', err);
            alert('Failed to generate PDF. Please use the Print option instead.');
        }
    };

    // Print Prefect Card Handler (Direct isolated window or fallback to page print)
    const handlePrintPrefectCard = (prefectToPrint?: User) => {
        const target = prefectToPrint || printingPrefect;
        if (!target) return;

        const courseName = courses.find(c => c.id === target.courseId)?.name || 'Class / Stream';
        const institutionName = currentInstitution?.name || 'School Remedial Program';
        const institutionLogo = currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo || null;
        const tokenId = `prefect_remedial_token_class_${target.courseId}`;
        const qrSrc = prefectQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tokenId)}`;

        const printWindow = window.open('', '_blank', 'width=650,height=750');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Prefect QR Card - ${target.name}</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 15mm;
                        }
                        * {
                            box-sizing: border-box;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            margin: 0;
                            padding: 24px;
                            background: #ffffff;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 90vh;
                        }
                        .card-container {
                            width: 360px;
                            border: 3px double #4338ca;
                            border-radius: 28px;
                            padding: 30px 24px;
                            text-align: center;
                            background: #ffffff;
                            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
                        }
                        .school-logo {
                            width: 52px;
                            height: 52px;
                            object-fit: contain;
                            margin: 0 auto 10px auto;
                            display: block;
                        }
                        .institution-title {
                            font-size: 15px;
                            font-weight: 900;
                            text-transform: uppercase;
                            color: #1e1b4b;
                            letter-spacing: 0.5px;
                            margin: 0 0 6px 0;
                        }
                        .badge-pill {
                            display: inline-block;
                            background: #eef2ff;
                            color: #4338ca;
                            border: 1px solid #c7d2fe;
                            padding: 4px 14px;
                            border-radius: 9999px;
                            font-size: 10px;
                            font-weight: 800;
                            text-transform: uppercase;
                            letter-spacing: 1.5px;
                            margin-bottom: 16px;
                        }
                        .prefect-name {
                            font-size: 16px;
                            font-weight: 900;
                            text-transform: uppercase;
                            color: #0f172a;
                            letter-spacing: -0.5px;
                            margin: 0 auto 4px auto;
                            word-break: break-word;
                            overflow-wrap: break-word;
                            max-width: 95%;
                            line-height: 1.3;
                        }
                        .stream-badge {
                            font-size: 12px;
                            font-weight: 800;
                            color: #4f46e5;
                            text-transform: uppercase;
                            margin: 0 0 16px 0;
                        }
                        .qr-box {
                            width: 200px;
                            height: 200px;
                            margin: 0 auto 16px;
                            padding: 10px;
                            background: #ffffff;
                            border: 2px dashed #cbd5e1;
                            border-radius: 20px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .qr-box img {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                        }
                        .token-badge {
                            display: inline-block;
                            font-family: monospace;
                            font-size: 8.5px;
                            font-weight: 700;
                            color: #64748b;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            padding: 5px 10px;
                            border-radius: 8px;
                            margin-bottom: 14px;
                            word-break: break-all;
                        }
                        .instructions {
                            font-size: 9.5px;
                            color: #475569;
                            line-height: 1.4;
                            border-top: 1px solid #f1f5f9;
                            padding-top: 12px;
                            margin: 0 0 12px 0;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.3px;
                        }
                        .security-footer {
                            font-size: 9px;
                            font-weight: 900;
                            color: #4338ca;
                            letter-spacing: 2px;
                            text-transform: uppercase;
                            margin: 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="card-container">
                        ${institutionLogo ? `<img src="${institutionLogo}" alt="School Logo" class="school-logo" />` : ''}
                        <h2 class="institution-title">${institutionName}</h2>
                        <div class="badge-pill">Class Prefect Card</div>
                        <h3 class="prefect-name">${target.name}</h3>
                        <p class="stream-badge">Stream: ${courseName}</p>
                        <div class="qr-box">
                            <img src="${qrSrc}" alt="Prefect Remedial QR Code" />
                        </div>
                        <div class="token-badge">Token: ${tokenId}</div>
                        <p class="instructions">Scan this QR code using the Remedial Lessons Scanner to authenticate session initiation and completion.</p>
                        <p class="security-footer">Remedial Lessons Scan Pass</p>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.focus();
                                window.print();
                            }, 350);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            // Popup was blocked - fall back to native in-DOM print
            window.print();
        }
    };

    // Open Prefect Card (Preview modal or direct print)
    const printPrefectCard = (prefect: User, autoPrint: boolean = false) => {
        setPrintingPrefect(prefect);
        if (autoPrint) {
            setTimeout(() => {
                handlePrintPrefectCard(prefect);
            }, 350);
        }
    };

    // Print Timetable Handler (Dedicated printable window with official header, 7-day grid, and weekend break)
    const handlePrintTimetable = () => {
        if (selectedReportType === 'master_timetable') {
            const schoolName = String(currentInstitution?.name || 'KIPKEINO SCHOOL').toUpperCase();
            const docTitle = `${timetableStage ? `${timetableStage} ` : ''}${timetableWeek} ${timetableTerm} ${timetableYear} REMEDIAL TT`.toUpperCase();
            const distinctClasses = getDistinctTimetableClasses(allocations, courses);
            const weekdayDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

            // Weekday rows
            const weekdayRowsHtml = distinctClasses.map(cls => `
                <tr>
                    <td style="font-weight:bold;text-align:center;background:#f8fafc;padding:6px;border:1px solid #334155;">${cls.shortCode}</td>
                    ${weekdayDays.map(day => {
                        const matches = allocations.filter(a =>
                            a.dayOfWeek === day &&
                            (a.className === cls.className || a.courseId === cls.className) &&
                            matchAllocationStream(a, cls.stream)
                        );
                        const cell = matches.map(a => {
                            const c = getAscSubjectColor(a.subjectName, a.subjectId);
                            const sCode = getSubjectCode(a.subjectName, a.subjectId);
                            const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                            return `<div style="background:${c.bg};color:${c.text};border:1px solid ${c.border};border-radius:4px;padding:3px 6px;margin:2px auto;font-weight:900;display:inline-block;min-width:44px;box-shadow:0 1px 2px rgba(0,0,0,0.15);"><div style="font-size:10px;line-height:1;text-transform:uppercase;">${sCode}</div><div style="font-size:8px;line-height:1;opacity:0.85;margin-top:2px;">${tCode}</div></div>`;
                        }).join('') || '-';
                        return `<td style="text-align:center;font-weight:600;padding:4px;border:1px solid #334155;">${cell}</td>`;
                    }).join('')}
                </tr>
            `).join('');

            // Saturday slots
            const satSlots = [
                { label: '0800-0900', start: '08:00', end: '09:00', isBreak: false },
                { label: '0900:1000', start: '09:00', end: '10:00', isBreak: false },
                { label: '1000-1030', isBreak: true },
                { label: '1030-1130', start: '10:30', end: '11:30', isBreak: false },
                { label: '1130-1230', start: '11:30', end: '12:30', isBreak: false },
                { label: '1230-1330', start: '12:30', end: '13:30', isBreak: false }
            ];
            const satRowsHtml = distinctClasses.map(cls => `
                <tr>
                    <td style="font-weight:bold;text-align:center;background:#f8fafc;padding:6px;border:1px solid #334155;">${cls.shortCode}</td>
                    ${satSlots.map(slot => {
                        if (slot.isBreak) {
                            return `<td style="text-align:center;font-weight:bold;background:#fef3c7;color:#92400e;padding:6px;border:1px solid #334155;">BREAK</td>`;
                        }
                        const matches = allocations.filter(a =>
                            a.dayOfWeek === 'Saturday' &&
                            (a.className === cls.className || a.courseId === cls.className) &&
                            matchAllocationStream(a, cls.stream) &&
                            (a.startTime && slot.start && slot.end ? a.startTime >= slot.start && a.startTime < slot.end : true)
                        );
                        const cell = matches.map(a => {
                            const c = getAscSubjectColor(a.subjectName, a.subjectId);
                            const sCode = getSubjectCode(a.subjectName, a.subjectId);
                            const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                            return `<div style="background:${c.bg};color:${c.text};border:1px solid ${c.border};border-radius:4px;padding:3px 6px;margin:2px auto;font-weight:900;display:inline-block;min-width:44px;box-shadow:0 1px 2px rgba(0,0,0,0.15);"><div style="font-size:10px;line-height:1;text-transform:uppercase;">${sCode}</div><div style="font-size:8px;line-height:1;opacity:0.85;margin-top:2px;">${tCode}</div></div>`;
                        }).join('') || '-';
                        return `<td style="text-align:center;font-weight:600;padding:4px;border:1px solid #334155;">${cell}</td>`;
                    }).join('')}
                </tr>
            `).join('');

            // Sunday slots
            const sunSlots = [
                { label: '9:30-1100', start: '09:30', end: '11:00', isBreak: false },
                { label: '11:00-11:30', isBreak: true },
                { label: '11:30-1:00', start: '11:30', end: '13:00', isBreak: false }
            ];
            const sunRowsHtml = distinctClasses.map(cls => `
                <tr>
                    <td style="font-weight:bold;text-align:center;background:#f8fafc;padding:6px;border:1px solid #334155;">${cls.shortCode}</td>
                    ${sunSlots.map(slot => {
                        if (slot.isBreak) {
                            return `<td style="text-align:center;font-weight:bold;background:#fef3c7;color:#92400e;padding:6px;border:1px solid #334155;">BREAK</td>`;
                        }
                        const matches = allocations.filter(a =>
                            a.dayOfWeek === 'Sunday' &&
                            (a.className === cls.className || a.courseId === cls.className) &&
                            matchAllocationStream(a, cls.stream) &&
                            (a.startTime && slot.start && slot.end ? a.startTime >= slot.start && a.startTime < slot.end : true)
                        );
                        const cell = matches.map(a => {
                            const c = getAscSubjectColor(a.subjectName, a.subjectId);
                            const sCode = getSubjectCode(a.subjectName, a.subjectId);
                            const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                            return `<div style="background:${c.bg};color:${c.text};border:1px solid ${c.border};border-radius:4px;padding:3px 6px;margin:2px auto;font-weight:900;display:inline-block;min-width:44px;box-shadow:0 1px 2px rgba(0,0,0,0.15);"><div style="font-size:10px;line-height:1;text-transform:uppercase;">${sCode}</div><div style="font-size:8px;line-height:1;opacity:0.85;margin-top:2px;">${tCode}</div></div>`;
                        }).join('') || '-';
                        return `<td style="text-align:center;font-weight:600;padding:4px;border:1px solid #334155;">${cell}</td>`;
                    }).join('')}
                </tr>
            `).join('');

            // Legend
            const subjectMap = new Map<string, string>();
            const teacherMap = new Map<string, string>();
            allocations.forEach(a => {
                const sCode = getSubjectCode(a.subjectName, a.subjectId);
                if (sCode && a.subjectName) subjectMap.set(sCode, a.subjectName);
                const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                if (tCode && a.teacherName) teacherMap.set(tCode, a.teacherName);
            });
            const subEntries = Array.from(subjectMap.entries());
            const teachEntries = Array.from(teacherMap.entries());
            const maxRows = Math.max(subEntries.length, teachEntries.length);
            let legendHtml = '';
            for (let i = 0; i < maxRows; i++) {
                const sub = subEntries[i];
                const teach = teachEntries[i];
                legendHtml += `
                    <tr>
                        <td style="font-weight:bold;padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">${sub ? sub[0] : ''}</td>
                        <td style="padding:4px 8px;border:1px solid #cbd5e1;">${sub ? sub[1] : ''}</td>
                        <td style="font-weight:bold;padding:4px 8px;border:1px solid #cbd5e1;text-align:center;">${teach ? teach[0] : ''}</td>
                        <td style="padding:4px 8px;border:1px solid #cbd5e1;">${teach ? teach[1] : ''}</td>
                    </tr>
                `;
            }

            const printWindow = window.open('', '_blank', 'width=1150,height=800');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8" />
                        <title>${docTitle}</title>
                        <style>
                            @page { size: A4 portrait; margin: 10mm; }
                            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 12px; color: #0f172a; font-size: 11px; }
                            .title-box { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
                            .school-title { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; margin: 0 0 4px 0; text-transform: uppercase; }
                            .doc-title { font-size: 13px; font-weight: 800; color: #334155; margin: 0; text-transform: uppercase; }
                            .sub-heading { font-size: 11px; font-weight: 900; margin: 12px 0 4px 0; text-transform: uppercase; color: #0f172a; }
                            table.tt-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #334155; font-size: 10px; }
                            table.tt-table th, table.tt-table td { border: 1px solid #334155; padding: 5px; text-align: center; }
                            table.tt-table th { background: #f1f5f9; font-weight: 900; text-transform: uppercase; font-size: 9.5px; }
                            .legend-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; border: 1px solid #cbd5e1; }
                            .legend-table th, .legend-table td { border: 1px solid #cbd5e1; padding: 3px 6px; }
                            .legend-table th { background: #f8fafc; font-weight: 800; font-size: 9px; }
                            .sig-block { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; }
                            .sig-col { text-align: center; width: 190px; }
                            .sig-line { border-top: 1.5px solid #0f172a; margin-top: 30px; padding-top: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                        </style>
                    </head>
                    <body>
                        <div class="title-box">
                            <h1 class="school-title">${schoolName}</h1>
                            <h2 class="doc-title">${docTitle}</h2>
                        </div>

                        <!-- Table 1: Weekdays -->
                        <table class="tt-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px;"></th>
                                    <th>MONDAY</th>
                                    <th>TUESDAY</th>
                                    <th>WEDNESDAY</th>
                                    <th>THURSDAY</th>
                                    <th>FRIDAY</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${weekdayRowsHtml}
                            </tbody>
                        </table>

                        <!-- Table 2: Saturday -->
                        <div class="sub-heading">SATURDAY – DUTY ${timetableSatDuty}</div>
                        <table class="tt-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px;"></th>
                                    ${satSlots.map(s => `<th>${s.label}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${satRowsHtml}
                            </tbody>
                        </table>

                        <!-- Table 3: Sunday -->
                        <div class="sub-heading">SUNDAY - DUTY ${timetableSunDuty}</div>
                        <table class="tt-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px;"></th>
                                    ${sunSlots.map(s => `<th>${s.label}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${sunRowsHtml}
                            </tbody>
                        </table>

                        <!-- Table 4: Staff & Subject Legend -->
                        <div class="sub-heading">STAFF &amp; SUBJECT REFERENCE KEY</div>
                        <table class="legend-table">
                            <thead>
                                <tr>
                                    <th style="width: 15%;">SUBJECT CODE</th>
                                    <th style="width: 35%;">SUBJECT NAME</th>
                                    <th style="width: 15%;">STAFF CODE</th>
                                    <th style="width: 35%;">TEACHER NAME</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${legendHtml}
                            </tbody>
                        </table>

                        <!-- Official Certification Block -->
                        <div class="sig-block">
                            <div class="sig-col">
                                <div class="sig-line">Director of Studies</div>
                                <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Sign &amp; Date</div>
                            </div>
                            <div class="sig-col">
                                <div class="sig-line">Remedial Coordinator</div>
                                <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Sign &amp; Date</div>
                            </div>
                            <div class="sig-col">
                                <div class="sig-line">Principal / Headteacher</div>
                                <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Official Stamp &amp; Seal</div>
                            </div>
                        </div>

                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.focus();
                                    window.print();
                                }, 350);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                window.print();
            }
            return;
        }

        // ── CLASS TIMETABLE PRINTOUT (PER-CLASS aSc GRID) ──
        const schoolName = String(currentInstitution?.name || 'KIPKEINO SCHOOL').toUpperCase();
        const docYear = timetableYear || new Date().getFullYear();
        const docTerm = timetableTerm || 'TERM 1';
        const docWeek = timetableWeek || 'WEEK 1';

        // Authentic subject color scheme matching aSc Timetables template
        const getPrintAscSubjectColor = (subjectName?: string, subjectId?: string) => {
            const code = getSubjectCode(subjectName, subjectId).toUpperCase();
            if (code === 'ENG') return { bg: '#facc15', text: '#000000' }; // Bright Yellow
            if (code === 'MAT') return { bg: '#d946ef', text: '#000000' }; // Vivid Magenta
            if (code === 'KIS') return { bg: '#1d4ed8', text: '#ffffff' }; // Royal Blue
            if (code === 'CHE') return { bg: '#22c55e', text: '#000000' }; // Grass Green
            if (code === 'BIO') return { bg: '#38bdf8', text: '#000000' }; // Sky Blue
            if (code === 'PHY') return { bg: '#bae6fd', text: '#000000' }; // Pale Ice Blue
            if (code === 'HIST') return { bg: '#1e40af', text: '#ffffff' }; // Deep Navy Blue
            if (code === 'GEO') return { bg: '#d9f99d', text: '#000000' }; // Lime Yellow-Green
            if (code === 'CRE') return { bg: '#f97316', text: '#ffffff' }; // Warm Orange
            if (code === 'IRE') return { bg: '#f59e0b', text: '#000000' }; // Amber
            if (code === 'AGRI' || code === 'AGR') return { bg: '#fb7185', text: '#000000' }; // Coral Red
            if (code === 'HS') return { bg: '#c026d3', text: '#ffffff' }; // Deep Rose Magenta
            if (code === 'CS') return { bg: '#86efac', text: '#000000' }; // Mint Pale Green
            if (code === 'BST') return { bg: '#10b981', text: '#000000' }; // Emerald Green
            if (code === 'FRE' || code === 'GER') return { bg: '#818cf8', text: '#ffffff' }; // Indigo
            if (code === 'CA' || code === 'MUSIC') return { bg: '#f472b6', text: '#000000' }; // Pink
            return getAscSubjectColor(subjectName, subjectId);
        };

        // 10 Period slots matching the exact school timetable structure in the photo
        const standardSlots = [
            { periodNum: 1, label: '1', timeRange: '6:00 - 7:00', start: '06:00', end: '07:00', isBreak: false },
            { periodNum: 2, label: '2', timeRange: '7:20 - 8:20', start: '07:20', end: '08:20', isBreak: false },
            { periodNum: 3, label: '3', timeRange: '8:20 - 9:20', start: '08:20', end: '09:20', isBreak: false },
            { periodNum: 0, label: 'BREAK', timeRange: '9:20 - 9:30', start: '09:20', end: '09:30', isBreak: true, breakText: 'SHORT BREAK' },
            { periodNum: 4, label: '4', timeRange: '9:30 - 10:30', start: '09:30', end: '10:30', isBreak: false },
            { periodNum: 0, label: 'LONG BREAK', timeRange: '10:30 - 11:00', start: '10:30', end: '11:00', isBreak: true, breakText: 'LONG BREAK' },
            { periodNum: 5, label: '5', timeRange: '11:00 - 12:00', start: '11:00', end: '12:00', isBreak: false },
            { periodNum: 6, label: '6', timeRange: '12:00 - 13:00', start: '12:00', end: '13:00', isBreak: false },
            { periodNum: 0, label: 'LUNCH BREAK', timeRange: '13:00 - 14:00', start: '13:00', end: '14:00', isBreak: true, breakText: 'LUNCH' },
            { periodNum: 7, label: '7', timeRange: '14:00 - 15:00', start: '14:00', end: '15:00', isBreak: false },
            { periodNum: 8, label: '8', timeRange: '15:00 - 16:00', start: '15:00', end: '16:00', isBreak: false },
            { periodNum: 9, label: '9', timeRange: `${weekdayStartTime || '17:00'} - ${weekdayEndTime || '18:00'}`, start: weekdayStartTime || '16:00', end: weekdayEndTime || '18:00', isBreak: false },
            { periodNum: 10, label: '10', timeRange: '18:30 - 19:30', start: '18:30', end: '19:30', isBreak: false }
        ];

        // Determine list of classes to print
        let classesToRender: { id: string; name: string; stream: string }[] = [];
        if (selectedTimetableClass === 'All') {
            const distinct = getDistinctTimetableClasses(allocations, courses);
            classesToRender = distinct.map(d => ({
                id: d.className,
                name: d.className,
                stream: d.stream || 'All Streams'
            }));
            if (classesToRender.length === 0) {
                classesToRender = courses.map(c => ({ id: c.id, name: c.name, stream: 'All Streams' }));
            }
        } else {
            const courseObj = courses.find(c => c.id === selectedTimetableClass);
            classesToRender = [{
                id: selectedTimetableClass,
                name: courseObj?.name || selectedTimetableClass,
                stream: selectedTimetableStream || 'All Streams'
            }];
        }

        // Helper to match an allocation to a period slot
        const matchAllocToSlot = (a: RemedialAllocation, slot: typeof standardSlots[0]) => {
            if (slot.isBreak || !a.startTime) return false;
            const aStart = a.startTime.trim();
            if (aStart === slot.start) return true;
            if (slot.start && slot.end && aStart >= slot.start && aStart < slot.end) return true;
            if (slot.periodNum === 1 && (aStart.startsWith('06:') || aStart.startsWith('6:'))) return true;
            if (slot.periodNum === 2 && (aStart.startsWith('07:') || aStart.startsWith('7:'))) return true;
            if (slot.periodNum === 3 && (aStart.startsWith('08:') || aStart.startsWith('8:'))) return true;
            if (slot.periodNum === 4 && (aStart.startsWith('09:') || aStart.startsWith('9:') || aStart.startsWith('10:0'))) return true;
            if (slot.periodNum === 5 && aStart.startsWith('11:')) return true;
            if (slot.periodNum === 6 && aStart.startsWith('12:')) return true;
            if (slot.periodNum === 7 && aStart.startsWith('14:')) return true;
            if (slot.periodNum === 8 && aStart.startsWith('15:')) return true;
            if (slot.periodNum === 9 && (aStart.startsWith('16:') || aStart.startsWith('17:'))) return true;
            if (slot.periodNum === 10 && (aStart.startsWith('18:') || aStart.startsWith('19:'))) return true;
            return false;
        };

        // Render cell box content
        const renderGridCell = (matches: RemedialAllocation[]) => {
            if (!matches || matches.length === 0) {
                return '<div style="width:100%;height:100%;min-height:72px;background:#ffffff;"></div>';
            }

            // 1 Lesson: Solid Color Box with bold centered code and bottom-right teacher code
            if (matches.length === 1) {
                const a = matches[0];
                const c = getPrintAscSubjectColor(a.subjectName, a.subjectId);
                const sCode = getSubjectCode(a.subjectName, a.subjectId);
                const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                const isJoint = !!(a.isJoint || a.is_joint || (a.jointStreams && a.jointStreams.length > 0));

                return `
                    <div style="width:100%;height:100%;min-height:72px;background-color:${c.bg};color:${c.text};position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:2px;overflow:hidden;">
                        ${isJoint ? '<span style="position:absolute;top:2px;left:3px;font-size:7px;font-weight:900;padding:1px 3px;background:rgba(0,0,0,0.2);border-radius:2px;">JOINT</span>' : ''}
                        <span style="font-size:18px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;font-family:Arial,sans-serif;line-height:1;text-align:center;">
                            ${sCode}
                        </span>
                        <span style="position:absolute;right:4px;bottom:3px;font-size:11px;font-weight:bold;font-family:Arial,sans-serif;line-height:1;opacity:0.95;">
                            ${tCode}
                        </span>
                    </div>
                `;
            }

            // 2 Lessons: Diagonal Split Card (SVG Dual Triangles matching image)
            if (matches.length === 2) {
                const a1 = matches[0];
                const a2 = matches[1];
                const c1 = getPrintAscSubjectColor(a1.subjectName, a1.subjectId);
                const c2 = getPrintAscSubjectColor(a2.subjectName, a2.subjectId);
                const code1 = getSubjectCode(a1.subjectName, a1.subjectId);
                const code2 = getSubjectCode(a2.subjectName, a2.subjectId);
                const tCode1 = getTeacherCode(a1.teacherId, a1.teacherName, enrichedUsers);
                const tCode2 = getTeacherCode(a2.teacherId, a2.teacherName, enrichedUsers);

                return `
                    <div style="width:100%;height:100%;min-height:72px;position:relative;overflow:hidden;">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;min-height:72px;display:block;">
                            <!-- Top-Right Triangle -->
                            <polygon points="0,0 100,0 100,100" fill="${c1.bg}" />
                            <!-- Bottom-Left Triangle -->
                            <polygon points="0,0 0,100 100,100" fill="${c2.bg}" />
                            <!-- Diagonal dividing line -->
                            <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" stroke-width="1.5" />
                            <!-- Subject 1 Top-Right -->
                            <text x="73" y="32" fill="${c1.text}" font-size="15" font-weight="900" text-anchor="middle" font-family="Arial, sans-serif">${code1}</text>
                            <text x="76" y="52" fill="${c1.text}" font-size="9.5" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif">${tCode1}</text>
                            <!-- Subject 2 Bottom-Left -->
                            <text x="27" y="68" fill="${c2.text}" font-size="15" font-weight="900" text-anchor="middle" font-family="Arial, sans-serif">${code2}</text>
                            <text x="30" y="88" fill="${c2.text}" font-size="9.5" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif">${tCode2}</text>
                        </svg>
                    </div>
                `;
            }

            // 3+ Lessons: Horizontal Stacked Slices (matching image Tuesday period 4)
            return `
                <div style="width:100%;height:100%;min-height:72px;display:flex;flex-direction:column;overflow:hidden;">
                    ${matches.map((a, idx) => {
                        const c = getPrintAscSubjectColor(a.subjectName, a.subjectId);
                        const code = getSubjectCode(a.subjectName, a.subjectId);
                        const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                        const isLast = idx === matches.length - 1;
                        return `
                            <div style="flex:1;background-color:${c.bg};color:${c.text};border-bottom:${isLast ? 'none' : '1px solid #000000'};display:flex;align-items:center;justify-content:space-between;padding:1px 4px;box-sizing:border-box;">
                                <span style="font-size:11px;font-weight:900;font-family:Arial,sans-serif;line-height:1;">${code}</span>
                                <span style="font-size:9px;font-weight:bold;font-family:Arial,sans-serif;line-height:1;">${tCode}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };

        // Generate full HTML page for each class
        const pagesHtml = classesToRender.map(cls => {
            const classAllocs = allocations.filter(a => {
                const matchCourse = a.courseId === cls.id || a.className === cls.name || a.courseId === cls.name;
                const matchStream = !cls.stream || cls.stream === 'All Streams' || matchAllocationStream(a, cls.stream);
                return matchCourse && matchStream && !a.isUnallocated && a.dayOfWeek !== 'Unallocated';
            });

            // Days to display (Mo - Fr by default; add Sa, Su if allocations exist)
            const hasSat = classAllocs.some(a => a.dayOfWeek === 'Saturday');
            const hasSun = classAllocs.some(a => a.dayOfWeek === 'Sunday');
            const activeDays: { full: string; code: string }[] = [
                { full: 'Monday', code: 'Mo' },
                { full: 'Tuesday', code: 'Tu' },
                { full: 'Wednesday', code: 'We' },
                { full: 'Thursday', code: 'Th' },
                { full: 'Friday', code: 'Fr' },
            ];
            if (hasSat) activeDays.push({ full: 'Saturday', code: 'Sa' });
            if (hasSun) activeDays.push({ full: 'Sunday', code: 'Su' });

            // Build grid rows
            const rowsHtml = activeDays.map((day, dayIdx) => {
                let cellsHtml = `
                    <td style="width:55px;min-width:55px;background:#ffffff;border:1.5px solid #000000;text-align:center;vertical-align:middle;padding:0;">
                        <div style="font-size:28px;font-weight:900;font-family:Arial,sans-serif;color:#000000;line-height:1;">
                            ${day.code}
                        </div>
                    </td>
                `;

                standardSlots.forEach(slot => {
                    if (slot.isBreak) {
                        // Spans across all day rows with rotated vertical text on row 0
                        if (dayIdx === 0) {
                            cellsHtml += `
                                <td rowspan="${activeDays.length}" style="width:36px;min-width:34px;max-width:40px;background:#ffffff;border:1.5px solid #000000;text-align:center;vertical-align:middle;padding:0;">
                                    <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:20px;font-weight:900;letter-spacing:5px;text-transform:uppercase;color:#000000;font-family:Arial,sans-serif;white-space:nowrap;margin:0 auto;">
                                        ${slot.breakText || 'BREAK'}
                                    </div>
                                </td>
                            `;
                        }
                    } else {
                        // Lesson Cell
                        const matches = classAllocs.filter(a => a.dayOfWeek === day.full && matchAllocToSlot(a, slot));
                        cellsHtml += `
                            <td style="border:1.5px solid #000000;padding:0;margin:0;vertical-align:middle;height:72px;min-height:72px;">
                                ${renderGridCell(matches)}
                            </td>
                        `;
                    }
                });

                return `<tr style="height:72px;min-height:72px;">${cellsHtml}</tr>`;
            }).join('');

            // Staff & Subject Legend for this class
            const subMap = new Map<string, string>();
            const tMap = new Map<string, string>();
            classAllocs.forEach(a => {
                const sCode = getSubjectCode(a.subjectName, a.subjectId);
                if (sCode && a.subjectName) subMap.set(sCode, a.subjectName);
                const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                if (tCode && a.teacherName) tMap.set(tCode, a.teacherName);
            });

            const subArr = Array.from(subMap.entries());
            const tArr = Array.from(tMap.entries());
            const maxL = Math.max(subArr.length, tArr.length);
            let legendRows = '';
            for (let i = 0; i < maxL; i++) {
                const s = subArr[i];
                const t = tArr[i];
                legendRows += `
                    <tr>
                        <td style="font-weight:900;border:1px solid #000000;padding:3px 6px;text-align:center;">${s ? s[0] : ''}</td>
                        <td style="border:1px solid #000000;padding:3px 6px;">${s ? s[1] : ''}</td>
                        <td style="font-weight:900;border:1px solid #000000;padding:3px 6px;text-align:center;">${t ? t[0] : ''}</td>
                        <td style="border:1px solid #000000;padding:3px 6px;">${t ? t[1] : ''}</td>
                    </tr>
                `;
            }

            return `
                <div class="class-page">
                    <!-- Top Header -->
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;border-bottom:2px solid #000000;padding-bottom:6px;">
                        <div>
                            <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:0;letter-spacing:0.5px;font-family:Arial,sans-serif;color:#000000;">
                                ${schoolName}
                            </h1>
                            <div style="font-size:14px;font-weight:800;text-transform:uppercase;color:#1e293b;margin-top:2px;font-family:Arial,sans-serif;">
                                CLASS: ${cls.name} ${cls.stream && cls.stream !== 'All Streams' ? `(${cls.stream})` : ''} &bull; REMEDIAL TIMETABLE
                            </div>
                        </div>
                        <div style="text-align:right;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#334155;">
                            <div>${docWeek} &bull; ${docTerm} ${docYear}</div>
                            <div style="font-size:10px;color:#64748b;margin-top:2px;">Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                    </div>

                    <!-- Timetable Matrix Grid -->
                    <table style="width:100%;border-collapse:collapse;border:2px solid #000000;table-layout:fixed;margin-bottom:12px;">
                        <thead>
                            <tr style="background:#ffffff;border-bottom:2px solid #000000;">
                                <th style="width:55px;min-width:55px;border:1.5px solid #000000;padding:4px 2px;"></th>
                                ${standardSlots.map(slot => `
                                    <th style="border:1.5px solid #000000;${slot.isBreak ? 'width:36px;min-width:34px;max-width:40px;' : ''}padding:4px 2px;text-align:center;vertical-align:middle;background:#ffffff;">
                                        <div style="font-size:13px;font-weight:900;font-family:Arial,sans-serif;color:#000000;line-height:1;">
                                            ${slot.label}
                                        </div>
                                        <div style="font-size:8.5px;font-weight:normal;color:#333333;font-family:Arial,sans-serif;margin-top:3px;white-space:nowrap;">
                                            ${slot.timeRange}
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <!-- Legend & Signatures -->
                    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-top:8px;">
                        <div>
                            <div style="font-weight:900;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;color:#000000;font-family:Arial,sans-serif;">
                                STAFF &amp; SUBJECT REFERENCE KEY
                            </div>
                            <table style="width:100%;border-collapse:collapse;border:1px solid #000000;font-size:9px;font-family:Arial,sans-serif;">
                                <thead>
                                    <tr style="background:#f8fafc;border-bottom:1px solid #000000;">
                                        <th style="width:14%;padding:2px 4px;border:1px solid #000000;text-align:center;">CODE</th>
                                        <th style="width:36%;padding:2px 4px;border:1px solid #000000;text-align:left;">SUBJECT</th>
                                        <th style="width:14%;padding:2px 4px;border:1px solid #000000;text-align:center;">TEACHER</th>
                                        <th style="width:36%;padding:2px 4px;border:1px solid #000000;text-align:left;">NAME</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${legendRows || '<tr><td colspan="4" style="text-align:center;padding:4px;color:#64748b;">No allocated subjects recorded</td></tr>'}
                                </tbody>
                            </table>
                        </div>

                        <!-- Certification Signatures -->
                        <div style="display:flex;flex-direction:column;justify-content:space-between;">
                            <div style="display:flex;justify-content:space-between;gap:10px;margin-top:auto;">
                                <div style="text-align:center;flex:1;">
                                    <div style="border-top:1.5px solid #000000;margin-top:35px;padding-top:3px;font-size:9.5px;font-weight:800;text-transform:uppercase;font-family:Arial,sans-serif;">
                                        Director of Studies
                                    </div>
                                    <div style="font-size:8px;color:#64748b;margin-top:1px;">Sign &amp; Date</div>
                                </div>
                                <div style="text-align:center;flex:1;">
                                    <div style="border-top:1.5px solid #000000;margin-top:35px;padding-top:3px;font-size:9.5px;font-weight:800;text-transform:uppercase;font-family:Arial,sans-serif;">
                                        Principal / Head
                                    </div>
                                    <div style="font-size:8px;color:#64748b;margin-top:1px;">Official Stamp &amp; Seal</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const printWindow = window.open('', '_blank', 'width=1150,height=800');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Remedial Timetable - ${schoolName}</title>
                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 8mm 10mm;
                        }
                        * {
                            box-sizing: border-box;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            margin: 0;
                            padding: 8px;
                            background: #ffffff;
                            color: #000000;
                        }
                        .class-page {
                            page-break-after: always;
                            break-after: page;
                            padding: 4px 0 16px 0;
                        }
                        .class-page:last-child {
                            page-break-after: avoid;
                            break-after: avoid;
                        }
                        table {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    </style>
                </head>
                <body>
                    ${pagesHtml}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.focus();
                                window.print();
                            }, 350);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            window.print();
        }
    };
    
    // Parent Billing Calculations (Term Fee billing)
    const billingSummary = useMemo(() => {
        const students = users.filter(u => u.role === 'student' && u.institutionId === institutionId);
        return students.map(student => {
            const course = courses.find(c => c.id === student.courseId);
            const studentInvoices = invoices.filter(inv => inv.studentId === student.id);
            const isInvoiced = studentInvoices.some(inv => 
                inv.items.some(item => item.description.includes('Term Remedial Fee'))
            );
            
            return {
                studentId: student.id,
                studentName: student.name,
                className: course?.name || 'Stream',
                isInvoiced,
                amount: termFee
            };
        });
    }, [users, courses, invoices, termFee, institutionId]);

    // Generate Term Fee Invoice for single Student
    const handleBillParent = async (studentId: string, studentName: string, className: string) => {
        try {
            const invoiceId = `inv_${Date.now()}`;
            const newInvoice: any = {
                id: invoiceId,
                invoiceNumber: `REMEDIAL-${Date.now().toString().slice(-6)}`,
                institutionId,
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days due
                items: [{
                    description: `Term Remedial Fee (Flat fee billed at start of term)`,
                    quantity: 1,
                    unitPrice: termFee,
                    amount: termFee
                }],
                totalAmount: termFee,
                status: 'pending',
                studentId,
                className
            };

            await apiService.saveModuleRecord('invoices', newInvoice);
            onLogAction?.(`Generated term remedial fee invoice of KES ${termFee} for ${studentName}`);
            loadData();
        } catch (err: any) {
            console.error('Failed to generate invoice for ' + studentName, err);
            throw err;
        }
    };

    // Bulk bill all students not yet billed
    const handleBulkBillParents = async () => {
        const unbilled = billingSummary.filter(b => !b.isInvoiced);
        if (unbilled.length === 0) {
            alert('All students have already been invoiced for the term.');
            return;
        }

        if (!window.confirm(`Generate term remedial fee invoices (KES ${termFee}) for ${unbilled.length} student(s)?`)) return;

        let successCount = 0;
        for (const student of unbilled) {
            try {
                // Generate invoice using core method (it handles saving & logging)
                const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newInvoice: any = {
                    id: invoiceId,
                    invoiceNumber: `REMEDIAL-${Date.now().toString().slice(-6)}-${successCount}`,
                    institutionId,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    items: [{
                        description: `Term Remedial Fee (Flat fee billed at start of term)`,
                        quantity: 1,
                        unitPrice: termFee,
                        amount: termFee
                    }],
                    totalAmount: termFee,
                    status: 'pending',
                    studentId: student.studentId,
                    className: student.className
                };

                await apiService.saveModuleRecord('invoices', newInvoice);
                onLogAction?.(`Generated term remedial fee invoice of KES ${termFee} for ${student.studentName}`);
                successCount++;
            } catch (e) {
                console.error(e);
            }
        }

        alert(`Successfully generated term remedial fee invoices for ${successCount} student(s).`);
        loadData();
    };

    return (
        <>
        <div className="space-y-8 animate-fade-in mt-4">
            
            {/* Futuristic Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            Academic Intervention Control
                        </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase">Remedial Manager</h2>
                    <p className="text-xs text-slate-300 max-w-xl font-medium">
                        Oversee extra lesson verification, automated QR prefect signatures, teacher disbursement calculations, and parent remedial billing.
                    </p>
                </div>
                
                {/* Quick Launcher Action */}
                <div className="relative z-10 flex items-center gap-3 shrink-0">
                    <button 
                        onClick={() => setShowLogModal(true)}
                        className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 flex items-center gap-2 border border-indigo-400/30"
                    >
                        <Plus className="w-4 h-4" /> Log Extra Hours
                    </button>
                </div>
            </div>

            {/* Main Workspace Layout with Futuristic Vertical Menu */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Futuristic Vertical Menu Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-2.5 sticky top-6">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 mb-2 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation Hub</p>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase mt-0.5">Control Center</h4>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></span>
                        </div>

                        {/* Top Subscription Expiry Banner */}
                        <SubscriptionExpiryBanner
                            institution={currentInstitution}
                        />

                        {/* TEACHERS TAB (Before Remedial Hours) */}
                        <button 
                            onClick={() => setActiveTab('teachers')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'teachers' 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'teachers' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Teachers</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'teachers' ? 'text-emerald-100' : 'text-slate-400'}`}>Teacher codes &amp; allocations</p>
                                </div>
                            </div>
                            {teachersList.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'teachers' ? 'bg-white text-emerald-700' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                    {teachersList.length}
                                </span>
                            )}
                        </button>

                        {/* PREFECTS & SECRETARIES TAB (Directly after Teachers) */}
                        <button 
                            onClick={() => setActiveTab('prefects')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'prefects' 
                                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'prefects' ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Prefects &amp; Secretaries</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'prefects' ? 'text-blue-100' : 'text-slate-400'}`}>Class &amp; stream leaders</p>
                                </div>
                            </div>
                            {prefectsList.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'prefects' ? 'bg-white text-blue-700' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                }`}>
                                    {prefectsList.length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('sessions')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'sessions' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Remedial Hours</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'sessions' ? 'text-indigo-100' : 'text-slate-400'}`}>Session logs & QR verify</p>
                                </div>
                            </div>
                            {sessions.filter(s => s.status === 'Prefect Confirmed').length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'sessions' ? 'bg-white text-indigo-700' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                }`}>
                                    {sessions.filter(s => s.status === 'Prefect Confirmed').length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('allocations')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'allocations' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'allocations' ? 'bg-white/20 text-white' : 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Subject Allocations</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'allocations' ? 'text-indigo-100' : 'text-slate-400'}`}>Teacher assignments &amp; timetable</p>
                                </div>
                            </div>
                            {allocations.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'allocations' ? 'bg-white text-indigo-700' : 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400'
                                }`}>
                                    {allocations.length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('subjects')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'subjects' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'subjects' ? 'bg-white/20 text-white' : 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Remedial Subjects</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'subjects' ? 'text-indigo-100' : 'text-slate-400'}`}>Subject registry &amp; status</p>
                                </div>
                            </div>
                            {remedialSubjects.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'subjects' ? 'bg-white text-indigo-700' : 'bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400'
                                }`}>
                                    {remedialSubjects.filter(rs => rs.isActive !== false).length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('payouts')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'payouts' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'payouts' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Teacher Payouts</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'payouts' ? 'text-indigo-100' : 'text-slate-400'}`}>Accrued pay & sign off</p>
                                </div>
                            </div>
                            {accruedPayouts.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'payouts' ? 'bg-white text-indigo-700' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    {accruedPayouts.length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('billing')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'billing' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'billing' ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Parent Billing</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'billing' ? 'text-indigo-100' : 'text-slate-400'}`}>Invoicing & term billing</p>
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab('rates')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'rates' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'rates' ? 'bg-white/20 text-white' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Rates & Rules</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'rates' ? 'text-indigo-100' : 'text-slate-400'}`}>Tariffs & configs</p>
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab('portal_hub')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'portal_hub' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'portal_hub' ? 'bg-white/20 text-white' : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Portal Hub</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'portal_hub' ? 'text-indigo-100' : 'text-slate-400'}`}>Public link & QR share</p>
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab('reports')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'reports' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'reports' ? 'bg-white/20 text-white' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <BarChart3 className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Remedial Reports</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'reports' ? 'text-indigo-100' : 'text-slate-400'}`}>Audits, ledger &amp; exports</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                activeTab === 'reports' ? 'bg-white text-indigo-700' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                            }`}>
                                PDF / XLS
                            </span>
                        </button>

                    </div>
                </div>

                {/* Right Main Content Workspace */}
                <div className="lg:col-span-9 min-w-0">

            {/* TAB: TEACHERS ALLOCATION & CODES (Placed before Remedial Hours) */}
            {activeTab === 'teachers' && (
                <div className="space-y-6">
                    {/* Header Controls */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-500" /> Teachers Allocation &amp; Timetable Codes
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                    DOS Management Hub
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 max-w-2xl">
                                Assign remedial subjects, manage teacher allocations per class/stream, and customize teacher codes (e.g. 01, 02, TR-01) displayed on the master remedial timetable and reports.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={handleAutoNumberTeacherCodes}
                                className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                title="Auto-assign sequential 2-digit codes (01, 02, 03...) to teachers missing a code"
                            >
                                <Zap className="w-4 h-4" /> Auto-Number Codes (01, 02...)
                            </button>
                            <button
                                onClick={() => handleOpenCreateAllocation()}
                                className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Allocate Subject
                            </button>
                            <button
                                onClick={() => setActiveTab('allocations')}
                                className="flex-1 md:flex-none px-4 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-4 h-4" /> Master Timetable Grid
                            </button>
                        </div>
                    </div>

                    {/* Stats Overview Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Teachers</span>
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                                    <Users className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{teachersList.length}</p>
                            <p className="text-[10px] text-slate-400 font-bold">Registered teaching faculty</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Allocations</span>
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {teachersList.filter(t => allocations.some(a => a.teacherId === t.id)).length}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">Teachers with remedial slots</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Unassigned Faculty</span>
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                                    <UserX className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {teachersList.filter(t => !allocations.some(a => a.teacherId === t.id)).length}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">Available for remedial classes</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">Weekly Remedial Slots</span>
                                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                                    <Calendar className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{allocations.length}</p>
                            <p className="text-[10px] text-slate-400 font-bold">Total scheduled lessons / week</p>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by teacher name, code (01, 02), email..."
                                value={teacherSearchQuery}
                                onChange={e => setTeacherSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-6 py-2.5 text-xs font-bold outline-none focus:border-emerald-600 transition-all dark:text-white"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            {(['all', 'allocated', 'unallocated', 'weekend'] as const).map(tabKey => (
                                <button
                                    key={tabKey}
                                    onClick={() => setTeacherAllocationFilter(tabKey)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        teacherAllocationFilter === tabKey
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {tabKey === 'all' && `All (${teachersList.length})`}
                                    {tabKey === 'allocated' && `Allocated (${teachersList.filter(t => allocations.some(a => a.teacherId === t.id)).length})`}
                                    {tabKey === 'unallocated' && `Unassigned (${teachersList.filter(t => !allocations.some(a => a.teacherId === t.id)).length})`}
                                    {tabKey === 'weekend' && 'Weekend Staff'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Teacher Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTeachers.map(teacher => {
                            const teacherAllocs = allocations.filter(a => a.teacherId === teacher.id);
                            const currentCode = teacherCodes[teacher.id] || getTeacherCode(teacher.id, teacher.name, teachersList);
                            const isEditingCode = editingTeacherCodeId === teacher.id;
                            const completedHours = sessions
                                .filter(s => s.teacherId === teacher.id && (s.status === 'Approved' || s.status === 'Paid'))
                                .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration || 60) / 60, 0);
                            const pendingHours = sessions
                                .filter(s => s.teacherId === teacher.id && s.status === 'Prefect Confirmed')
                                .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration || 60) / 60, 0);

                            return (
                                <div
                                    key={teacher.id}
                                    className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-5 space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                                >
                                    {/* Card Header: Teacher Profile & Code Editor */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                                                {teacher.name ? teacher.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'TR'}
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                                                    {teacher.name}
                                                </h5>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {teacher.email || teacher.phoneNumber || 'Staff Member'}
                                                </p>
                                                {teacher.expertise && teacher.expertise.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {teacher.expertise.slice(0, 3).map((exp, eIdx) => (
                                                            <span key={eIdx} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                                {exp}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Teacher Code Pill / Inline Editor */}
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                                Teacher Code
                                            </span>
                                            {isEditingCode ? (
                                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-emerald-500">
                                                    <input
                                                        type="text"
                                                        value={tempTeacherCode}
                                                        onChange={e => setTempTeacherCode(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSaveTeacherCode(teacher.id, tempTeacherCode);
                                                            if (e.key === 'Escape') setEditingTeacherCodeId(null);
                                                        }}
                                                        placeholder="01, 02..."
                                                        autoFocus
                                                        maxLength={10}
                                                        className="w-16 px-2 py-1 text-xs font-mono font-black uppercase text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none border border-slate-300 dark:border-slate-700"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveTeacherCode(teacher.id, tempTeacherCode)}
                                                        className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                                                        title="Save Code"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingTeacherCodeId(null)}
                                                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 transition-colors cursor-pointer"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingTeacherCodeId(teacher.id);
                                                        setTempTeacherCode(currentCode);
                                                    }}
                                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-xs uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-sm cursor-pointer"
                                                    title="Click to edit teacher code (e.g. 01, 02, TR-01)"
                                                >
                                                    <span>{currentCode || 'NO CODE'}</span>
                                                    <Pencil className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle Section: Allocated Remedial Subjects & Classes */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3 text-violet-500" /> Remedial Allocations ({teacherAllocs.length})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenCreateAllocationForTeacher(teacher.id)}
                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" /> Add Slot
                                            </button>
                                        </div>

                                        {teacherAllocs.length > 0 ? (
                                            <div className="space-y-2">
                                                {teacherAllocs.map(alloc => (
                                                    <div
                                                        key={alloc.id}
                                                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[11px]">
                                                                    {getSubjectCode(alloc.subjectName, alloc.subjectId)}
                                                                </span>
                                                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                                                    {alloc.subjectName}
                                                                </span>
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                                                                    {alloc.className || courses.find(c => c.id === alloc.courseId)?.name || 'Class'}
                                                                    {alloc.stream && alloc.stream !== 'All Streams' ? ` • ${alloc.stream}` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-2">
                                                                <span>{alloc.dayOfWeek}</span>
                                                                <span>•</span>
                                                                <span>{alloc.startTime || '16:00'} - {alloc.endTime || '18:00'}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditAllocation(alloc)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                                                                title="Edit allocation"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteAllocation(alloc.id)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                                                title="Remove allocation"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-4 px-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-900/30">
                                                <p className="text-[11px] font-bold text-slate-400">No remedial lessons assigned yet</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenCreateAllocationForTeacher(teacher.id)}
                                                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline uppercase cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" /> Assign first class
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer: Teaching Load & Quick Actions */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Hours Taught</span>
                                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                                <span className="font-black text-emerald-600 dark:text-emerald-400">{completedHours.toFixed(1)}h</span> approved
                                                {pendingHours > 0 && <span className="text-amber-500 ml-1">({pendingHours.toFixed(1)}h pending)</span>}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenCreateAllocationForTeacher(teacher.id)}
                                            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Allocate
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredTeachers.length === 0 && (
                            <div className="col-span-full bg-white dark:bg-slate-800 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">No Teachers Found</h4>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                        No teaching staff match your current search or filter criteria. Check your filters or ensure teachers are registered in your institution.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: PREFECTS & CLASS SECRETARIES PER CLASS AND STREAM */}
            {activeTab === 'prefects' && (
                <div className="space-y-6">
                    {/* Header Controls Banner */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Prefects &amp; Class Secretaries Hub
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                    Class &amp; Stream Leaders
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 max-w-2xl">
                                Appoint and manage student leaders (Class Prefects, Class Secretaries, Assistant Prefects) per class and stream. These leaders hold QR verification cards to validate and authorize teachers' remedial sessions.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            {/* View Mode Toggle */}
                            <div className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl flex items-center border border-slate-200/60 dark:border-slate-800">
                                <button
                                    onClick={() => setPrefectViewMode('matrix')}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        prefectViewMode === 'matrix' 
                                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                    title="Class & Stream Matrix View"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> Matrix View
                                </button>
                                <button
                                    onClick={() => setPrefectViewMode('list')}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        prefectViewMode === 'list' 
                                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                    title="Directory List View"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Directory
                                </button>
                            </div>

                            {/* Print All Cards */}
                            <button
                                onClick={handlePrintAllPrefectsCards}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                                title="Bulk Print All Prefect & Secretary QR Badges"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print All QR Badges</span>
                            </button>

                            {/* Assign Leader Button */}
                            <button
                                onClick={() => handleOpenAssignLeaderModal()}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Appoint Leader</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Appointed</p>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{prefectStats.total}</h4>
                                <p className="text-[9px] font-bold text-slate-500">Student leaders active</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class Prefects</p>
                                <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{prefectStats.prefectsCount}</h4>
                                <p className="text-[9px] font-bold text-slate-500">Lead verifiers</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class Secretaries</p>
                                <h4 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{prefectStats.secretariesCount}</h4>
                                <p className="text-[9px] font-bold text-slate-500">Attendance records</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                                <LayoutGrid className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Classes Covered</p>
                                <h4 className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                                    {prefectStats.classesCovered} / {courses.length || 1}
                                </h4>
                                <p className="text-[9px] font-bold text-slate-500">{prefectStats.streamsCovered} streams with leaders</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by student, class, stream, or adm no..."
                                value={prefectSearchQuery}
                                onChange={e => setPrefectSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                            />
                            {prefectSearchQuery && (
                                <button
                                    onClick={() => setPrefectSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            {/* Class Filter */}
                            <select
                                value={prefectClassFilter}
                                onChange={e => setPrefectClassFilter(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                            >
                                <option value="All">All Classes</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            {/* Role Filter Pills */}
                            <div className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl flex items-center border border-slate-200/60 dark:border-slate-800">
                                <button
                                    onClick={() => setPrefectRoleFilter('All')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        prefectRoleFilter === 'All' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    All Roles
                                </button>
                                <button
                                    onClick={() => setPrefectRoleFilter('prefect')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        prefectRoleFilter === 'prefect' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Prefects
                                </button>
                                <button
                                    onClick={() => setPrefectRoleFilter('secretary')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        prefectRoleFilter === 'secretary' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Secretaries
                                </button>
                                <button
                                    onClick={() => setPrefectRoleFilter('other')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        prefectRoleFilter === 'other' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Other
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* VIEW MODE 1: MATRIX VIEW (Organized Per Class and Stream) */}
                    {prefectViewMode === 'matrix' && (
                        <div className="space-y-8">
                            {courses
                                .filter(course => prefectClassFilter === 'All' || course.id === prefectClassFilter)
                                .map(course => {
                                    const classStreams = getClassStreams(course);
                                    const classLeaders = prefectsList.filter(p => p.courseId === course.id || (p.className && p.className.trim().toLowerCase() === course.name.trim().toLowerCase()));

                                    return (
                                        <div key={course.id} className="bg-white dark:bg-slate-800/90 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
                                            {/* Class Header Banner */}
                                            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20 border-b border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/30">
                                                        <GraduationCap className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                                {course.name}
                                                            </h3>
                                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                                                {classStreams.length} {classStreams.length === 1 ? 'Stream' : 'Streams'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                            {classLeaders.length} appointed {classLeaders.length === 1 ? 'leader' : 'leaders'} for this class
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleOpenAssignLeaderModal(course.id)}
                                                    className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> + Appoint For {course.name}
                                                </button>
                                            </div>

                                            {/* Streams Grid */}
                                            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                {classStreams.map(streamName => {
                                                    // Find appointed leaders for this class & stream
                                                    const streamLeaders = classLeaders.filter(p => {
                                                        const pStream = (p.stream || '').trim().toLowerCase();
                                                        const sName = streamName.trim().toLowerCase();
                                                        if (sName === 'general') return !p.stream || pStream === 'general' || pStream === 'all streams';
                                                        return pStream === sName;
                                                    });

                                                    const prefect = streamLeaders.find(p => {
                                                        const r = (p.leadershipPosition || '').toLowerCase();
                                                        return r.includes('prefect') || r.includes('captain') || r.includes('head');
                                                    });

                                                    const secretary = streamLeaders.find(p => {
                                                        const r = (p.leadershipPosition || '').toLowerCase();
                                                        return r.includes('secretary');
                                                    });

                                                    const otherLeaders = streamLeaders.filter(p => p !== prefect && p !== secretary);

                                                    return (
                                                        <div 
                                                            key={`${course.id}_${streamName}`}
                                                            className="bg-slate-50/70 dark:bg-slate-900/50 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 hover:border-blue-300 dark:hover:border-blue-700/60 transition-all flex flex-col justify-between"
                                                        >
                                                            {/* Stream Title Bar */}
                                                            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                                        Stream: <span className="text-blue-600 dark:text-blue-400">{streamName}</span>
                                                                    </h4>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    {course.name} • {streamName}
                                                                </span>
                                                            </div>

                                                            {/* Two Slots: Class Prefect & Class Secretary */}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                                {/* 1. CLASS PREFECT SLOT */}
                                                                <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[160px] ${
                                                                    prefect 
                                                                        ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/60 shadow-xs' 
                                                                        : 'bg-white/40 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700'
                                                                }`}>
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                                                                <Award className="w-3 h-3" /> Class Prefect
                                                                            </span>
                                                                            {prefect && (
                                                                                <span className="text-[9px] font-mono font-bold text-slate-400">
                                                                                    {prefect.admissionNumber ? `ADM: ${prefect.admissionNumber}` : 'Appointed'}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {prefect ? (
                                                                            <div className="space-y-1">
                                                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-1" title={prefect.rawName || prefect.name}>
                                                                                    {prefect.rawName || prefect.name}
                                                                                </p>
                                                                                <p className="text-[10px] font-bold text-slate-400">
                                                                                    {prefect.phoneNumber || 'No phone registered'}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="py-2 text-center">
                                                                                <p className="text-[11px] font-bold text-slate-400">No Prefect Appointed</p>
                                                                                <p className="text-[9px] text-slate-400/80 mt-0.5">Required for remedial session QR scanning</p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1">
                                                                        {prefect ? (
                                                                            <>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => printPrefectCard(prefect, false)}
                                                                                        className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                                                                        title="Preview QR Card"
                                                                                    >
                                                                                        <Eye className="w-3 h-3" /> Preview
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => printPrefectCard(prefect, true)}
                                                                                        className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] transition-all"
                                                                                        title="Print QR Badge"
                                                                                    >
                                                                                        <Printer className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleOpenAssignLeaderModal(course.id, streamName, 'Class Prefect')}
                                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                                                                        title="Change Prefect"
                                                                                    >
                                                                                        <Pencil className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRevokeLeader(prefect)}
                                                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                                                                        title="Revoke Prefect Role"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleOpenAssignLeaderModal(course.id, streamName, 'Class Prefect')}
                                                                                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                                            >
                                                                                <Plus className="w-3 h-3" /> Appoint Prefect
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 2. CLASS SECRETARY SLOT */}
                                                                <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[160px] ${
                                                                    secretary 
                                                                        ? 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-900/60 shadow-xs' 
                                                                        : 'bg-white/40 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700'
                                                                }`}>
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                                                <FileText className="w-3 h-3" /> Class Secretary
                                                                            </span>
                                                                            {secretary && (
                                                                                <span className="text-[9px] font-mono font-bold text-slate-400">
                                                                                    {secretary.admissionNumber ? `ADM: ${secretary.admissionNumber}` : 'Appointed'}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {secretary ? (
                                                                            <div className="space-y-1">
                                                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-1" title={secretary.rawName || secretary.name}>
                                                                                    {secretary.rawName || secretary.name}
                                                                                </p>
                                                                                <p className="text-[10px] font-bold text-slate-400">
                                                                                    {secretary.phoneNumber || 'No phone registered'}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="py-2 text-center">
                                                                                <p className="text-[11px] font-bold text-slate-400">No Secretary Appointed</p>
                                                                                <p className="text-[9px] text-slate-400/80 mt-0.5">Assists with attendance ledger</p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1">
                                                                        {secretary ? (
                                                                            <>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => printPrefectCard(secretary, false)}
                                                                                        className="px-2 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                                                                        title="Preview QR Card"
                                                                                    >
                                                                                        <Eye className="w-3 h-3" /> Preview
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => printPrefectCard(secretary, true)}
                                                                                        className="p-1.5 bg-slate-100 hover:bg-purple-600 hover:text-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] transition-all"
                                                                                        title="Print QR Badge"
                                                                                    >
                                                                                        <Printer className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleOpenAssignLeaderModal(course.id, streamName, 'Class Secretary')}
                                                                                        className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                                                                        title="Change Secretary"
                                                                                    >
                                                                                        <Pencil className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRevokeLeader(secretary)}
                                                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                                                                        title="Revoke Secretary Role"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleOpenAssignLeaderModal(course.id, streamName, 'Class Secretary')}
                                                                                className="w-full py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                                            >
                                                                                <Plus className="w-3 h-3" /> Appoint Secretary
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Other Leaders Row (if any) */}
                                                            {otherLeaders.length > 0 && (
                                                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Other Stream Leaders:</p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {otherLeaders.map(other => (
                                                                            <div key={other.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                                <span>{other.rawName || other.name} ({other.leadershipPosition})</span>
                                                                                <button
                                                                                    onClick={() => printPrefectCard(other, false)}
                                                                                    className="text-blue-500 hover:text-blue-700"
                                                                                    title="Preview QR Card"
                                                                                >
                                                                                    <Eye className="w-3 h-3" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRevokeLeader(other)}
                                                                                    className="text-slate-400 hover:text-rose-500"
                                                                                    title="Revoke"
                                                                                >
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* VIEW MODE 2: DIRECTORY LIST VIEW */}
                    {prefectViewMode === 'list' && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="py-3.5 px-6">Leader Name</th>
                                            <th className="py-3.5 px-6">Class &amp; Stream</th>
                                            <th className="py-3.5 px-6">Appointed Role</th>
                                            <th className="py-3.5 px-6">Adm No / Contact</th>
                                            <th className="py-3.5 px-6">Remedial QR Token</th>
                                            <th className="py-3.5 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-bold">
                                        {filteredPrefectsList.map(leader => {
                                            const course = courses.find(c => c.id === leader.courseId);
                                            const className = course?.name || leader.className || 'General';
                                            const role = leader.leadershipPosition || 'Class Leader';
                                            const isSecretary = role.toLowerCase().includes('secretary');
                                            const isPrefect = role.toLowerCase().includes('prefect') || role.toLowerCase().includes('captain');
                                            const tokenId = `prefect_remedial_token_class_${leader.courseId || 'general'}${leader.stream ? `_${encodeURIComponent(leader.stream)}` : ''}`;

                                            return (
                                                <tr key={leader.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                                isSecretary 
                                                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                                                                    : (isPrefect ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300')
                                                            }`}>
                                                                {isSecretary ? <FileText className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 dark:text-white uppercase">{leader.rawName || leader.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{leader.email || 'Student Leader'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                            {className} &bull; {leader.stream || 'All Streams'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            isSecretary 
                                                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                                                                : (isPrefect ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300')
                                                        }`}>
                                                            {role}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <p className="text-slate-900 dark:text-white font-mono text-[11px]">{leader.admissionNumber || '-'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{leader.phoneNumber || '-'}</p>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg font-mono text-[9px] text-slate-600 dark:text-slate-400 w-fit">
                                                            <QrCode className="w-3 h-3 text-blue-500 shrink-0" />
                                                            <span className="truncate max-w-[140px]">{tokenId}</span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(tokenId);
                                                                    alert(`Copied token: ${tokenId}`);
                                                                }}
                                                                className="text-slate-400 hover:text-blue-500"
                                                                title="Copy Token"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => printPrefectCard(leader, false)}
                                                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                                                                title="Preview Card"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Preview
                                                            </button>
                                                            <button
                                                                onClick={() => printPrefectCard(leader, true)}
                                                                className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                                                                title="Print QR Badge"
                                                            >
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRevokeLeader(leader)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                                                title="Revoke Appointment"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredPrefectsList.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                                    No student leaders match your current filters. Click "Appoint Leader" to assign class prefects and secretaries.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: ASSIGN / APPOINT CLASS PREFECT OR SECRETARY */}
            {isAssignLeaderModalOpen && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsAssignLeaderModalOpen(false);
                    }}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5" /> Appoint Class Leader / Secretary
                                </h3>
                                <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                                    Assign a student to hold the remedial verification QR card for this class and stream
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAssignLeaderModalOpen(false)}
                                className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form Content */}
                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                            {/* Class & Stream Selectors */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Class / Grade *
                                    </label>
                                    <select
                                        value={leaderModalTargetCourseId}
                                        onChange={e => {
                                            setLeaderModalTargetCourseId(e.target.value);
                                            setLeaderModalTargetStream('');
                                            setLeaderModalSelectedStudentId('');
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                                    >
                                        <option value="">-- Select Class --</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Stream *
                                    </label>
                                    {(() => {
                                        const selectedCourse = courses.find(c => c.id === leaderModalTargetCourseId);
                                        const streams = selectedCourse ? getClassStreams(selectedCourse) : [];
                                        return (
                                            <select
                                                value={leaderModalTargetStream}
                                                onChange={e => {
                                                    setLeaderModalTargetStream(e.target.value);
                                                    setLeaderModalSelectedStudentId('');
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                                            >
                                                <option value="">All Streams (Whole Class)</option>
                                                {streams.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                                <option value="__custom__">+ Custom Stream...</option>
                                            </select>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Custom Stream Input if selected */}
                            {leaderModalTargetStream === '__custom__' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Enter Custom Stream Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. West, Alpha, Yellow..."
                                        value={leaderModalCustomStream}
                                        onChange={e => setLeaderModalCustomStream(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                                    />
                                </div>
                            )}

                            {/* Leadership Role / Title */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Appointed Role / Title *
                                </label>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {['Class Prefect', 'Class Secretary', 'Assistant Class Prefect', 'Academic Secretary'].map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => {
                                                setLeaderModalRole(r);
                                                setLeaderModalCustomRole('');
                                            }}
                                            className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-tight text-left transition-all flex items-center justify-between ${
                                                leaderModalRole === r 
                                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs' 
                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                            }`}
                                        >
                                            <span>{r}</span>
                                            {leaderModalRole === r && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Or type custom title (e.g. Remedial Coordinator)..."
                                        value={leaderModalCustomRole}
                                        onChange={e => {
                                            setLeaderModalCustomRole(e.target.value);
                                            setLeaderModalRole('__custom__');
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Student Search & Picker */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                                    <span>Select Student to Appoint *</span>
                                    <span className="text-slate-400 lowercase font-medium">({modalFilteredStudents.length} candidates)</span>
                                </label>

                                <div className="relative mb-2">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search student by name or adm number..."
                                        value={leaderModalStudentSearch}
                                        onChange={e => setLeaderModalStudentSearch(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                                    />
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                                    {modalFilteredStudents.map(student => {
                                        const isSelected = leaderModalSelectedStudentId === student.id;
                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => {
                                                    setLeaderModalSelectedStudentId(student.id);
                                                    if (student.phoneNumber) setLeaderModalContactPhone(student.phoneNumber);
                                                }}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    isSelected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase leading-none">{student.name}</p>
                                                        <p className={`text-[10px] mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                            {student.admissionNumber ? `Adm: ${student.admissionNumber}` : ''} {student.stream ? `• Stream: ${student.stream}` : ''}
                                                            {student.currentLeadership ? ` • Currently: ${student.currentLeadership}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                                            </div>
                                        );
                                    })}
                                    {modalFilteredStudents.length === 0 && (
                                        <p className="text-center py-6 text-xs text-slate-400">
                                            No students found. Try changing your search query or class selection.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Contact Phone (Optional) */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Contact Phone Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. +254 712 345 678"
                                    value={leaderModalContactPhone}
                                    onChange={e => setLeaderModalContactPhone(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsAssignLeaderModalOpen(false)}
                                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSavingLeader}
                                onClick={handleSaveLeaderAssignment}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                {isSavingLeader ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Confirm &amp; Appoint</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* TAB: REMEDIAL SUBJECTS */}
            {activeTab === 'subjects' && (
                <div className="space-y-6">
                    {/* Header Controls */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-pink-500" /> Remedial Subjects Registry
                            </h4>
                            <p className="text-xs text-slate-500">
                                Configure which subjects are offered for extra remedial tuition. Active subjects will be available for timetable allocations and session logging.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={handleRegisterAllSubjects}
                                className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" /> Register All Subjects
                            </button>
                            <button
                                onClick={handleApplyCoreStemPreset}
                                className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                title="Set Mathematics & Sciences to High Priority (2x/wk), humanities to Medium (1x/wk)"
                            >
                                <Zap className="w-4 h-4" /> Smart STEM &amp; Core Priorities
                            </button>
                            <button
                                onClick={handleOpenCreateSubject}
                                className="flex-1 md:flex-none px-4 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Remedial Subject
                            </button>
                        </div>
                    </div>

                    {/* Search & Stats Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="relative w-full sm:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pink-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search remedial subject..."
                                value={subjectSearchQuery}
                                onChange={e => setSubjectSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-6 py-2.5 text-xs font-bold outline-none focus:border-pink-600 transition-all dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] uppercase font-black">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {remedialSubjects.filter(s => s.isActive !== false).length} Active
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] uppercase font-black">
                                {remedialSubjects.length} Total Registered
                            </span>
                        </div>
                    </div>

                    {/* Subject Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {remedialSubjects
                            .filter(s => s.subjectName.toLowerCase().includes(subjectSearchQuery.toLowerCase()))
                            .map(remSub => {
                                const allocationCount = allocations.filter(a => a.subjectId === remSub.subjectId || a.subjectName === remSub.subjectName).length;
                                return (
                                    <div
                                        key={remSub.id}
                                        className={`p-5 rounded-3xl border transition-all space-y-3 relative group ${
                                            remSub.isActive !== false
                                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-pink-500/50'
                                                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {remSub.subjectName}
                                                </h5>
                                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                    ID: {remSub.subjectId}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleOpenEditSubject(remSub)}
                                                    className="text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 p-1.5 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors"
                                                    title="Edit remedial subject"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRemedialSubject(remSub.id, remSub.subjectName)}
                                                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                    title="Remove remedial subject"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Subject Priority & Frequency Controls */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                                    <Flame className="w-3 h-3 text-rose-500" /> Priority
                                                </label>
                                                <select
                                                    value={remSub.priority || 'Medium'}
                                                    onChange={e => handleUpdateSubjectRule(remSub, { priority: e.target.value as any })}
                                                    className={`w-full text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-xl border outline-none transition-all cursor-pointer ${
                                                        (remSub.priority || 'Medium') === 'High'
                                                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                                                            : (remSub.priority || 'Medium') === 'Medium'
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                                                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                                    }`}
                                                >
                                                    <option value="High">🔥 High</option>
                                                    <option value="Medium">⚡ Medium</option>
                                                    <option value="Low">📘 Low</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-indigo-500" /> Frequency
                                                </label>
                                                <select
                                                    value={remSub.weeklyOccurrences || 1}
                                                    onChange={e => handleUpdateSubjectRule(remSub, { weeklyOccurrences: Number(e.target.value) })}
                                                    className="w-full text-[10px] font-bold px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                                                >
                                                    <option value={1}>1× / week</option>
                                                    <option value={2}>2× / week (Rec.)</option>
                                                    <option value={3}>3× / week</option>
                                                    <option value={4}>4× / week</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Preferred Day Placement */}
                                        <div className="pt-0.5">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                    Day Placement
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-500">
                                                    {remSub.preferredDayType === 'weekends' ? 'Weekends only' : remSub.preferredDayType === 'weekdays' ? 'Weekdays only' : 'Any day'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1">
                                                {(['any', 'weekdays', 'weekends'] as const).map(dt => (
                                                    <button
                                                        key={dt}
                                                        type="button"
                                                        onClick={() => handleUpdateSubjectRule(remSub, { preferredDayType: dt })}
                                                        className={`py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${
                                                            (remSub.preferredDayType || 'any') === dt
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {dt === 'any' ? 'Any' : dt === 'weekdays' ? 'Weekdays' : 'Weekends'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── Scheduling Restrictions ── */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                                            {/* Allowed Days */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Lock className="w-3 h-3 text-rose-400" /> Allowed Days
                                                    </span>
                                                    {(remSub.allowedDays?.length ?? 0) > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateSubjectRule(remSub, { allowedDays: [] })}
                                                            className="text-[8px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider"
                                                        >Clear</button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const).map(day => {
                                                        const isSelected = (remSub.allowedDays || []).includes(day);
                                                        const isWeekend = day === 'Saturday' || day === 'Sunday';
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = remSub.allowedDays || [];
                                                                    const next = isSelected ? current.filter(d => d !== day) : [...current, day as any];
                                                                    handleUpdateSubjectRule(remSub, { allowedDays: next });
                                                                }}
                                                                className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                                                    isSelected
                                                                        ? isWeekend
                                                                            ? 'bg-amber-500 text-white shadow-sm'
                                                                            : 'bg-indigo-600 text-white shadow-sm'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                                }`}
                                                            >
                                                                {day.slice(0, 3)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {(remSub.allowedDays?.length ?? 0) > 0 && (
                                                    <p className="text-[8px] text-rose-500 font-bold mt-0.5">
                                                        ⛔ Restricted to: {(remSub.allowedDays || []).join(', ')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Allowed Periods */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-indigo-400" /> Allowed Periods
                                                    </span>
                                                    {(remSub.allowedPeriods?.length ?? 0) > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateSubjectRule(remSub, { allowedPeriods: [] })}
                                                            className="text-[8px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider"
                                                        >Clear</button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {[1, 2, 3, 4, 5].map(p => {
                                                        const isSelected = (remSub.allowedPeriods || []).includes(p);
                                                        return (
                                                            <button
                                                                key={p}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = remSub.allowedPeriods || [];
                                                                    const next = isSelected ? current.filter(x => x !== p) : [...current, p];
                                                                    handleUpdateSubjectRule(remSub, { allowedPeriods: next });
                                                                }}
                                                                className={`w-8 py-0.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                                                                    isSelected
                                                                        ? 'bg-violet-600 text-white shadow-sm'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                                }`}
                                                            >
                                                                P{p}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {(remSub.allowedPeriods?.length ?? 0) > 0 && (
                                                    <p className="text-[8px] text-violet-600 dark:text-violet-400 font-bold mt-0.5">
                                                        🔒 Period(s): {(remSub.allowedPeriods || []).map(p => `P${p}`).join(', ')} only
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                                                <span>{allocationCount} Timetable Allocation{allocationCount === 1 ? '' : 's'}</span>
                                            </div>

                                            <button
                                                onClick={() => handleToggleSubjectStatus(remSub)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                    remSub.isActive !== false
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${remSub.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                                {remSub.isActive !== false ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        }

                        {remedialSubjects.length === 0 && (
                            <div className="col-span-full bg-white dark:bg-slate-800 p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 text-center space-y-4">
                                <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 text-pink-500 rounded-3xl flex items-center justify-center mx-auto">
                                    <BookOpen className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">No Remedial Subjects Registered</h4>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                        You haven't configured any remedial subjects yet. Register your school subjects to enable remedial allocations and extra session logging.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3 pt-2">
                                    <button
                                        onClick={handleRegisterAllSubjects}
                                        className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:from-pink-700 hover:to-rose-700 transition-all flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" /> Register All School Subjects
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: ALLOCATIONS & TIMETABLE */}
            {/* TAB: ALLOCATIONS & TIMETABLE (Master Timetable Grid Suite) */}
            {activeTab === 'allocations' && (() => {
                const daysForAscGrid: readonly ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = (() => {
                    if (ascDayScope === 'weekdays') return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
                    if (ascDayScope === 'weekend') return ['Saturday', 'Sunday'] as const;
                    if (ascDayScope === 'Saturday') return ['Saturday'] as const;
                    if (ascDayScope === 'Sunday') return ['Sunday'] as const;
                    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
                })();

                const allDistinctClasses = getDistinctTimetableClasses(allocations, courses);
                const filteredClasses = allDistinctClasses.filter(cls => {
                    const matchCourse = selectedTimetableClass === 'All' || 
                        cls.className === selectedTimetableClass || 
                        courses.find(c => c.id === selectedTimetableClass)?.name === cls.className;
                    const matchStream = selectedTimetableStream === 'All' || 
                        cls.stream.toLowerCase().trim() === selectedTimetableStream.toLowerCase().trim();
                    const matchSearch = !ascClassSearchQuery || 
                        cls.shortCode.toLowerCase().includes(ascClassSearchQuery.toLowerCase()) || 
                        cls.className.toLowerCase().includes(ascClassSearchQuery.toLowerCase()) || 
                        cls.stream.toLowerCase().includes(ascClassSearchQuery.toLowerCase());
                    return matchCourse && matchStream && matchSearch;
                });

                // Helper to calculate end time by adding minutes safely
                const addMinutesToTime = (timeStr: string, minutes: number = 60): string => {
                    if (!timeStr) return '';
                    const parts = timeStr.split(':');
                    const h = parseInt(parts[0], 10);
                    const m = parseInt(parts[1] || '0', 10);
                    if (isNaN(h)) return '';
                    const totalMin = h * 60 + m + minutes;
                    const newH = Math.floor((totalMin / 60) % 24);
                    const newM = totalMin % 60;
                    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
                };

                interface AscGridSlot {
                    periodNum: number;
                    startTime: string;
                    endTime: string;
                    label: string;
                    isBreak?: boolean;
                }

                const getAscSlotsForDay = (day: string): AscGridSlot[] => {
                    const isSaturday = day === 'Saturday';
                    const isSunday = day === 'Sunday';

                    if (isSaturday) {
                        const satSlots: AscGridSlot[] = [
                            { periodNum: 1, startTime: saturdayStartTime || '08:00', endTime: '09:00', label: 'P1 (08-09)' },
                            { periodNum: 2, startTime: '09:00', endTime: saturdayBreakStartTime || '10:00', label: 'P2 (09-10)' }
                        ];
                        if (includeSaturdayBreak) {
                            satSlots.push({
                                periodNum: 0,
                                startTime: saturdayBreakStartTime || '10:00',
                                endTime: saturdayBreakEndTime || '10:30',
                                label: 'RECESS',
                                isBreak: true
                            });
                        }
                        satSlots.push(
                            { periodNum: 3, startTime: saturdayBreakEndTime || '10:30', endTime: '11:30', label: 'P3 (10:30-11:30)' },
                            { periodNum: 4, startTime: '11:30', endTime: '12:30', label: 'P4 (11:30-12:30)' },
                            { periodNum: 5, startTime: '12:30', endTime: saturdayEndTime || '13:30', label: 'P5 (12:30-13:30)' }
                        );

                        // Check if any allocations have extra start times
                        allocations.filter(a => a.dayOfWeek === 'Saturday' && a.startTime).forEach(a => {
                            const match = satSlots.some(s => (!s.isBreak && a.startTime && s.startTime && s.endTime && a.startTime >= s.startTime && a.startTime < s.endTime) || a.startTime === s.startTime);
                            if (!match && a.startTime) {
                                const endT = a.endTime || addMinutesToTime(a.startTime, 60);
                                satSlots.push({ periodNum: satSlots.length + 1, startTime: a.startTime, endTime: endT, label: `P${satSlots.length + 1} (${a.startTime}-${endT})` });
                            }
                        });
                        return satSlots;
                    }

                    if (isSunday) {
                        const sunSlots: AscGridSlot[] = [
                            { periodNum: 1, startTime: sundayStartTime || '09:00', endTime: '10:00', label: 'P1 (09-10)' },
                            { periodNum: 2, startTime: '10:00', endTime: sundayBreakStartTime || '11:00', label: 'P2 (10-11)' }
                        ];
                        if (includeSundayBreak) {
                            sunSlots.push({
                                periodNum: 0,
                                startTime: sundayBreakStartTime || '11:00',
                                endTime: sundayBreakEndTime || '11:30',
                                label: 'RECESS',
                                isBreak: true
                            });
                        }
                        sunSlots.push(
                            { periodNum: 3, startTime: sundayBreakEndTime || '11:30', endTime: '12:30', label: 'P3 (11:30-12:30)' },
                            { periodNum: 4, startTime: '12:30', endTime: sundayEndTime || '13:30', label: 'P4 (12:30-13:30)' }
                        );

                        // Check if any allocations have extra start times
                        allocations.filter(a => a.dayOfWeek === 'Sunday' && a.startTime).forEach(a => {
                            const match = sunSlots.some(s => (!s.isBreak && a.startTime && s.startTime && s.endTime && a.startTime >= s.startTime && a.startTime < s.endTime) || a.startTime === s.startTime);
                            if (!match && a.startTime) {
                                const endT = a.endTime || addMinutesToTime(a.startTime, 60);
                                sunSlots.push({ periodNum: sunSlots.length + 1, startTime: a.startTime, endTime: endT, label: `P${sunSlots.length + 1} (${a.startTime}-${endT})` });
                            }
                        });
                        return sunSlots;
                    }

                    // Weekday slots (Mon - Fri)
                    // STRICT RULE: Only 1 period per weekday — always use the configured evening window.
                    // All allocations on this weekday (regardless of startTime) are displayed in this single column.
                    const wStart = weekdayStartTime || '16:00';
                    const wEnd = weekdayEndTime || '18:00';
                    return [
                        {
                            periodNum: 1,
                            startTime: wStart,
                            endTime: wEnd,
                            label: `P1 (${wStart}-${wEnd})`
                        }
                    ];
                };

                const matchAllocsForCell = (cls: { className: string; stream: string }, day: string, slot: AscGridSlot) => {
                    if (slot.isBreak) return [];
                    return allocations.filter(a => {
                        if (a.isUnallocated || a.dayOfWeek === 'Unallocated' || !a.startTime) return false;
                        if (a.dayOfWeek !== day) return false;
                        const matchCourse = a.courseId === cls.className || a.className === cls.className;
                        if (!matchCourse) return false;
                        const matchStream = matchAllocationStream(a, cls.stream);
                        if (!matchStream) return false;

                        // For weekdays: only 1 period column exists, so match ALL allocations on this day
                        const isWeekday = !['Saturday', 'Sunday'].includes(day);
                        if (isWeekday) return true;

                        // For weekends: match by time window as before
                        if (slot.startTime && slot.endTime) {
                            if (a.startTime) {
                                return a.startTime === slot.startTime || (a.startTime >= slot.startTime && a.startTime < slot.endTime);
                            }
                            return true;
                        }
                        if (slot.startTime) {
                            return (a.startTime || '').startsWith(slot.startTime.slice(0, 4)) || a.startTime === slot.startTime;
                        }

                        return true;
                    });
                };

                const renderAscGridCell = (cls: { className: string; stream: string; shortCode: string }, day: string, slot: AscGridSlot) => {
                    if (slot.isBreak) {
                        const startFmt = slot.startTime?.slice(0, 5) || '';
                        const endFmt = slot.endTime?.slice(0, 5) || '';
                        const breakRange = startFmt && endFmt ? `${startFmt} - ${endFmt}` : startFmt;
                        return (
                            <div className="w-full h-full min-h-[56px] bg-amber-100/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex flex-col items-center justify-center border border-dashed border-amber-300/80 dark:border-amber-800/60 rounded select-none">
                                <span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                    <Coffee className="w-2.5 h-2.5 text-amber-600" /> RECESS
                                </span>
                                <span className="text-[7px] font-mono opacity-80 whitespace-nowrap">{breakRange}</span>
                            </div>
                        );
                    }

                    const matches = matchAllocsForCell(cls, day, slot);

                    if (matches.length === 0) {
                        return (
                            <div 
                                onClick={() => handleOpenCreateAllocationForSlot(cls.className, cls.stream, day, slot.startTime, slot.endTime)}
                                className="w-full h-full min-h-[56px] rounded border border-dashed border-slate-200 dark:border-slate-700/60 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-indigo-600 cursor-pointer transition-all group select-none"
                                title={`Click to allocate: ${cls.shortCode} • ${day} • ${slot.startTime || ''}`}
                            >
                                <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        );
                    }

                    if (matches.length === 1) {
                        const alloc = matches[0];
                        const color = getAscSubjectColor(alloc.subjectName, alloc.subjectId);
                        const subCode = getSubjectCode(alloc.subjectName, alloc.subjectId);
                        const tCode = getTeacherCode(alloc.teacherId, alloc.teacherName, enrichedUsers);
                        const isJoint = !!(alloc.isJoint || alloc.is_joint || (alloc.jointStreams && alloc.jointStreams.length > 0));

                        return (
                            <div
                                onClick={() => setSelectedCellAlloc(alloc)}
                                style={{
                                    backgroundColor: color.bg,
                                    color: color.text,
                                    borderColor: color.border,
                                }}
                                className="w-full h-full min-h-[56px] rounded p-1 border shadow-xs hover:shadow-lg relative cursor-pointer hover:scale-[1.04] hover:z-20 transition-all flex flex-col justify-between select-none group"
                                title={`${alloc.subjectName} (${subCode})\nTeacher: ${alloc.teacherName} [Code: ${tCode}]\nClass: ${alloc.className} ${alloc.stream || ''}\nTime: ${alloc.startTime} - ${alloc.endTime}`}
                            >
                                {/* Top Gloss Sheen */}
                                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t" />

                                <div className="flex items-start justify-between relative z-10 leading-none">
                                    <span className="text-[11px] font-black tracking-tight uppercase drop-shadow-xs">
                                        {subCode}
                                    </span>
                                    {isJoint && (
                                        <span className="text-[6.5px] font-black px-1 rounded bg-black/25 text-white uppercase tracking-tighter" title="Joint Stream Lesson">
                                            JT
                                        </span>
                                    )}
                                    {alloc.priority === 'High' && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-white animate-pulse" title="High Priority" />
                                    )}
                                </div>

                                <div className="flex items-end justify-between relative z-10 leading-none mt-auto pt-0.5">
                                    <span className="text-[8.5px] font-black uppercase tracking-tight opacity-90 truncate max-w-[42px]" title={`Teacher Code: ${tCode}`}>
                                        {tCode}
                                    </span>
                                    {alloc.substituteTeacherName && (
                                        <span className="text-[6.5px] font-bold bg-amber-500 text-white px-0.5 rounded" title={`Sub: ${alloc.substituteTeacherName}`}>
                                            SUB
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (matches.length === 2) {
                        const a1 = matches[0];
                        const a2 = matches[1];
                        const c1 = getAscSubjectColor(a1.subjectName, a1.subjectId);
                        const c2 = getAscSubjectColor(a2.subjectName, a2.subjectId);
                        const code1 = getSubjectCode(a1.subjectName, a1.subjectId);
                        const code2 = getSubjectCode(a2.subjectName, a2.subjectId);
                        const tCode1 = getTeacherCode(a1.teacherId, a1.teacherName, enrichedUsers);
                        const tCode2 = getTeacherCode(a2.teacherId, a2.teacherName, enrichedUsers);

                        return (
                            <div
                                onClick={() => setMultiAllocCellItems({
                                    className: cls.className,
                                    stream: cls.stream,
                                    day,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                    allocations: matches
                                })}
                                style={{
                                    background: `linear-gradient(135deg, ${c1.bg} 0%, ${c1.bg} 49%, #0f172a 49.5%, #0f172a 50.5%, ${c2.bg} 51%, ${c2.bg} 100%)`,
                                    borderColor: '#334155'
                                }}
                                className="w-full h-full min-h-[56px] rounded p-1 border shadow-xs hover:shadow-lg relative cursor-pointer hover:scale-[1.04] hover:z-20 transition-all flex flex-col justify-between select-none group"
                                title={`${a1.subjectName} (${code1}) / ${a2.subjectName} (${code2})\nClick to inspect or manage both overlapping lessons`}
                            >
                                <div className="flex justify-between items-start leading-none">
                                    <span style={{ color: c1.text }} className="text-[9.5px] font-black uppercase drop-shadow-xs">
                                        {code1}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end leading-none mt-auto">
                                    <span style={{ color: c1.text }} className="text-[7.5px] font-bold opacity-90">
                                        {tCode1}
                                    </span>
                                    <div className="text-right">
                                        <span style={{ color: c2.text }} className="text-[9.5px] font-black uppercase drop-shadow-xs block">
                                            {code2}
                                        </span>
                                        <span style={{ color: c2.text }} className="text-[7.5px] font-bold opacity-90">
                                            {tCode2}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // 3+ subjects (e.g. multiple lessons crammed into one slot)
                    return (
                        <div 
                            onClick={() => setMultiAllocCellItems({
                                className: cls.className,
                                stream: cls.stream,
                                day,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                                allocations: matches
                            })}
                            className="w-full h-full min-h-[56px] rounded border-2 border-rose-500 shadow-xs hover:shadow-lg overflow-hidden flex flex-col cursor-pointer hover:scale-[1.04] hover:z-20 transition-all relative group"
                            title={`⚠️ Overlap: ${matches.length} lessons in this slot!\nClick to inspect, edit, or auto-spread.`}
                        >
                            <div className="absolute top-0 right-0 z-30 bg-rose-600 text-white font-black text-[6.5px] px-1 rounded-bl shadow-xs flex items-center gap-0.5">
                                <AlertTriangle className="w-2 h-2" /> {matches.length}
                            </div>
                            {matches.map((a, idx) => {
                                const c = getAscSubjectColor(a.subjectName, a.subjectId);
                                const code = getSubjectCode(a.subjectName, a.subjectId);
                                return (
                                    <div 
                                        key={idx} 
                                        style={{ backgroundColor: c.bg, color: c.text }} 
                                        className="flex-1 px-1 flex items-center justify-between text-[7.5px] font-black leading-none border-b last:border-b-0 border-black/20"
                                    >
                                        <span>{code}</span>
                                        <span className="text-[6.5px] opacity-80">{getTeacherCode(a.teacherId, a.teacherName, enrichedUsers)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                };

                const renderAllocCard = (alloc: RemedialAllocation) => {
                    const color = getAscSubjectColor(alloc.subjectName, alloc.subjectId);
                    const subCode = getSubjectCode(alloc.subjectName, alloc.subjectId);
                    const tCode = getTeacherCode(alloc.teacherId, alloc.teacherName, enrichedUsers);
                    const isJoint = !!(alloc.isJoint || alloc.is_joint || (alloc.jointStreams && alloc.jointStreams.length > 0));

                    return (
                        <div 
                            key={alloc.id}
                            style={{ borderLeftColor: color.bg, borderLeftWidth: '4px' }}
                            className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:border-indigo-500/50 transition-all space-y-2"
                        >
                            <div className="flex items-start justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Color Subject Badge */}
                                    <div 
                                        style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                                        className="px-2 py-0.5 rounded border text-[10px] font-black uppercase shadow-2xs select-none"
                                    >
                                        {subCode}
                                    </div>
                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight">{alloc.subjectName}</p>
                                    {alloc.priority === 'High' && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                                            <Flame className="w-2.5 h-2.5 text-rose-500" /> High
                                        </span>
                                    )}
                                    {alloc.priority === 'Medium' && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[8px] font-black uppercase tracking-wider">
                                            Med
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleOpenEditAllocation(alloc)}
                                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md transition-colors opacity-80 group-hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                        title="Edit allocation"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteAllocation(alloc.id)}
                                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors opacity-80 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/40"
                                        title="Delete allocation"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{alloc.className}</p>
                                {alloc.stream && alloc.stream !== 'All Streams' && (
                                    <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-[8px] font-black uppercase tracking-wider">
                                        {alloc.stream}
                                    </span>
                                )}
                                {alloc.stream === 'All Streams' && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">
                                        All Streams
                                    </span>
                                )}
                                {isJoint && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Users className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> Joint Class
                                    </span>
                                )}
                                {alloc.status === 'Substitute Pending' && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-amber-600 animate-spin" /> Sub Pending ({getRemainingMinutes(alloc.confirmationDeadline)}m)
                                    </span>
                                )}
                                {alloc.status === 'Escalated to DOS' && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                        <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Need DOS Sub
                                    </span>
                                )}
                            </div>

                            <div className="space-y-0.5">
                                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                                    <UserCheck className="w-3 h-3 text-slate-400 shrink-0" /> 
                                    <span className={alloc.substituteTeacherName ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                                        {alloc.teacherName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-[8.5px]">
                                        Code: {tCode}
                                    </span>
                                    {alloc.substituteTeacherName && (
                                        <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                                            ↳ {alloc.substituteTeacherName}
                                        </span>
                                    )}
                                </p>
                                {alloc.cancellationReason && (
                                    <p className="text-[8px] text-rose-500 italic truncate" title={alloc.cancellationReason}>
                                        Note: {alloc.cancellationReason}
                                    </p>
                                )}
                            </div>

                            {/* Action Bar */}
                            <div className="pt-1.5 flex items-center justify-between gap-1 flex-wrap">
                                {alloc.status === 'Substitute Pending' && (
                                    <div className="flex items-center gap-1 w-full justify-between">
                                        <button 
                                            onClick={() => handleDosApprovePendingSub(alloc)}
                                            className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                        >
                                            <Check className="w-2.5 h-2.5" /> Confirm
                                        </button>
                                        <button 
                                            onClick={() => handleDosRevertToOriginal(alloc)}
                                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> Revert
                                        </button>
                                    </div>
                                )}
                                {alloc.status === 'Escalated to DOS' && (
                                    <div className="flex items-center gap-1 w-full justify-between">
                                        <button 
                                            onClick={() => handleDosAutoSubstitute(alloc)}
                                            className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                        >
                                            <Sparkles className="w-2.5 h-2.5" /> Auto-Sub
                                        </button>
                                        <button 
                                            onClick={() => { setReassigningAlloc(alloc); setReassignTeacherId(''); }}
                                            className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                        >
                                            <UserPlus className="w-2.5 h-2.5" /> Manual Pick
                                        </button>
                                    </div>
                                )}
                                {(!alloc.status || alloc.status === 'Confirmed') && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleOpenEditAllocation(alloc)}
                                            className="text-[8px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5 transition-colors"
                                        >
                                            <Pencil className="w-2.5 h-2.5" /> Edit
                                        </button>
                                        <button 
                                            onClick={() => { setReassigningAlloc(alloc); setReassignTeacherId(''); }}
                                            className="text-[8px] font-bold text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-0.5 transition-colors"
                                        >
                                            <UserPlus className="w-2.5 h-2.5" /> Reassign
                                        </button>
                                        <button 
                                            onClick={() => handleMoveAllocToUnallocated(alloc)}
                                            className="text-[8px] font-bold text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                                            title="Move this lesson to Unallocated tab"
                                        >
                                            <Archive className="w-2.5 h-2.5" /> Unallocate
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                <span className="text-[9px] font-mono font-bold text-slate-400">
                                    {alloc.startTime} - {alloc.endTime}
                                </span>
                                <span className="text-[8px] font-black uppercase text-slate-400">
                                    {['Saturday', 'Sunday'].includes(alloc.dayOfWeek) ? 'Weekend Tariff' : 'Weekday Tariff'}
                                </span>
                            </div>
                        </div>
                    );
                };

                return (
                    <div className="space-y-6">
                        {/* Header Controls */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-violet-500" /> Remedial Subjects &amp; Class Allocation Timetable
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Master Timetable grid arranged by classes and periods with subject colors, teacher codes, and joint stream sessions.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                {totalOverlappingLessons > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowOverlapModal(true)}
                                        className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                                    >
                                        <AlertTriangle className="w-4 h-4" /> Fix Overlaps ({totalOverlappingLessons})
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsDutyModalOpen(true)}
                                    className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" /> Weekend Duty Roster
                                </button>
                                <button
                                    onClick={handleAutoGenerateTimetable}
                                    className="flex-1 md:flex-none px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" /> Auto-Generate Timetable
                                </button>
                                <button
                                    onClick={handleOpenCreateAllocation}
                                    className="flex-1 md:flex-none px-5 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Manual Allocation
                                </button>
                            </div>
                        </div>

                        {/* OVERLAP DETECTION ALERT BANNER */}
                        {totalOverlappingLessons > 0 && (
                            <div className="bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-rose-500/15 border-2 border-rose-400 dark:border-rose-800 rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-600/30 shrink-0">
                                        <AlertTriangle className="w-6 h-6 animate-bounce" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                Timetable Overlaps Detected
                                            </h5>
                                            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                                                {totalOverlappingLessons} Conflicting Lesson{totalOverlappingLessons === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
                                            Multiple lessons have been allocated into the same period (e.g. {detectedCollisions[0]?.title || 'same slot'}). Click <strong>Auto-Spread Overlaps</strong> to redistribute them across unoccupied periods with zero collisions.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 w-full md:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowOverlapModal(true)}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-slate-500" /> View Overlaps
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isResolvingOverlaps}
                                        onClick={() => handleAutoSpreadOverlaps()}
                                        className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <Sparkles className="w-4 h-4" /> {isResolvingOverlaps ? 'Resolving...' : 'Auto-Spread Overlaps'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TIMETABLE WORKFLOW APPROVAL & DISPERSAL BANNER */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-md p-5 sm:p-6 space-y-4 overflow-hidden relative">
                            {/* Workflow Stepper Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                            Institutional Timetable Workflow
                                        </h5>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            Stage 1: DOS Preparation &bull; Stage 2: Headteacher Review &bull; Stage 3: Dispersal to Teachers
                                        </p>
                                    </div>
                                </div>

                                {/* Current Status Pill */}
                                <div>
                                    {timetableApproval.status === 'approved_dispersed' ? (
                                        <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved &amp; Dispersed
                                        </span>
                                    ) : timetableApproval.status === 'pending_headteacher' ? (
                                        <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs">
                                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Pending Headteacher Approval
                                        </span>
                                    ) : timetableApproval.status === 'revision_requested' ? (
                                        <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-2xs">
                                            <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Revision Requested
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 shadow-2xs">
                                            <Pencil className="w-3.5 h-3.5 text-slate-500" /> Draft (DOS Preparation)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 3-Step Visual Progress Indicator */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Step 1: DOS Generation */}
                                <div className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                                    timetableApproval.status === 'draft' || timetableApproval.status === 'revision_requested'
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                                }`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                        timetableApproval.status !== 'draft' && timetableApproval.status !== 'revision_requested'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-blue-600 text-white'
                                    }`}>
                                        {timetableApproval.status !== 'draft' && timetableApproval.status !== 'revision_requested' ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            '1'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step 1: DOS</p>
                                        <h6 className="text-xs font-black text-slate-800 dark:text-white truncate">Timetable Draft &amp; Slots</h6>
                                        <p className="text-[9px] text-slate-500 truncate">
                                            {allocations.length} sessions across {courses.length} classes
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2: Headteacher Review */}
                                <div className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                                    timetableApproval.status === 'pending_headteacher'
                                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-sm'
                                        : timetableApproval.status === 'approved_dispersed'
                                            ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                                            : 'bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                                }`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                        timetableApproval.status === 'approved_dispersed'
                                            ? 'bg-emerald-500 text-white'
                                            : timetableApproval.status === 'pending_headteacher'
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {timetableApproval.status === 'approved_dispersed' ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            '2'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step 2: Headteacher</p>
                                        <h6 className="text-xs font-black text-slate-800 dark:text-white truncate">Official Review &amp; Sign-off</h6>
                                        <p className="text-[9px] text-slate-500 truncate">
                                            {timetableApproval.approvedBy ? `Signed by ${timetableApproval.approvedBy}` : 'Awaiting authorization'}
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3: Dispersal */}
                                <div className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                                    timetableApproval.status === 'approved_dispersed'
                                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-sm'
                                        : 'bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                                }`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                        timetableApproval.status === 'approved_dispersed'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {timetableApproval.status === 'approved_dispersed' ? (
                                            <Megaphone className="w-4 h-4" />
                                        ) : (
                                            '3'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step 3: Teachers</p>
                                        <h6 className="text-xs font-black text-slate-800 dark:text-white truncate">Dispersed &amp; Active</h6>
                                        <p className="text-[9px] text-slate-500 truncate">
                                            {timetableApproval.status === 'approved_dispersed' 
                                                ? `Published to ${distinctTeachersInAllocations.length} teachers` 
                                                : 'Awaiting headteacher approval'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Active Status Context & Action Controls */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1 max-w-2xl">
                                    {timetableApproval.status === 'draft' && (
                                        <>
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" /> Timetable Ready for Headteacher Review
                                            </p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                Director of Studies (DOS) has compiled the allocations. Click <strong className="text-slate-700 dark:text-slate-300">Forward to Headteacher</strong> so the Headteacher / Principal can review and authorize dispersal to teachers.
                                            </p>
                                        </>
                                    )}
                                    {timetableApproval.status === 'pending_headteacher' && (
                                        <>
                                            <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-amber-600 shrink-0" /> Awaiting Headteacher Review &amp; Dispersal Signature
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Forwarded by <strong className="text-slate-800 dark:text-white">{timetableApproval.forwardedBy || 'Director of Studies (DOS)'}</strong>
                                                {timetableApproval.forwardedAt ? ` on ${new Date(timetableApproval.forwardedAt).toLocaleDateString()} at ${new Date(timetableApproval.forwardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.
                                                {timetableApproval.forwardingNotes && (
                                                    <span className="block mt-1 italic text-[11px] text-slate-500">
                                                        &ldquo;{timetableApproval.forwardingNotes}&rdquo;
                                                    </span>
                                                )}
                                            </p>
                                        </>
                                    )}
                                    {timetableApproval.status === 'revision_requested' && (
                                        <>
                                            <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase flex items-center gap-1.5">
                                                <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" /> Revision Requested by Headteacher
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                The Headteacher has requested revisions. Please update allocations and re-submit for approval.
                                                {timetableApproval.revisionNotes && (
                                                    <span className="block mt-1 font-bold text-rose-600 dark:text-rose-300 text-xs">
                                                        Headteacher Notes: &ldquo;{timetableApproval.revisionNotes}&rdquo;
                                                    </span>
                                                )}
                                            </p>
                                        </>
                                    )}
                                    {timetableApproval.status === 'approved_dispersed' && (
                                        <>
                                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Officially Approved &amp; Dispersed
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Authorized by <strong className="text-slate-800 dark:text-white">{timetableApproval.approvedBy || 'Principal / Headteacher'}</strong>
                                                {timetableApproval.approvedAt ? ` on ${new Date(timetableApproval.approvedAt).toLocaleDateString()}` : ''}.
                                                Active across <strong className="text-slate-800 dark:text-white">{distinctTeachersInAllocations.length} teachers</strong>.
                                                {timetableApproval.approvalNotes && (
                                                    <span className="block mt-1 italic text-[11px] text-slate-500">
                                                        &ldquo;{timetableApproval.approvalNotes}&rdquo;
                                                    </span>
                                                )}
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
                                    {(timetableApproval.status === 'draft' || timetableApproval.status === 'revision_requested') && (
                                        <button
                                            onClick={handleOpenForwardModal}
                                            className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <Send className="w-4 h-4" /> Forward to Headteacher for Approval
                                        </button>
                                    )}

                                    {timetableApproval.status === 'pending_headteacher' && (
                                        <>
                                            {isHeadteacherUser ? (
                                                <>
                                                    <button
                                                        onClick={handleOpenRevisionModal}
                                                        className="px-4 py-2.5 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" /> Return for Revision
                                                    </button>
                                                    <button
                                                        onClick={handleOpenApproveModal}
                                                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        <CheckSquare className="w-4 h-4" /> Approve &amp; Disperse to Teachers
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={handleOpenApproveModal}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <CheckSquare className="w-4 h-4" /> Headteacher Sign-off &amp; Disperse
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {timetableApproval.status === 'approved_dispersed' && (
                                        <>
                                            <button
                                                onClick={handleDisperseNoticeToTeachers}
                                                className="px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <Megaphone className="w-4 h-4" /> Disperse Notice / Memo
                                            </button>
                                            {(isDosUser || isHeadteacherUser) && (
                                                <button
                                                    onClick={handleResetToDraft}
                                                    className="px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                                                    title="Reopen timetable as Draft to modify slots for new term or adjustments"
                                                >
                                                    Reopen as Draft
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* View Switcher, Filter & Search Bar */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                                {/* View Mode Toggle */}
                                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                    <button
                                        onClick={() => setAllocViewMode('asc_grid')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                            allocViewMode === 'asc_grid'
                                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" /> Master Grid
                                    </button>
                                    <button
                                        onClick={() => setAllocViewMode('day_columns')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                            allocViewMode === 'day_columns'
                                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Calendar className="w-3.5 h-3.5" /> Day Columns
                                    </button>
                                    <button
                                        onClick={() => setAllocViewMode('unallocated')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                            allocViewMode === 'unallocated'
                                                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                        <span>Unallocated</span>
                                        {unallocatedAllocations.length > 0 && (
                                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                                                allocViewMode === 'unallocated'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                    : 'bg-amber-500 text-white animate-pulse'
                                            }`}>
                                                {unallocatedAllocations.length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* Print Timetable */}
                                <button
                                    onClick={handlePrintTimetable}
                                    className="px-4 py-2 bg-gradient-to-r from-slate-900 to-indigo-900 dark:from-indigo-600 dark:to-violet-600 text-white hover:opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm shrink-0"
                                >
                                    <Printer className="w-4 h-4" /> Print Timetable Grid
                                </button>
                            </div>

                            {/* Filters row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Class selector */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Class:</span>
                                        <select
                                            value={selectedTimetableClass}
                                            onChange={e => {
                                                setSelectedTimetableClass(e.target.value);
                                                setSelectedTimetableStream('All');
                                            }}
                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        >
                                            <option value="All">All Classes ({courses.length})</option>
                                            {courses.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Stream selector */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Stream:</span>
                                        <select
                                            value={selectedTimetableStream}
                                            onChange={e => setSelectedTimetableStream(e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        >
                                            <option value="All">All Streams</option>
                                            {distinctTimetableStreams.map(str => (
                                                <option key={str} value={str}>{str}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quick Search */}
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={ascClassSearchQuery}
                                            onChange={e => setAscClassSearchQuery(e.target.value)}
                                            placeholder="Search class or stream..."
                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium outline-none focus:border-indigo-600 dark:text-white w-44"
                                        />
                                        {ascClassSearchQuery && (
                                            <button onClick={() => setAscClassSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Day Scope Pills (Grid View) */}
                                {allocViewMode === 'asc_grid' && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {(['all', 'weekdays', 'weekend', 'Saturday', 'Sunday'] as const).map(scope => {
                                            const labels: Record<string, string> = {
                                                all: 'All 7 Days',
                                                weekdays: 'Mon - Fri',
                                                weekend: 'Weekend',
                                                Saturday: 'Sat Only',
                                                Sunday: 'Sun Only'
                                            };
                                            return (
                                                <button
                                                    key={scope}
                                                    onClick={() => setAscDayScope(scope)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                        ascDayScope === scope
                                                            ? 'bg-indigo-600 text-white shadow-xs'
                                                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {labels[scope]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* MODE 1: MASTER TIMETABLE GRID (Classes × Periods) */}
                        {allocViewMode === 'asc_grid' && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-700/60 dark:border-slate-700 shadow-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left">
                                        {/* HEADER 1: Day Row */}
                                        <thead>
                                            <tr className="border-b border-slate-400 dark:border-slate-600 select-none">
                                                <th className="sticky left-0 z-30 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black uppercase tracking-wider px-3 py-2.5 border-r-2 border-slate-500 dark:border-slate-600 min-w-[85px] shadow-sm">
                                                    Class
                                                </th>
                                                {daysForAscGrid.map(day => {
                                                    const slots = getAscSlotsForDay(day);
                                                    const isWeekend = ['Saturday', 'Sunday'].includes(day);
                                                    return (
                                                        <th
                                                            key={day}
                                                            colSpan={slots.length}
                                                            className={`text-center py-2.5 px-2 border-r-2 border-slate-400 dark:border-slate-600 text-xs font-black uppercase tracking-widest ${
                                                                isWeekend 
                                                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200' 
                                                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                            }`}
                                                        >
                                                            {day}
                                                        </th>
                                                    );
                                                })}
                                            </tr>

                                            {/* HEADER 2: Period Numbers Row */}
                                            <tr className="border-b-2 border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-850 select-none">
                                                <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-r-2 border-slate-400 dark:border-slate-600 shadow-xs">
                                                    Period
                                                </th>
                                                {daysForAscGrid.map(day => {
                                                    const slots = getAscSlotsForDay(day);
                                                    return slots.map((slot, sIdx) => {
                                                        const isBreak = slot.isBreak;
                                                        const startFmt = slot.startTime?.slice(0, 5) || '';
                                                        const endFmt = slot.endTime?.slice(0, 5) || (slot.startTime ? addMinutesToTime(slot.startTime, 60) : '');
                                                        const timeRangeText = startFmt && endFmt ? `${startFmt} - ${endFmt}` : (startFmt || endFmt);

                                                        return (
                                                            <th
                                                                key={`${day}_${sIdx}`}
                                                                className={`px-1 py-1.5 text-center border-r border-slate-300 dark:border-slate-700/80 min-w-[80px] max-w-[105px] ${
                                                                    isBreak 
                                                                        ? 'bg-amber-200/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300' 
                                                                        : 'text-slate-700 dark:text-slate-300'
                                                                }`}
                                                                title={isBreak ? `Recess Break: ${timeRangeText}` : `Period ${slot.periodNum}: ${timeRangeText}`}
                                                            >
                                                                <div className="text-[11px] font-black leading-none flex items-center justify-center gap-1">
                                                                    {isBreak ? (
                                                                        <span className="text-[8.5px] uppercase tracking-wider font-black text-amber-900 dark:text-amber-200 flex items-center gap-0.5">
                                                                            ☕ RECESS
                                                                        </span>
                                                                    ) : (
                                                                        <span>{slot.periodNum}</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[8px] font-mono font-bold opacity-85 mt-0.5 tracking-tight whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                                    {timeRangeText}
                                                                </div>
                                                            </th>
                                                        );
                                                    });
                                                })}
                                            </tr>
                                        </thead>

                                        {/* TABLE BODY: Rows of Classes */}
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 bg-white dark:bg-slate-900">
                                            {filteredClasses.length === 0 ? (
                                                <tr>
                                                    <td colSpan={100} className="p-12 text-center text-slate-400 italic text-xs">
                                                        No classes match the filter criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredClasses.map((cls, rowIdx) => (
                                                    <tr 
                                                        key={cls.sortKey} 
                                                        className={`hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-colors ${
                                                            rowIdx % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-900/40' : ''
                                                        }`}
                                                    >
                                                        {/* Sticky Class Name Column */}
                                                        <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 px-3 py-2 border-r-2 border-slate-400 dark:border-slate-600 select-none shadow-xs">
                                                            <div className="font-mono text-xs font-black text-slate-900 dark:text-white tracking-tight">
                                                                {cls.shortCode}
                                                            </div>
                                                            <div className="text-[8px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[70px]" title={`${cls.className} • ${cls.stream || 'All Streams'}`}>
                                                                {cls.stream || 'All'}
                                                            </div>
                                                        </td>

                                                        {/* Period Cells across all Days */}
                                                        {daysForAscGrid.map(day => {
                                                            const slots = getAscSlotsForDay(day);
                                                            return slots.map((slot, sIdx) => {
                                                                const isLastOfSlot = sIdx === slots.length - 1;
                                                                return (
                                                                    <td
                                                                        key={`${day}_${sIdx}`}
                                                                        className={`p-1 text-center align-middle ${
                                                                            isLastOfSlot 
                                                                                ? 'border-r-2 border-slate-400 dark:border-slate-600' 
                                                                                : 'border-r border-slate-200 dark:border-slate-700/60'
                                                                        }`}
                                                                    >
                                                                        {renderAscGridCell(cls, day, slot)}
                                                                    </td>
                                                                );
                                                            });
                                                        })}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* MODE 2: DAY COLUMNS VIEW (Cards) */}
                        {allocViewMode === 'day_columns' && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                    {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(day => {
                                        const isWeekend = ['Saturday', 'Sunday'].includes(day);
                                        const dayAllocations = allocations.filter(a => {
                                            const matchDay = a.dayOfWeek === day;
                                            const matchClass = selectedTimetableClass === 'All' || a.courseId === selectedTimetableClass;
                                            const matchStream = matchAllocationStream(a, selectedTimetableStream);
                                            return matchDay && matchClass && matchStream;
                                        }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                                        const isSaturday = day === 'Saturday';
                                        const isSunday = day === 'Sunday';
                                        const dayHasBreak = (isSaturday && includeSaturdayBreak) || (isSunday && includeSundayBreak);
                                        const dayBreakStart = isSaturday ? (saturdayBreakStartTime || '10:00') : (sundayBreakStartTime || '11:00');
                                        const dayBreakEnd = isSaturday ? (saturdayBreakEndTime || '10:30') : (sundayBreakEndTime || '11:30');
                                        const dayBreakLabel = isSaturday ? (saturdayBreakLabel || 'Saturday Refreshment Break') : (sundayBreakLabel || 'Sunday Recess Break');

                                        const preBreakAllocations = isWeekend && dayHasBreak 
                                            ? dayAllocations.filter(a => (a.startTime || '') < dayBreakStart)
                                            : dayAllocations;
                                        const postBreakAllocations = isWeekend && dayHasBreak 
                                            ? dayAllocations.filter(a => (a.startTime || '') >= dayBreakStart)
                                            : [];

                                        return (
                                            <div 
                                                key={day} 
                                                className={`rounded-2xl p-4 border transition-all ${
                                                    isWeekend 
                                                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/30' 
                                                        : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5 mb-3">
                                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{day}</h5>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                        isWeekend ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                                    }`}>
                                                        {dayAllocations.length} session{dayAllocations.length === 1 ? '' : 's'}
                                                    </span>
                                                </div>

                                                <div className="space-y-3">
                                                    {preBreakAllocations.length > 0 ? (
                                                        preBreakAllocations.map(renderAllocCard)
                                                    ) : !isWeekend && (
                                                        <p className="text-[10px] text-slate-400 font-medium italic text-center py-6">No lessons scheduled</p>
                                                    )}

                                                    {/* Weekend Break Card */}
                                                    {isWeekend && dayHasBreak && (
                                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-3 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 shadow-xs flex flex-col items-center justify-center text-center space-y-1 my-2 print:border-amber-500 print:bg-amber-50">
                                                            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                                                                <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                                <span className="text-[10px] font-black uppercase tracking-wider">{dayBreakLabel}</span>
                                                            </div>
                                                            <p className="text-[9px] font-mono font-black text-amber-700 dark:text-amber-300">
                                                                {dayBreakStart} – {dayBreakEnd}
                                                            </p>
                                                            <span className="text-[7.5px] font-bold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/90">{day} Recess</span>
                                                        </div>
                                                    )}

                                                    {postBreakAllocations.length > 0 && (
                                                        postBreakAllocations.map(renderAllocCard)
                                                    )}

                                                    {isWeekend && dayAllocations.length === 0 && !dayHasBreak && (
                                                        <p className="text-[10px] text-slate-400 font-medium italic text-center py-6">No lessons scheduled</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* MODE 3: UNALLOCATED LESSONS SHELF VIEW */}
                        {allocViewMode === 'unallocated' && (
                            <div className="space-y-6 animate-in fade-in">
                                {/* Banner & Actions */}
                                <div className="bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-indigo-500/10 p-6 rounded-[2.5rem] border border-amber-300 dark:border-amber-800/80 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
                                            <Archive className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                    Unallocated Remedial Lessons Shelf
                                                </h4>
                                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                                                    {unallocatedAllocations.length} Pending
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                                                Lessons placed here were offloaded during Auto-Spread because their original period was overcrowded and all alternative slots were full. Only <strong>one subject</strong> is scheduled per period on the Master Timetable. You can allocate them whenever slots become available.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                                        <button
                                            type="button"
                                            disabled={isResolvingOverlaps || unallocatedAllocations.length === 0}
                                            onClick={handleAutoSpreadUnallocated}
                                            className="flex-1 md:flex-none px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            {isResolvingOverlaps ? 'Spreading...' : 'Auto-Spread All Unallocated'}
                                        </button>
                                    </div>
                                </div>

                                {/* Unallocated Cards Grid */}
                                {unallocatedAllocations.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {unallocatedAllocations.map(alloc => {
                                            const color = getAscSubjectColor(alloc.subjectName || '');
                                            const subCode = getSubjectCode(alloc.subjectName || '', alloc.subjectId);
                                            const tCode = teacherCodes[alloc.teacherId] || getTeacherCode(alloc.teacherId, alloc.teacherName || 'Teacher', teachersList);

                                            return (
                                                <div
                                                    key={alloc.id}
                                                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                                                                    className="px-2.5 py-1 rounded-lg border text-xs font-black uppercase shadow-2xs select-none"
                                                                >
                                                                    {subCode}
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight">
                                                                        {alloc.subjectName}
                                                                    </h5>
                                                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                                                        {alloc.className} {alloc.stream && alloc.stream !== 'All Streams' ? `(${alloc.stream})` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[8.5px] font-black uppercase tracking-wider shrink-0">
                                                                Unallocated
                                                            </span>
                                                        </div>

                                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-1">
                                                            <div className="flex items-center justify-between text-[9.5px]">
                                                                <span className="text-slate-400 font-bold uppercase">Teacher:</span>
                                                                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                                                    {alloc.teacherName || 'Not specified'}
                                                                    <span className="text-[8px] font-mono font-black px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                        {tCode}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            {alloc.unallocatedReason && (
                                                                <p className="text-[9px] text-amber-700 dark:text-amber-300 font-medium italic pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                                                    {alloc.unallocatedReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAllocation(alloc.id)}
                                                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Delete
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditAllocation(alloc)}
                                                            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                                                        >
                                                            <Calendar className="w-3 h-3" /> Assign Slot
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 border border-slate-100 dark:border-slate-700 text-center space-y-3">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
                                            <CheckCircle2 className="w-7 h-7" />
                                        </div>
                                        <h5 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            No Unallocated Lessons!
                                        </h5>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                            All remedial lessons are cleanly placed into valid periods on the Master Timetable with zero collisions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TIMETABLE SUBJECT COLOR REFERENCE (LEGEND) */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h6 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Timetable Subject Color Reference
                                </h6>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {effectiveSchoolSubjects.length} Registered Subjects
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {effectiveSchoolSubjects.map(sub => {
                                    const c = getAscSubjectColor(sub.name, sub.id);
                                    const code = getSubjectCode(sub.name, sub.id);
                                    return (
                                        <div 
                                            key={sub.id}
                                            style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                                            className="px-2.5 py-1 rounded-lg border text-[10px] font-black flex items-center gap-1.5 shadow-2xs select-none hover:scale-105 transition-transform"
                                        >
                                            <span className="px-1 py-0.2 rounded bg-black/20 text-[9px] uppercase font-mono tracking-tight">
                                                {code}
                                            </span>
                                            <span>{sub.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* QUICK ACTION MODAL ON TIMETABLE CELL CLICK */}
                        {selectedCellAlloc && typeof document !== 'undefined' && createPortal(
                            <div 
                                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
                                onClick={() => setSelectedCellAlloc(null)}
                            >
                                <div 
                                    className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4 relative my-auto animate-in zoom-in-95 duration-150"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const c = getAscSubjectColor(selectedCellAlloc.subjectName, selectedCellAlloc.subjectId);
                                                const code = getSubjectCode(selectedCellAlloc.subjectName, selectedCellAlloc.subjectId);
                                                return (
                                                    <div 
                                                        style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }} 
                                                        className="w-12 h-12 rounded-2xl border flex flex-col items-center justify-center shadow-sm select-none"
                                                    >
                                                        <span className="text-sm font-black uppercase drop-shadow-xs">{code}</span>
                                                    </div>
                                                );
                                            })()}
                                            <div>
                                                <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                                    {selectedCellAlloc.subjectName}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {selectedCellAlloc.className} {selectedCellAlloc.stream && selectedCellAlloc.stream !== 'All Streams' ? `• ${selectedCellAlloc.stream}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedCellAlloc(null)}
                                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                                            <span className="text-slate-500 font-medium">Teacher Assigned:</span>
                                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                {selectedCellAlloc.teacherName}
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-black text-[10px]">
                                                    Code: {getTeacherCode(selectedCellAlloc.teacherId, selectedCellAlloc.teacherName, enrichedUsers)}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                                            <span className="text-slate-500 font-medium">Timetable Slot:</span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {selectedCellAlloc.dayOfWeek} • {selectedCellAlloc.startTime} - {selectedCellAlloc.endTime}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                                            <span className="text-slate-500 font-medium">Subject Priority:</span>
                                            <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded ${
                                                selectedCellAlloc.priority === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                            }`}>
                                                {selectedCellAlloc.priority || 'Medium'}
                                            </span>
                                        </div>
                                        {selectedCellAlloc.substituteTeacherName && (
                                            <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800 text-amber-600 dark:text-amber-400">
                                                <span className="font-medium">Active Substitute:</span>
                                                <span className="font-bold">↳ {selectedCellAlloc.substituteTeacherName}</span>
                                            </div>
                                        )}
                                        {(selectedCellAlloc.isJoint || selectedCellAlloc.is_joint || (selectedCellAlloc.jointStreams && selectedCellAlloc.jointStreams.length > 0)) && (
                                            <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                                                <span className="font-medium">Joint Stream Session:</span>
                                                <span className="font-bold">
                                                    {Array.isArray(selectedCellAlloc.jointStreams) ? selectedCellAlloc.jointStreams.join(', ') : 'Combined Streams'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                const toEdit = selectedCellAlloc;
                                                setSelectedCellAlloc(null);
                                                handleOpenEditAllocation(toEdit);
                                            }}
                                            className="py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                const toReassign = selectedCellAlloc;
                                                setSelectedCellAlloc(null);
                                                setReassigningAlloc(toReassign);
                                                setReassignTeacherId('');
                                            }}
                                            className="py-2.5 px-3 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" /> Reassign
                                        </button>
                                        <button
                                            onClick={() => {
                                                const toDeleteId = selectedCellAlloc.id;
                                                setSelectedCellAlloc(null);
                                                handleDeleteAllocation(toDeleteId);
                                            }}
                                            className="py-2.5 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* MULTI-LESSON OVERLAP CELL INSPECTOR MODAL */}
                        {multiAllocCellItems && typeof document !== 'undefined' && createPortal(
                            <div 
                                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto"
                                onClick={() => setMultiAllocCellItems(null)}
                            >
                                <div 
                                    className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-7 max-w-xl w-full shadow-2xl border-2 border-rose-400 dark:border-rose-900 space-y-5 relative my-auto animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Modal Header */}
                                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black shrink-0">
                                                <AlertTriangle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                        Overlapping Lessons Inspector
                                                    </h4>
                                                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase">
                                                        {multiAllocCellItems.allocations.length} Lessons
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {multiAllocCellItems.className} {multiAllocCellItems.stream && multiAllocCellItems.stream !== 'All Streams' ? `(${multiAllocCellItems.stream})` : ''} • {multiAllocCellItems.day} {multiAllocCellItems.startTime} - {multiAllocCellItems.endTime}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setMultiAllocCellItems(null)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Auto-Spread Call to Action */}
                                    <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-300 dark:border-rose-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-rose-600" /> Fix All Overlaps in This Period
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                                Keeps the 1st lesson here and automatically spreads the other {multiAllocCellItems.allocations.length - 1} lessons across free days/slots.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isResolvingOverlaps}
                                            onClick={() => handleAutoSpreadOverlaps(multiAllocCellItems.allocations)}
                                            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Auto-Spread These
                                        </button>
                                    </div>

                                    {/* Allocations List */}
                                    <div className="space-y-2.5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            All {multiAllocCellItems.allocations.length} Lessons Scheduled in this Slot:
                                        </p>
                                        {multiAllocCellItems.allocations.map((alloc, idx) => {
                                            const c = getAscSubjectColor(alloc.subjectName, alloc.subjectId);
                                            const code = getSubjectCode(alloc.subjectName, alloc.subjectId);
                                            const tCode = getTeacherCode(alloc.teacherId, alloc.teacherName, enrichedUsers);
                                            const isJoint = !!(alloc.isJoint || alloc.is_joint || (alloc.jointStreams && alloc.jointStreams.length > 0));

                                            return (
                                                <div 
                                                    key={alloc.id}
                                                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div 
                                                            style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }} 
                                                            className="w-10 h-10 rounded-xl border flex flex-col items-center justify-center font-black text-xs shrink-0 select-none shadow-xs"
                                                        >
                                                            {code}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight">
                                                                    {alloc.subjectName}
                                                                </h5>
                                                                {idx === 0 && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[8px] font-black uppercase">
                                                                        Slot Anchor
                                                                    </span>
                                                                )}
                                                                {idx > 0 && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[8px] font-black uppercase">
                                                                        Overlapping #{idx + 1}
                                                                    </span>
                                                                )}
                                                                {isJoint && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[8px] font-black uppercase">
                                                                        Joint
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                                <span>Teacher: <strong>{alloc.teacherName}</strong></span>
                                                                <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-[8.5px] font-mono font-bold">
                                                                    {tCode}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setMultiAllocCellItems(null);
                                                                handleOpenEditAllocation(alloc);
                                                            }}
                                                            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1 transition-all"
                                                        >
                                                            <Pencil className="w-3 h-3" /> Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleDeleteAllocation(alloc.id);
                                                            }}
                                                            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* GLOBAL TIMETABLE OVERLAP RESOLVER MODAL */}
                        {showOverlapModal && typeof document !== 'undefined' && createPortal(
                            <div 
                                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto"
                                onClick={() => setShowOverlapModal(false)}
                            >
                                <div 
                                    className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-7 max-w-2xl w-full shadow-2xl border-2 border-rose-400 dark:border-rose-900 space-y-5 relative my-auto animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Modal Header */}
                                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black shrink-0">
                                                <AlertTriangle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                    Timetable Collision &amp; Overlap Manager
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {detectedCollisions.length} Conflicting Slot(s) • {totalOverlappingLessons} Overlapping Lessons Detected
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowOverlapModal(false)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* One-Click Resolution Master Banner */}
                                    <div className="bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-rose-500/15 border-2 border-rose-300 dark:border-rose-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h5 className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-rose-600" /> One-Click Automatic Overlap Resolution
                                            </h5>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
                                                Automatically keeps 1 lesson per period and redistributes all other conflicting lessons to free slots across the week with zero teacher or class clashes.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isResolvingOverlaps || totalOverlappingLessons === 0}
                                            onClick={() => handleAutoSpreadOverlaps()}
                                            className="px-6 py-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 shrink-0 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            <Sparkles className="w-4 h-4" /> {isResolvingOverlaps ? 'Redistributing...' : 'Auto-Spread All Overlaps'}
                                        </button>
                                    </div>

                                    {/* Collisions Breakdown List */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Detected Collision Groups:
                                        </p>
                                        {detectedCollisions.map((col, idx) => (
                                            <div 
                                                key={col.id} 
                                                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                                            >
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <h6 className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                                            {col.title}
                                                        </h6>
                                                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[8.5px] font-black uppercase">
                                                            {col.allocations.length} Lessons Crammed
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMultiAllocCellItems({
                                                                className: col.className || '',
                                                                stream: col.stream || '',
                                                                day: col.dayOfWeek,
                                                                startTime: col.startTime,
                                                                endTime: col.endTime,
                                                                allocations: col.allocations
                                                            });
                                                            setShowOverlapModal(false);
                                                        }}
                                                        className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Inspect Slot
                                                    </button>
                                                </div>

                                                {/* Lessons in this group */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                                                    {col.allocations.map(a => {
                                                        const c = getAscSubjectColor(a.subjectName, a.subjectId);
                                                        const code = getSubjectCode(a.subjectName, a.subjectId);
                                                        const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                                                        return (
                                                            <div 
                                                                key={a.id}
                                                                style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                                                                className="p-2 rounded-xl border flex items-center justify-between text-[9px] font-black uppercase select-none shadow-xs"
                                                            >
                                                                <span>{code}</span>
                                                                <span className="opacity-80 font-mono text-[8px]">{tCode}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        {detectedCollisions.length === 0 && (
                                            <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                                <h5 className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                                                    Zero Timetable Collisions!
                                                </h5>
                                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                                                    All classes and teachers have distinct, clash-free remedial schedules.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                );
            })()}

            {/* TAB: SESSIONS */}
            {activeTab === 'sessions' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-650 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search teacher, subject, class..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-6 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filter</label>
                            <select 
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                            >
                                <option value="all">All Sessions</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pending Duty Approval">Pending Duty Approval (Stage 2)</option>
                                <option value="Pending Headteacher Approval">Pending Headteacher Approval (Stage 3)</option>
                                <option value="Pending Operations Payout">Pending Operations Payout (Stage 4)</option>
                                <option value="Cash Issued to DOS">Cash Issued to DOS (Stage 5)</option>
                                <option value="Prefect Confirmed">Prefect Confirmed</option>
                                <option value="Approved">Approved</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class & Subject</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefect validation</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No remedial hours logged.</td>
                                        </tr>
                                    ) : (
                                        filteredSessions.map(session => (
                                            <tr key={session.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{session.teacherName}</p>
                                                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {session.teacherId.substring(0, 8)}</p>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-indigo-650 uppercase">{session.subjectName}</p>
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{session.className}</span>
                                                        {session.stream && (
                                                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-wider">
                                                                {session.stream}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck className="w-4 h-4 text-emerald-500" />
                                                        <div>
                                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{session.prefectName}</p>
                                                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                                                                Card Token: {session.prefectToken ? session.prefectToken.slice(-10) : 'Manual / None'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">{session.hours ? `${session.hours} hrs` : 'N/A'}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">
                                                        {new Date(session.startTime).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic ${
                                                        session.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                        session.status === 'Cash Issued to DOS' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' :
                                                        session.status === 'Pending Operations Payout' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                                                        session.status === 'Pending Headteacher Approval' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                                        session.status === 'Pending Duty Approval' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                        session.status === 'Approved' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' :
                                                        session.status === 'Prefect Confirmed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {session.status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {session.status === 'Prefect Confirmed' && (
                                                        <button 
                                                            onClick={() => handleApproveSession(session)}
                                                            className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm transition-all"
                                                        >
                                                            Approve Hours
                                                        </button>
                                                    )}
                                                    {session.status === 'Pending Duty Approval' && (
                                                        <button 
                                                            onClick={() => handleApproveDutySession(session)}
                                                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 ml-auto"
                                                        >
                                                            <ShieldCheck className="w-3 h-3" /> Approve (Duty)
                                                        </button>
                                                    )}
                                                    {session.status === 'Pending Headteacher Approval' && (
                                                        <button 
                                                            onClick={() => handleHeadteacherAuthorizeSession(session)}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 ml-auto"
                                                        >
                                                            <Award className="w-3 h-3" /> Authorize (Principal)
                                                        </button>
                                                    )}
                                                    {session.status === 'Pending Operations Payout' && (
                                                        <button 
                                                            onClick={() => {
                                                                const sHours = session.hours || 1;
                                                                const totalAmount = computeSessionPayout(session);
                                                                setOpsDisburseBatch({
                                                                    teacherId: session.teacherId,
                                                                    teacherName: session.teacherName || 'Teacher',
                                                                    totalHours: sHours,
                                                                    totalAmount,
                                                                    sessionIds: [session.id]
                                                                });
                                                                setOpsCashVoucherRef(`CSH-${Date.now().toString().slice(-6)}`);
                                                                setIsOpsCashModalOpen(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 ml-auto"
                                                        >
                                                            <Banknote className="w-3 h-3" /> Handover to DOS
                                                        </button>
                                                    )}
                                                    {session.status === 'Cash Issued to DOS' && (
                                                        <button 
                                                            onClick={() => {
                                                                const sHours = session.hours || 1;
                                                                const totalAmount = computeSessionPayout(session);
                                                                setDosPayTeacherData({
                                                                    teacherId: session.teacherId,
                                                                    teacherName: session.teacherName || 'Teacher',
                                                                    totalHours: sHours,
                                                                    rate: Math.round(totalAmount / (sHours || 1)),
                                                                    totalAmount,
                                                                    sessionIds: [session.id],
                                                                    cashVoucherRef: session.cashVoucherRef,
                                                                    operationsManagerName: session.operationsDisbursedBy
                                                                });
                                                                setIsDosPayModalOpen(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 ml-auto"
                                                        >
                                                            <PenTool className="w-3 h-3" /> Pay Cash &amp; Sign
                                                        </button>
                                                    )}
                                                    {session.status === 'Approved' && (
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                            <Check className="w-3.5 h-3.5" /> Ready for Payout
                                                        </span>
                                                    )}
                                                    {session.status === 'Paid' && (
                                                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1 justify-end">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Cash Receipted
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PAYOUTS */}
            {activeTab === 'payouts' && (
                <div className="space-y-8">
                    {/* STAGE 4: OPERATIONS MANAGER CASH HANDOVER TO DOS */}
                    <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-300">
                                    <Banknote className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-purple-500/30 text-purple-200">Stage 4: Operations Payout</span>
                                        <span className="text-xs text-purple-200 font-bold">Physical Cash Handover to DOS</span>
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-wider mt-0.5">Approved Batches Ready for Cash Release to DOS</h4>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-purple-200 font-medium">Pending Handover</span>
                                <p className="text-lg font-black font-mono text-purple-300">
                                    KES {pendingOpsHandoverBatches.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-purple-50/50 dark:bg-purple-950/20 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Hours</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicable Rate</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cash to Disburse</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Operations Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingOpsHandoverBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                            No sessions waiting for Operations Cash Handover to DOS.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingOpsHandoverBatches.map(batch => (
                                        <tr key={batch.teacherId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">{batch.teacherName}</td>
                                            <td className="p-6 text-xs font-black text-slate-950 dark:text-slate-100">{batch.totalHours} hrs ({batch.sessionIds.length} lessons)</td>
                                            <td className="p-6 text-xs font-bold text-slate-400 font-mono">KES {batch.rate.toLocaleString()}/hr</td>
                                            <td className="p-6 text-sm font-black text-purple-600 dark:text-purple-400 font-mono">KES {batch.totalAmount.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setOpsDisburseBatch(batch);
                                                        setOpsCashVoucherRef(`CSH-${Date.now().toString().slice(-6)}`);
                                                        setIsOpsCashModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                                                >
                                                    <Banknote className="w-3.5 h-3.5" /> Release Cash to DOS
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* STAGE 5: DOS CASH PAYMENT TO TEACHER & ON-SCREEN SIGNATURE */}
                    <div className="bg-gradient-to-r from-cyan-900 via-teal-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-300">
                                    <PenTool className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-cyan-500/30 text-cyan-200">Stage 5: DOS Disbursal</span>
                                        <span className="text-xs text-cyan-200 font-bold">Physical Cash Handover &amp; On-Screen Signature</span>
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-wider mt-0.5">Cash in DOS Custody - Waiting for Teacher Signature</h4>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-cyan-200 font-medium">In DOS Custody</span>
                                <p className="text-lg font-black font-mono text-cyan-300">
                                    KES {cashIssuedToDosBatches.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-cyan-50/50 dark:bg-cyan-950/20 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher Ref &amp; Custody</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Cash Amount</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">DOS Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cashIssuedToDosBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                            No cash batches currently in DOS custody waiting for teacher pickup.
                                        </td>
                                    </tr>
                                ) : (
                                    cashIssuedToDosBatches.map(batch => (
                                        <tr key={batch.teacherId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">{batch.teacherName}</td>
                                            <td className="p-6 text-xs font-black text-slate-950 dark:text-slate-100">{batch.totalHours} hrs ({batch.sessionIds.length} lessons)</td>
                                            <td className="p-6 text-xs">
                                                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">#{batch.cashVoucherRef || 'VOUCHER-N/A'}</span>
                                                <p className="text-[10px] text-slate-400">Disbursed by: {batch.operationsManagerName || 'Operations'}</p>
                                            </td>
                                            <td className="p-6 text-sm font-black text-cyan-600 dark:text-cyan-400 font-mono">KES {batch.totalAmount.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setDosPayTeacherData(batch);
                                                        setIsDosPayModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                                                >
                                                    <PenTool className="w-3.5 h-3.5" /> Pay Cash &amp; Sign
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* GENERAL UNPAID APPROVED HOURS */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Unpaid Approved Hours (Weekly/Monthly calculations)</h4>
                        <p className="text-xs text-slate-500">Below are the accumulated approved remedial hours per teacher waiting for payment voucher issuance.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Accrued Hours</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate / hr</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payout</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accruedPayouts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No accrued unpaid hours. All teachers have been paid or hours are unapproved.</td>
                                    </tr>
                                ) : (
                                    accruedPayouts.map(accrued => (
                                        <tr key={accrued.teacherId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">{accrued.teacherName}</td>
                                            <td className="p-6 text-xs font-black text-slate-950 dark:text-slate-100">{accrued.totalHours} hrs</td>
                                            <td className="p-6 text-xs font-bold text-slate-400 font-mono">KES {accrued.rate.toLocaleString()}</td>
                                            <td className="p-6 text-sm font-black text-indigo-650 font-mono">KES {accrued.totalAmount.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                <button 
                                                    onClick={() => handleIssuePayout(accrued)}
                                                    className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
                                                >
                                                    Issue Payout Voucher
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mt-8">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Payout Vouchers &amp; Official Receipts Ledger</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher ID</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature &amp; Proof</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Receipt Voucher</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No payouts recorded.</td>
                                        </tr>
                                    ) : (
                                        payouts.map(p => (
                                            <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50">
                                                <td className="p-4 font-mono text-xs font-black text-purple-650">#{p.id ? p.id.split('_')[1] || p.id : 'N/A'}</td>
                                                <td className="p-4 text-xs font-black text-slate-900 dark:text-white uppercase">{p.teacherName}</td>
                                                <td className="p-4 text-xs font-black text-indigo-650 font-mono">KES {p.totalAmount.toLocaleString()}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {p.teacherSignatureDataUrl ? (
                                                        <div className="flex items-center gap-2">
                                                            <img src={p.teacherSignatureDataUrl} alt="Signature" className="h-6 w-auto border border-slate-200 dark:border-slate-700 rounded bg-white px-1" />
                                                            <span className="text-[9px] font-bold text-emerald-600 uppercase">Signed On-Screen</span>
                                                        </div>
                                                    ) : p.anonymousSignature ? (
                                                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{p.anonymousSignature}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase italic">Awaiting Signature</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => setViewingReceiptPayout(p)}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-auto transition-colors"
                                                    >
                                                        <Receipt className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> View Receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === 'billing' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Generate Parent Term Fee Invoices</h4>
                            <p className="text-xs text-slate-500">Bill parents for remedial lessons at the beginning of the term as a flat fee. Parents pay via installments in their portals.</p>
                        </div>
                        <button
                            onClick={handleBulkBillParents}
                            className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" /> Bulk Invoice All Students
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Stream</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Status</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Term Fee</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billingSummary.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No students registered in the system.</td>
                                    </tr>
                                ) : (
                                    billingSummary.map(bill => (
                                        <tr key={bill.studentId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">{bill.studentName}</td>
                                            <td className="p-6 text-xs font-bold text-slate-500 uppercase">{bill.className}</td>
                                            <td className="p-6 text-xs">
                                                {bill.isInvoiced ? (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black uppercase text-[8px] tracking-widest">Invoiced</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-black uppercase text-[8px] tracking-widest">Pending Invoice</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-sm font-black text-indigo-650 font-mono">KES {bill.amount.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                {!bill.isInvoiced ? (
                                                    <button 
                                                        onClick={() => handleBillParent(bill.studentId, bill.studentName, bill.className)}
                                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all"
                                                    >
                                                        Issue Term Invoice
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 justify-end">
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Billed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: RATES & CONFIG */}
            {activeTab === 'rates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Rates & Rules Form */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-500" /> Remedial Rates, Timing & Rules
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">Configure teacher rates for weekdays vs weekends, session period windows, and daily lesson quotas.</p>
                        </div>

                        <div className="space-y-5">
                            {/* 1. Teacher Hourly Pay Rates (Weekdays vs Weekends) */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5" /> Teacher Hourly Pay Tariffs
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekday Lesson Rate (/hr)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={weekdayHourlyRate}
                                                onChange={e => setWeekdayHourlyRate(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                                placeholder="1000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekend Lesson Rate (/hr)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={weekendHourlyRate}
                                                onChange={e => setWeekendHourlyRate(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                                placeholder="1500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekday Duty Flat Rate (per day)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={weekdayDutyFlatRate}
                                                onChange={e => setWeekdayDutyFlatRate(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                                placeholder="200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Period Session Timing Windows */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Session Period Timing Windows
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekday Remedial Window (Start – End)</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                type="time"
                                                value={weekdayStartTime}
                                                onChange={e => setWeekdayStartTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                            <input 
                                                type="time"
                                                value={weekdayEndTime}
                                                onChange={e => setWeekdayEndTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                    {/* Saturday Hours */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                            Saturday Remedial Hours (Start – End)
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                type="time"
                                                value={saturdayStartTime}
                                                onChange={e => {
                                                    setSaturdayStartTime(e.target.value);
                                                    setWeekendStartTime(e.target.value);
                                                }}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                            <input 
                                                type="time"
                                                value={saturdayEndTime}
                                                onChange={e => {
                                                    setSaturdayEndTime(e.target.value);
                                                    setWeekendEndTime(e.target.value);
                                                }}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Sunday Hours */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                            Sunday Remedial Hours (Start – End)
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                type="time"
                                                value={sundayStartTime}
                                                onChange={e => setSundayStartTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                            <input 
                                                type="time"
                                                value={sundayEndTime}
                                                onChange={e => setSundayEndTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Saturday Break Configuration */}
                                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox"
                                                    checked={includeSaturdayBreak}
                                                    onChange={e => {
                                                        setIncludeSaturdayBreak(e.target.checked);
                                                        setIncludeWeekendBreak(e.target.checked);
                                                    }}
                                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                                    <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                    Include Saturday Break on Timetable &amp; Prints
                                                </span>
                                            </label>
                                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                                includeSaturdayBreak 
                                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                            }`}>
                                                {includeSaturdayBreak ? 'Printable & Active' : 'Disabled'}
                                            </span>
                                        </div>

                                        {includeSaturdayBreak && (
                                            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/50 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">Saturday Break Window (Start – End)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input 
                                                                type="time"
                                                                value={saturdayBreakStartTime}
                                                                onChange={e => {
                                                                    setSaturdayBreakStartTime(e.target.value);
                                                                    setWeekendBreakStartTime(e.target.value);
                                                                }}
                                                                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white font-mono"
                                                            />
                                                            <input 
                                                                type="time"
                                                                value={saturdayBreakEndTime}
                                                                onChange={e => {
                                                                    setSaturdayBreakEndTime(e.target.value);
                                                                    setWeekendBreakEndTime(e.target.value);
                                                                }}
                                                                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">Saturday Break Label</label>
                                                        <input 
                                                            type="text"
                                                            value={saturdayBreakLabel}
                                                            onChange={e => {
                                                                setSaturdayBreakLabel(e.target.value);
                                                                setWeekendBreakLabel(e.target.value);
                                                            }}
                                                            placeholder="e.g. Saturday Refreshment Break"
                                                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-amber-700 dark:text-amber-300/80 font-medium flex items-center gap-1">
                                                    <span>☕</span> Saturday break interval separating morning and afternoon Saturday sessions.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sunday Break Configuration */}
                                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox"
                                                    checked={includeSundayBreak}
                                                    onChange={e => setIncludeSundayBreak(e.target.checked)}
                                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                                    <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                    Include Sunday Break on Timetable &amp; Prints
                                                </span>
                                            </label>
                                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                                includeSundayBreak 
                                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                            }`}>
                                                {includeSundayBreak ? 'Printable & Active' : 'Disabled'}
                                            </span>
                                        </div>

                                        {includeSundayBreak && (
                                            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/50 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">Sunday Break Window (Start – End)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input 
                                                                type="time"
                                                                value={sundayBreakStartTime}
                                                                onChange={e => setSundayBreakStartTime(e.target.value)}
                                                                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white font-mono"
                                                            />
                                                            <input 
                                                                type="time"
                                                                value={sundayBreakEndTime}
                                                                onChange={e => setSundayBreakEndTime(e.target.value)}
                                                                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">Sunday Break Label</label>
                                                        <input 
                                                            type="text"
                                                            value={sundayBreakLabel}
                                                            onChange={e => setSundayBreakLabel(e.target.value)}
                                                            placeholder="e.g. Sunday Recess Break"
                                                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-amber-700 dark:text-amber-300/80 font-medium flex items-center gap-1">
                                                    <span>☕</span> Sunday break interval separating morning and afternoon Sunday sessions.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Daily Lessons Quotas & Limits */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5" /> Daily Lesson Quota Limits
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">🗓️ Weekday Max Lessons Per Teacher / Day</label>
                                        <select 
                                            value={maxLessonsPerDay}
                                            onChange={e => setMaxLessonsPerDay(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        >
                                            <option value={1}>1 Lesson per Day</option>
                                            <option value={2}>2 Lessons per Day</option>
                                            <option value={3}>3 Lessons per Day</option>
                                            <option value={4}>4 Lessons per Day</option>
                                            <option value={5}>5 Lessons per Day</option>
                                            <option value={99}>Unlimited (No Cap)</option>
                                        </select>
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium">Applies Mon – Fri.</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1.5">📅 Weekend Max Lessons Per Teacher / Day</label>
                                        <select 
                                            value={maxWeekendLessonsPerDay}
                                            onChange={e => setMaxWeekendLessonsPerDay(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                        >
                                            <option value={1}>1 Lesson per Day</option>
                                            <option value={2}>2 Lessons per Day</option>
                                            <option value={3}>3 Lessons per Day</option>
                                            <option value={4}>4 Lessons per Day</option>
                                            <option value={5}>5 Lessons per Day</option>
                                            <option value={6}>6 Lessons per Day</option>
                                            <option value={99}>Unlimited (No Cap)</option>
                                        </select>
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium">Applies Sat &amp; Sun — weekends can allow more sessions.</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium">Prevents teachers or admins from exceeding the configured daily maximum. Weekday and weekend caps are enforced independently.</p>
                            </div>

                            {/* 4. Parent Fees */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Student Parent Billing Fees
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Fee Per Student (per session)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={feePerStudent}
                                                onChange={e => setFeePerStudent(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Flat Term Fee (Flat fee billed)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={termFee}
                                                onChange={e => setTermFee(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Teacher Lesson Cancellation & Auto-Substitution Rules */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> Teacher Cancellation &amp; Auto-Substitution Rules
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                            ⏳ Cancellation Cutoff Window
                                        </label>
                                        <select 
                                            value={cancellationCutoffHours}
                                            onChange={e => setCancellationCutoffHours(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        >
                                            <option value={1}>1 Hour before lesson</option>
                                            <option value={2}>2 Hours before lesson</option>
                                            <option value={3}>3 Hours before lesson (Recommended)</option>
                                            <option value={4}>4 Hours before lesson</option>
                                            <option value={6}>6 Hours before lesson</option>
                                            <option value={12}>12 Hours before lesson</option>
                                            <option value={24}>24 Hours (1 Day before)</option>
                                        </select>
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium">Restricts teachers from cancelling too close to lesson time so substitute has adequate notice.</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                            ⏱️ Substitute Confirmation Timeout
                                        </label>
                                        <select 
                                            value={confirmationTimeoutMinutes}
                                            onChange={e => setConfirmationTimeoutMinutes(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                        >
                                            <option value={15}>15 Minutes</option>
                                            <option value={30}>30 Minutes</option>
                                            <option value={45}>45 Minutes (Recommended)</option>
                                            <option value={60}>60 Minutes (1 Hour)</option>
                                            <option value={90}>90 Minutes</option>
                                            <option value={120}>120 Minutes (2 Hours)</option>
                                        </select>
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium">Time allowed for the substitute to confirm availability before cascading to next teacher.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveRates}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Save Remedial Configuration &amp; Rates
                        </button>
                    </div>

                    {/* Prefects Cards Directory */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-indigo-500" /> Prefect QR Cards Directory
                        </h4>
                        <p className="text-xs text-slate-500">Print the physical verification QR cards for prefects. Teachers scan these cards to start and end remedial classes.</p>

                        <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                            {prefectsList.map(prefect => {
                                const course = courses.find(c => c.id === prefect.courseId);
                                return (
                                    <div key={prefect.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{prefect.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                                Class / Stream: {course?.name || prefect.className || 'General'}{prefect.stream ? ` • ${prefect.stream}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => printPrefectCard(prefect, false)}
                                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                                title="Preview Prefect Card & QR Code"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> Preview Card
                                            </button>
                                            <button 
                                                onClick={() => printPrefectCard(prefect, true)}
                                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                                                title="Print Prefect Verification Card"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Teacher Remedial Preferred Days & Availability Matrix */}
                    <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                        <Sliders className="w-5 h-5" />
                                    </span>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest italic">
                                        Teacher Remedial Preferred Days &amp; Availability
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                                    Designate which days each teacher prefers to conduct remedial classes. The Smart Timetable Auto-Generator prioritizes teachers on their selected days (+80 bonus score) while balancing overall load and daily caps.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search teacher..."
                                        value={teacherDaySearchQuery}
                                        onChange={e => setTeacherDaySearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                {isSavingTeacherPrefs ? (
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 animate-pulse shrink-0">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                                    </span>
                                ) : lastSavedPrefsTime ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0" title={`Auto-saved at ${lastSavedPrefsTime}`}>
                                        <Check className="w-3 h-3" /> Auto-saved
                                    </span>
                                ) : null}
                                <button
                                    onClick={handleSaveRates}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Save Preferences
                                </button>
                            </div>
                        </div>

                        {/* Teacher List Matrix */}
                        <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                            {teachersList
                                .filter(t => t.name.toLowerCase().includes(teacherDaySearchQuery.toLowerCase()))
                                .map(teacher => {
                                    const prefs = teacherPreferences[teacher.id];
                                    const selectedDays = prefs?.preferredDays || [];
                                    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

                                    return (
                                        <div
                                            key={teacher.id}
                                            className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">
                                                        {teacher.name}
                                                    </p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                        selectedDays.length === 0
                                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                            : selectedDays.length >= 5
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                                                    }`}>
                                                        {selectedDays.length === 0 ? 'Any Day Available' : `${selectedDays.length} Day${selectedDays.length === 1 ? '' : 's'} Selected`}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    {teacher.email || `ID: ${(teacher.id || '').slice(-8)}`}
                                                </p>
                                            </div>

                                            {/* Interactive 7-Day Chips & Presets */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Day Chips */}
                                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    {daysOfWeek.map((day, i) => {
                                                        const isWeekend = i >= 5;
                                                        const isSelected = selectedDays.includes(day);
                                                        const shortName = day.slice(0, 3);

                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => handleToggleTeacherDay(teacher.id, day)}
                                                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? isWeekend
                                                                            ? 'bg-amber-500 text-white shadow-sm'
                                                                            : 'bg-indigo-600 text-white shadow-sm'
                                                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                                }`}
                                                                title={`${teacher.name}: Toggle ${day}`}
                                                            >
                                                                {shortName}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Preset Shortcuts */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetTeacherDaysPreset(teacher.id, 'weekdays')}
                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 rounded-lg text-[8px] font-black uppercase text-slate-500 transition-colors cursor-pointer"
                                                        title="Set Monday through Friday"
                                                    >
                                                        Weekdays
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetTeacherDaysPreset(teacher.id, 'weekends')}
                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 rounded-lg text-[8px] font-black uppercase text-slate-500 transition-colors cursor-pointer"
                                                        title="Set Saturday & Sunday"
                                                    >
                                                        Weekends
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetTeacherDaysPreset(teacher.id, 'all')}
                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 rounded-lg text-[8px] font-black uppercase text-slate-500 transition-colors cursor-pointer"
                                                        title="Set All 7 Days"
                                                    >
                                                        All
                                                    </button>
                                                    {selectedDays.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetTeacherDaysPreset(teacher.id, 'clear')}
                                                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 rounded-lg text-[8px] font-black uppercase text-slate-400 transition-colors cursor-pointer"
                                                            title="Clear all preferences (Any day available)"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                            {teachersList.length === 0 && (
                                <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                    No teachers or lecturers registered in this institution.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PORTAL HUB */}
            {activeTab === 'portal_hub' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-6 sm:p-8 text-white space-y-4 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                            <div className="space-y-1">
                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-indigo-400" /> Public Remedial Gateway
                                </span>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Remedial Portal Hub</h3>
                                <p className="text-xs text-slate-300 max-w-lg">
                                    Share live portal access for students, parents, teachers, and prefects to verify remedial sessions, track attendance, and process payments.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=remedial-portal`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" /> Open Live Portal
                                </a>
                            </div>
                        </div>

                        {/* Portal Link Box */}
                        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-indigo-300 truncate">
                                    {`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=remedial-portal`}
                                </span>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const link = `${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=remedial-portal`;
                                        try { await navigator.clipboard.writeText(link); alert('Remedial Portal link copied to clipboard!'); } catch (_) {}
                                    }}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy Link
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Portal Hub Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card 1: Student & Parent Gateway */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Student & Parent Portal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Allows parents and students to check scheduled remedial classes, view prefect verification status, and settle remedial fee invoices online.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Role: Parent / Student</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('billing')}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Manage Billing <CreditCard className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Teacher Self-Service Portal */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Teacher & Lecturer Portal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Teachers log remedial sessions, track accrued teaching hours, view payout vouchers, and present QR codes to class prefects for verification.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Role: Teacher / Lecturer</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('payouts')}
                                    className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Manage Payouts <DollarSign className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Card 3: Prefect Verification Terminal */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <QrCode className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Prefect Verification Terminal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Class prefects scan teacher QR codes or enter digital tokens to confirm extra lesson attendance and validate taught hours.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Role: Class Prefect</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('sessions')}
                                    className="px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Verify Sessions <Clock className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Card 4: Remedial Rates & Settings */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Remedial Rate Configuration</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Configure hourly teacher pay rates, per-student fees, and fixed term remedial billing parameters.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Config & Rates</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('rates')}
                                    className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Configure Rates <Layers className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: REMEDIAL REPORTS & AUDIT HUB */}
            {activeTab === 'reports' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header & Export Actions Bar */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                    <BarChart3 className="w-3 h-3" /> Audit &amp; Payroll Intelligence
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                                Remedial Reports Suite
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                                Generate official certified PDF ledgers with school letterhead and sign-off blocks, or export structured datasets to Excel (.xlsx).
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="flex-1 sm:flex-none px-5 py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm cursor-pointer"
                            >
                                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Export Excel (.xlsx)
                            </button>

                            <button
                                type="button"
                                onClick={handleDownloadReportPdf}
                                disabled={isExporting}
                                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 border border-indigo-400/30 cursor-pointer disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-4 h-4" /> Download Official PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Executive KPI Summary Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[10px] font-black uppercase tracking-wider">Hours Delivered</span>
                                <Clock className="w-4 h-4 text-indigo-500" />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                                {reportKpis.totalDeliveredHours.toFixed(1)} <span className="text-xs font-bold text-slate-400">hrs</span>
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                                Across {reportKpis.totalSessionsCount} remedial sessions
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[10px] font-black uppercase tracking-wider">Prefect QR Verified</span>
                                <Shield className="w-4 h-4 text-emerald-500" />
                            </div>
                            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {reportKpis.verificationRate}%
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                                {reportKpis.verifiedCount} authenticated sessions
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[10px] font-black uppercase tracking-wider">Teacher Pay Liability</span>
                                <DollarSign className="w-4 h-4 text-violet-500" />
                            </div>
                            <h4 className="text-2xl font-black text-violet-600 dark:text-violet-400">
                                KES {Math.round(reportKpis.totalAccruedLiability).toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                                For {reportPayoutsData.length} instructors
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-[10px] font-black uppercase tracking-wider">Fee Arrears Balance</span>
                                <CreditCard className="w-4 h-4 text-amber-500" />
                            </div>
                            <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                KES {Math.round(reportKpis.totalArrears).toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                                KES {Math.round(reportKpis.totalCollected).toLocaleString()} collected of {Math.round(reportKpis.totalBilled).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Report Navigation Tabs & Dynamic Filters */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                        {/* Selector Tabs */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <button
                                type="button"
                                onClick={() => setSelectedReportType('master_timetable')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    selectedReportType === 'master_timetable'
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                <Calendar className="w-3.5 h-3.5" /> School Master Timetable (Weekly Grid)
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedReportType('payout_ledger')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    selectedReportType === 'payout_ledger'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                <DollarSign className="w-3.5 h-3.5" /> Teacher Payout Ledger
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedReportType('prefect_audit')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    selectedReportType === 'prefect_audit'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                <Shield className="w-3.5 h-3.5" /> Prefect QR Audit
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedReportType('billing_statement')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    selectedReportType === 'billing_statement'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                <CreditCard className="w-3.5 h-3.5" /> Student Fee Recovery
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedReportType('workload_summary')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    selectedReportType === 'workload_summary'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                <BookOpen className="w-3.5 h-3.5" /> Subject &amp; Workload
                            </button>
                        </div>

                        {/* Filter Bar Controls */}
                        {selectedReportType === 'master_timetable' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Stage / Level
                                    </label>
                                    <input
                                        type="text"
                                        value={timetableStage}
                                        onChange={e => setTimetableStage(e.target.value)}
                                        placeholder="e.g. JS, Primary"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Week
                                    </label>
                                    <input
                                        type="text"
                                        value={timetableWeek}
                                        onChange={e => setTimetableWeek(e.target.value)}
                                        placeholder="e.g. WEEK 3"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Term
                                    </label>
                                    <input
                                        type="text"
                                        value={timetableTerm}
                                        onChange={e => setTimetableTerm(e.target.value)}
                                        placeholder="e.g. TERM 3"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Year
                                    </label>
                                    <input
                                        type="text"
                                        value={timetableYear}
                                        onChange={e => setTimetableYear(e.target.value)}
                                        placeholder="e.g. 2026"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Sat Duty Staff
                                    </label>
                                    <input
                                        type="text"
                                        value={timetableSatDuty}
                                        onChange={e => setTimetableSatDuty(e.target.value)}
                                        placeholder="e.g. 38, 32"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Sun Duty Staff
                                    </label>
                                    <input
                                        type="text"
                                        value={timetableSunDuty}
                                        onChange={e => setTimetableSunDuty(e.target.value)}
                                        placeholder="e.g. 14, 13"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={reportStartDate}
                                        onChange={e => setReportStartDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={reportEndDate}
                                        onChange={e => setReportEndDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Filter Teacher
                                    </label>
                                    <select
                                        value={reportTeacherFilter}
                                        onChange={e => setReportTeacherFilter(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white cursor-pointer"
                                    >
                                        <option value="All">All Instructors</option>
                                        {teachersList.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Filter Class
                                    </label>
                                    <select
                                        value={reportClassFilter}
                                        onChange={e => setReportClassFilter(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white cursor-pointer"
                                    >
                                        <option value="All">All Classes / Grades</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Interactive Data Table Preview */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                            {/* 0. MASTER TIMETABLE PREVIEW (EXACT LAYOUT OF SCHOOL SCHEDULE) */}
                            {selectedReportType === 'master_timetable' && (
                                <div className="space-y-6 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl">
                                    {/* Timetable Header Card */}
                                    <div className="text-center py-4 border-b-2 border-slate-900 dark:border-slate-100 space-y-1">
                                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                            {currentInstitution?.name || 'KIPKEINO SCHOOL'}
                                        </h2>
                                        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
                                            {timetableStage ? `${timetableStage} ` : ''}{timetableWeek} {timetableTerm} {timetableYear} REMEDIAL TT
                                        </h3>
                                    </div>

                                    {/* TABLE 1: WEEKDAY TIMETABLE (MONDAY TO FRIDAY) */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Weekday Tuition Schedule (Monday – Friday)
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                Weekday window: {weekdayStartTime} – {weekdayEndTime}
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto border-2 border-slate-800 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900">
                                            <table className="w-full text-center text-xs border-collapse">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase text-slate-900 dark:text-white border-b-2 border-slate-800 dark:border-slate-600">
                                                    <tr>
                                                        <th className="py-2.5 px-3 border-r-2 border-slate-800 dark:border-slate-600 w-16 bg-slate-200/80 dark:bg-slate-700/80">Class</th>
                                                        <th className="py-2.5 px-3 border-r border-slate-400 dark:border-slate-700">MONDAY</th>
                                                        <th className="py-2.5 px-3 border-r border-slate-400 dark:border-slate-700">TUESDAY</th>
                                                        <th className="py-2.5 px-3 border-r border-slate-400 dark:border-slate-700">WEDNESDAY</th>
                                                        <th className="py-2.5 px-3 border-r border-slate-400 dark:border-slate-700">THURSDAY</th>
                                                        <th className="py-2.5 px-3">FRIDAY</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y border-slate-800 dark:border-slate-600">
                                                    {getDistinctTimetableClasses(allocations, courses).map(cls => (
                                                        <tr key={cls.sortKey} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                                                            <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white border-r-2 border-slate-800 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/80">
                                                                {cls.shortCode}
                                                            </td>
                                                            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map((day, dIdx) => {
                                                                const matches = allocations.filter(a =>
                                                                    a.dayOfWeek === day &&
                                                                    (a.className === cls.className || a.courseId === cls.className) &&
                                                                    matchAllocationStream(a, cls.stream)
                                                                );
                                                                return (
                                                                    <td key={day} className={`py-2 px-2 text-[11px] font-bold ${dIdx < 4 ? 'border-r border-slate-300 dark:border-slate-700' : ''}`}>
                                                                        {matches.length === 0 ? (
                                                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                        ) : (
                                                                            matches.map((a, mIdx) => (
                                                                                <div key={mIdx} className="font-mono text-slate-900 dark:text-white font-extrabold">
                                                                                    <span className="text-indigo-700 dark:text-indigo-400">{getSubjectCode(a.subjectName, a.subjectId)}</span>{' '}
                                                                                    <span className="text-slate-700 dark:text-slate-300">{getTeacherCode(a.teacherId, a.teacherName, enrichedUsers)}</span>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TABLE 2: SATURDAY TIMETABLE */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Saturday Schedule – Duty {timetableSatDuty}
                                            </h4>
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                                                Weekend Recess: 10:00 – 10:30 (Break)
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto border-2 border-slate-800 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900">
                                            <table className="w-full text-center text-xs border-collapse">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase text-slate-900 dark:text-white border-b-2 border-slate-800 dark:border-slate-600">
                                                    <tr>
                                                        <th className="py-2.5 px-3 border-r-2 border-slate-800 dark:border-slate-600 w-16 bg-slate-200/80 dark:bg-slate-700/80">Class</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700">08:00 - 09:00</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700">09:00 - 10:00</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700 bg-amber-200/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">10:00 - 10:30</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700">10:30 - 11:30</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700">11:30 - 12:30</th>
                                                        <th className="py-2.5 px-2">12:30 - 13:30</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y border-slate-800 dark:border-slate-600">
                                                    {getDistinctTimetableClasses(allocations, courses).map(cls => (
                                                        <tr key={cls.sortKey} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                                                            <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white border-r-2 border-slate-800 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/80">
                                                                {cls.shortCode}
                                                            </td>
                                                            {[
                                                                { start: '08:00', end: '09:00', isBreak: false },
                                                                { start: '09:00', end: '10:00', isBreak: false },
                                                                { isBreak: true },
                                                                { start: '10:30', end: '11:30', isBreak: false },
                                                                { start: '11:30', end: '12:30', isBreak: false },
                                                                { start: '12:30', end: '13:30', isBreak: false }
                                                            ].map((slot, sIdx) => {
                                                                if (slot.isBreak) {
                                                                    return (
                                                                        <td key={sIdx} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black tracking-widest text-[10px]">
                                                                            BREAK
                                                                        </td>
                                                                    );
                                                                }
                                                                const matches = allocations.filter(a =>
                                                                    a.dayOfWeek === 'Saturday' &&
                                                                    (a.className === cls.className || a.courseId === cls.className) &&
                                                                    matchAllocationStream(a, cls.stream) &&
                                                                    (a.startTime && slot.start && slot.end ? a.startTime >= slot.start && a.startTime < slot.end : true)
                                                                );
                                                                return (
                                                                    <td key={sIdx} className={`py-2 px-2 text-[11px] font-bold ${sIdx < 5 ? 'border-r border-slate-300 dark:border-slate-700' : ''}`}>
                                                                        {matches.length === 0 ? (
                                                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                        ) : (
                                                                            matches.map((a, mIdx) => (
                                                                                <div key={mIdx} className="font-mono text-slate-900 dark:text-white font-extrabold">
                                                                                    <span className="text-indigo-700 dark:text-indigo-400">{getSubjectCode(a.subjectName, a.subjectId)}</span>{' '}
                                                                                    <span className="text-slate-700 dark:text-slate-300">{getTeacherCode(a.teacherId, a.teacherName, enrichedUsers)}</span>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TABLE 3: SUNDAY TIMETABLE */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Sunday Schedule – Duty {timetableSunDuty}
                                            </h4>
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                                                Sunday Recess: 11:00 – 11:30 (Break)
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto border-2 border-slate-800 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900">
                                            <table className="w-full text-center text-xs border-collapse">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase text-slate-900 dark:text-white border-b-2 border-slate-800 dark:border-slate-600">
                                                    <tr>
                                                        <th className="py-2.5 px-3 border-r-2 border-slate-800 dark:border-slate-600 w-16 bg-slate-200/80 dark:bg-slate-700/80">Class</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700">09:30 - 11:00</th>
                                                        <th className="py-2.5 px-2 border-r border-slate-400 dark:border-slate-700 bg-amber-200/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">11:00 - 11:30</th>
                                                        <th className="py-2.5 px-2">11:30 - 13:00</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y border-slate-800 dark:border-slate-600">
                                                    {getDistinctTimetableClasses(allocations, courses).map(cls => (
                                                        <tr key={cls.sortKey} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                                                            <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white border-r-2 border-slate-800 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/80">
                                                                {cls.shortCode}
                                                            </td>
                                                            {[
                                                                { start: '09:30', end: '11:00', isBreak: false },
                                                                { isBreak: true },
                                                                { start: '11:30', end: '13:00', isBreak: false }
                                                            ].map((slot, sIdx) => {
                                                                if (slot.isBreak) {
                                                                    return (
                                                                        <td key={sIdx} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black tracking-widest text-[10px]">
                                                                            BREAK
                                                                        </td>
                                                                    );
                                                                }
                                                                const matches = allocations.filter(a =>
                                                                    a.dayOfWeek === 'Sunday' &&
                                                                    (a.className === cls.className || a.courseId === cls.className) &&
                                                                    matchAllocationStream(a, cls.stream) &&
                                                                    (a.startTime && slot.start && slot.end ? a.startTime >= slot.start && a.startTime < slot.end : true)
                                                                );
                                                                return (
                                                                    <td key={sIdx} className={`py-2 px-2 text-[11px] font-bold ${sIdx < 2 ? 'border-r border-slate-300 dark:border-slate-700' : ''}`}>
                                                                        {matches.length === 0 ? (
                                                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                        ) : (
                                                                            matches.map((a, mIdx) => (
                                                                                <div key={mIdx} className="font-mono text-slate-900 dark:text-white font-extrabold">
                                                                                    <span className="text-indigo-700 dark:text-indigo-400">{getSubjectCode(a.subjectName, a.subjectId)}</span>{' '}
                                                                                    <span className="text-slate-700 dark:text-slate-300">{getTeacherCode(a.teacherId, a.teacherName, enrichedUsers)}</span>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TABLE 4: REFERENCE LEGEND (SUBJECT & STAFF CODE DIRECTORY) */}
                                    <div className="space-y-2 pt-2">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            Reference Key (Subject &amp; Staff Code Directory)
                                        </h4>
                                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="py-2 px-3 w-28">Subject Code</th>
                                                        <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">Subject Name</th>
                                                        <th className="py-2 px-3 w-24">Staff Code</th>
                                                        <th className="py-2 px-3">Teacher Name</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {(() => {
                                                        const subMap = new Map<string, string>();
                                                        const teachMap = new Map<string, string>();
                                                        allocations.forEach(a => {
                                                            const sCode = getSubjectCode(a.subjectName, a.subjectId);
                                                            if (sCode && a.subjectName) subMap.set(sCode, a.subjectName);
                                                            const tCode = getTeacherCode(a.teacherId, a.teacherName, enrichedUsers);
                                                            if (tCode && a.teacherName) teachMap.set(tCode, a.teacherName);
                                                        });
                                                        const subArr = Array.from(subMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                                                        const teachArr = Array.from(teachMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
                                                        const maxL = Math.max(subArr.length, teachArr.length, 1);
                                                        const rows = [];
                                                        for (let i = 0; i < maxL; i++) {
                                                            const s = subArr[i];
                                                            const t = teachArr[i];
                                                            rows.push(
                                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                                    <td className="py-1.5 px-3 font-mono font-black text-indigo-700 dark:text-indigo-400">{s ? s[0] : '-'}</td>
                                                                    <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">{s ? s[1] : '-'}</td>
                                                                    <td className="py-1.5 px-3 font-mono font-black text-slate-900 dark:text-white">{t ? t[0] : '-'}</td>
                                                                    <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">{t ? t[1] : '-'}</td>
                                                                </tr>
                                                            );
                                                        }
                                                        return rows;
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TABLE 5: OFFICIAL SIGN-OFF CERTIFICATION BLOCK */}
                                    <div className="pt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                                            <div className="space-y-1">
                                                <div className="h-10"></div>
                                                <div className="border-t-2 border-slate-900 dark:border-slate-300 pt-1">
                                                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Director of Studies</p>
                                                    <p className="text-[9px] text-slate-400">Signature &amp; Date</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="h-10"></div>
                                                <div className="border-t-2 border-slate-900 dark:border-slate-300 pt-1">
                                                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Remedial Coordinator</p>
                                                    <p className="text-[9px] text-slate-400">Signature &amp; Date</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="h-10"></div>
                                                <div className="border-t-2 border-slate-900 dark:border-slate-300 pt-1">
                                                    <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Principal / Headteacher</p>
                                                    <p className="text-[9px] text-slate-400">Official Seal &amp; Stamp</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 1. PAYOUT LEDGER TABLE */}
                            {selectedReportType === 'payout_ledger' && (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4">Instructor</th>
                                            <th className="py-3 px-4 text-center">Weekday</th>
                                            <th className="py-3 px-4 text-center">Weekend</th>
                                            <th className="py-3 px-4 text-center">Total Hrs</th>
                                            <th className="py-3 px-4 text-center">Tariff Rates (KES)</th>
                                            <th className="py-3 px-4 text-right">Gross Payable</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reportPayoutsData.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                                                    No remedial sessions recorded within the selected period or filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            reportPayoutsData.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        {p.teacherName}
                                                        {p.teacherEmail && (
                                                            <span className="block text-[10px] font-normal text-slate-400">{p.teacherEmail}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono">{p.weekdayHours}h</td>
                                                    <td className="py-3.5 px-4 text-center font-mono">{p.weekendHours}h</td>
                                                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        {p.totalHours}h
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center text-[11px] text-slate-500 font-mono">
                                                        {p.hourlyRate?.toLocaleString()} / {p.weekendRate?.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                                                        KES {Math.round(p.totalAmount).toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            p.status === 'Paid'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : p.status === 'Approved'
                                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {reportPayoutsData.length > 0 && (
                                        <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <td className="py-3 px-4 uppercase text-[10px] tracking-wider">Grand Totals</td>
                                                <td className="py-3 px-4 text-center font-mono">
                                                    {reportPayoutsData.reduce((acc, p) => acc + p.weekdayHours, 0)}h
                                                </td>
                                                <td className="py-3 px-4 text-center font-mono">
                                                    {reportPayoutsData.reduce((acc, p) => acc + p.weekendHours, 0)}h
                                                </td>
                                                <td className="py-3 px-4 text-center font-mono text-indigo-600 dark:text-indigo-400">
                                                    {reportPayoutsData.reduce((acc, p) => acc + p.totalHours, 0)}h
                                                </td>
                                                <td className="py-3 px-4 text-center">-</td>
                                                <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                                    KES {Math.round(reportPayoutsData.reduce((acc, p) => acc + p.totalAmount, 0)).toLocaleString()}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            )}

                            {/* 2. PREFECT QR AUDIT TABLE */}
                            {selectedReportType === 'prefect_audit' && (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4">Date</th>
                                            <th className="py-3 px-4">Subject</th>
                                            <th className="py-3 px-4">Class &amp; Stream</th>
                                            <th className="py-3 px-4">Teacher</th>
                                            <th className="py-3 px-4">Prefect Signer</th>
                                            <th className="py-3 px-4 text-center">Duration</th>
                                            <th className="py-3 px-4 text-center">Verification Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reportPrefectAuditData.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                                                    No session logs matched the selected criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            reportPrefectAuditData.map((s, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">{s.date}</td>
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{s.subjectName}</td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {s.className} {s.stream ? `(${s.stream})` : ''}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">{s.teacherName}</td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                        {s.prefectName}
                                                        {s.qrToken && (
                                                            <span className="block font-mono text-[9px] text-slate-400">
                                                                Token: {s.qrToken.slice(-8)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        {s.hours}h
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            s.status === 'Prefect Confirmed' || s.status === 'Approved' || s.status === 'Paid'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                        }`}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 3. STUDENT BILLING TABLE */}
                            {selectedReportType === 'billing_statement' && (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4">Student Name</th>
                                            <th className="py-3 px-4">Class &amp; Stream</th>
                                            <th className="py-3 px-4">Invoice #</th>
                                            <th className="py-3 px-4 text-right">Billed Fee</th>
                                            <th className="py-3 px-4 text-right">Paid</th>
                                            <th className="py-3 px-4 text-right">Arrears Balance</th>
                                            <th className="py-3 px-4 text-center">Parent Contact</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reportBillingData.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                                                    No student billing records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            reportBillingData.map((b, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{b.studentName}</td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {b.className} {b.stream ? `(${b.stream})` : ''}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-slate-500">{b.invoiceNumber}</td>
                                                    <td className="py-3.5 px-4 text-right font-mono">KES {Math.round(b.termFee).toLocaleString()}</td>
                                                    <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                                        KES {Math.round(b.paidAmount).toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                                        KES {Math.round(b.balance).toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">{b.parentPhone}</td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            b.status === 'Paid'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : b.status === 'Partial'
                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                        }`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* 4. WORKLOAD & SUBJECT SUMMARY TABLE */}
                            {selectedReportType === 'workload_summary' && (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4">Subject</th>
                                            <th className="py-3 px-4 text-center">Priority</th>
                                            <th className="py-3 px-4 text-center">Allocated Weekly Slots</th>
                                            <th className="py-3 px-4 text-center">Delivered Sessions</th>
                                            <th className="py-3 px-4 text-center">Total Hours Taught</th>
                                            <th className="py-3 px-4 text-center">Assigned Teachers</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reportWorkloadData.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                                                    No subject workload data recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            reportWorkloadData.map((w, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{w.subjectName}</td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            w.priority === 'High'
                                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                                        }`}>
                                                            {w.priority}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono font-bold">{w.allocatedSessions} slots</td>
                                                    <td className="py-3.5 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400">
                                                        {w.deliveredSessions} sessions
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        {w.totalHours.toFixed(1)} hrs
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono">{w.teacherCount} teachers</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Official Sign-off Notice Banner */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 text-slate-500 text-[11px]">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span>
                                    All generated PDF reports automatically include your institution's official letterhead and three certification signature lines (DOS, Bursar, and Principal).
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">Official Academic Seal</span>
                        </div>
                    </div>
                </div>
            )}
            </div>
            </div>
        </div>

            {/* PREFECT QR CARD INTERACTIVE SCREEN PREVIEW MODAL */}
            {printingPrefect && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in no-print overflow-y-auto" 
                    onClick={() => setPrintingPrefect(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 relative my-auto" 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                                    <QrCode className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Prefect Card Preview</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remedial Lesson Validation Pass</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPrintingPrefect(null)} 
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                                  {/* Card Preview Graphic */}
                        <div className="p-6 sm:p-8 flex flex-col items-center">
                            <div className="w-full max-w-xs bg-white text-black p-6 rounded-[2rem] border-4 border-double border-indigo-600 text-center shadow-lg space-y-4">
                                <div>
                                    {(currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo) && (
                                        <img 
                                            src={currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo} 
                                            alt="School Logo" 
                                            className="w-12 h-12 object-contain mx-auto mb-2 drop-shadow-sm" 
                                        />
                                    )}
                                    <h4 className="text-sm font-black uppercase tracking-tight text-indigo-950 leading-tight">
                                        {currentInstitution?.name || 'SCHOOL REMEDIAL PROGRAM'}
                                    </h4>
                                    <span className="inline-block mt-2 px-3 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                                        Class Prefect Card
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-slate-900 break-words leading-tight px-2 max-w-full">
                                        {printingPrefect.name}
                                    </h3>
                                    <p className="text-xs font-black uppercase text-indigo-600 mt-0.5">
                                        Stream: {courses.find(c => c.id === printingPrefect.courseId)?.name || 'Class'}
                                    </p>
                                </div>

                                {/* QR Code Display Container */}
                                <div className="mx-auto w-[180px] h-[180px] border-2 border-dashed border-slate-200 p-2 rounded-2xl flex items-center justify-center bg-white">
                                    {isGeneratingQr ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                                            <span className="text-[10px] font-black uppercase text-slate-400">Generating QR...</span>
                                        </div>
                                    ) : prefectQrUrl ? (
                                        <img 
                                            src={prefectQrUrl} 
                                            alt="Prefect QR Code" 
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`prefect_remedial_token_class_${printingPrefect.courseId}`)}`}
                                            alt="Prefect QR Code" 
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                </div>

                                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                                    <p className="text-[9px] font-mono font-bold text-slate-600 select-all">
                                        Token: prefect_remedial_token_class_{printingPrefect.courseId}
                                    </p>
                                </div>

                                <p className="text-[9px] text-slate-500 uppercase font-medium leading-relaxed border-t border-slate-100 pt-3">
                                    Teachers scan this token to authenticate session start &amp; end.
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-700">
                                    REMEDIAL LESSONS SCAN CARD
                                </p>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 justify-end">
                            <button
                                onClick={() => downloadPrefectCardPdf(
                                    printingPrefect,
                                    prefectQrUrl,
                                    courses.find(c => c.id === printingPrefect.courseId)?.name || 'Class',
                                    currentInstitution?.name || 'School Remedial Program',
                                    currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo || null
                                )}
                                className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                            <button
                                onClick={() => handlePrintPrefectCard(printingPrefect)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Printer className="w-4 h-4" /> Print Card
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* DOM Print Sheet for Native Browser Print Preview (Includes .print-only to override body visibility:hidden) */}
            {printingPrefect && (
                <div id="prefect-print-sheet" className="print-only hidden print:flex fixed inset-0 bg-white z-[999999] flex-col items-center justify-center p-8 text-black text-center font-sans">
                    <div className="border-4 border-double border-indigo-600 p-8 max-w-sm w-full mx-auto rounded-[2rem] space-y-4 bg-white">
                        {(currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo) && (
                            <img 
                                src={currentInstitution?.logoUrl || (currentInstitution as any)?.logo_url || (currentInstitution as any)?.logo} 
                                alt="School Logo" 
                                className="w-14 h-14 object-contain mx-auto mb-2" 
                            />
                        )}
                        <h2 className="text-lg font-black uppercase tracking-tight text-indigo-900">
                            {currentInstitution?.name || 'SCHOOL REMEDIAL PROGRAM'}
                        </h2>
                        <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                            Class Prefect Card
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 break-words leading-tight px-2 max-w-full">
                                {printingPrefect.name}
                            </h3>
                            <p className="text-xs font-black uppercase text-indigo-600 mt-1">
                                Stream: {courses.find(c => c.id === printingPrefect.courseId)?.name || 'Class'}
                            </p>
                        </div>
                        
                        {/* High-quality physical QR code */}
                        <div className="mx-auto w-[200px] h-[200px] border-2 border-dashed border-slate-300 p-2 rounded-2xl flex items-center justify-center bg-white">
                            {prefectQrUrl ? (
                                <img 
                                    src={prefectQrUrl} 
                                    alt="Prefect Validation QR" 
                                    className="w-full h-full object-contain" 
                                />
                            ) : (
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`prefect_remedial_token_class_${printingPrefect.courseId}`)}`} 
                                    alt="Prefect Validation QR" 
                                    className="w-full h-full object-contain" 
                                />
                            )}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
                            <p className="text-[9px] font-mono font-bold text-slate-600">
                                Token ID: prefect_remedial_token_class_{printingPrefect.courseId}
                            </p>
                        </div>
                        <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide border-t border-slate-100 pt-3">
                            Scan this card to verify remedial session initiation &amp; conclusion
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                            REMEDIAL LESSONS SCAN CARD
                        </p>
                    </div>
                </div>
            )}

            {/* MANUAL LOG SESSION MODAL */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Manually Log approved Remedial</h3>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleManualLog} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Teacher</label>
                                <select 
                                    value={manualTeacherId}
                                    onChange={e => setManualTeacherId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                >
                                    <option value="">-- Select Teacher --</option>
                                    {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                                <select 
                                    value={manualSubjectId}
                                    onChange={e => setManualSubjectId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                >
                                    <option value="">-- Select Remedial Subject --</option>
                                    {activeRemedialSubjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Class</label>
                                    <select 
                                        value={manualCourseId}
                                        onChange={e => {
                                            setManualCourseId(e.target.value);
                                            setManualStream('All Streams');
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                    >
                                        <option value="">-- Select Class --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Stream</label>
                                    <select 
                                        value={manualStream}
                                        onChange={e => setManualStream(e.target.value)}
                                        disabled={!manualCourseId}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white disabled:opacity-50"
                                    >
                                        <option value="All Streams">All Streams</option>
                                        {availableStreamsForManualLog.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                                    <span>Class Prefect</span>
                                    {manualPrefectId && (
                                        <span className="text-amber-600 dark:text-amber-400 font-bold lowercase text-[9px] flex items-center gap-1">
                                            <Shield className="w-2.5 h-2.5" /> auto-linked
                                        </span>
                                    )}
                                </label>
                                <select 
                                    value={manualPrefectId}
                                    onChange={e => setManualPrefectId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                >
                                    <option value="">-- Select Prefect --</option>
                                    {prefectsList.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}{p.stream ? ` • Stream ${p.stream}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Hours</label>
                                    <input 
                                        type="number"
                                        value={manualHours}
                                        onChange={e => setManualHours(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Date</label>
                                    <input 
                                        type="date"
                                        value={manualDate}
                                        onChange={e => setManualDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white font-mono"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all mt-4"
                            >
                                Log & Approve Hours
                            </button>
                        </form>
                    </div>
                </div>
            )}

        {/* ===== MANUAL ALLOCATION MODAL ===== */}
        {showAllocModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-500" /> {editingAlloc ? 'Edit Allocation' : 'Manual Allocation'}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {editingAlloc ? 'Modify scheduling, subject, class, stream, or teacher' : 'Assign a subject & teacher with instant slot conflict protection'}
                            </p>
                        </div>
                        <button
                            onClick={() => { setShowAllocModal(false); setEditingAlloc(null); }}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleCreateManualAllocation} className="p-7 space-y-5 overflow-y-auto">
                        {/* Class & Stream Selection with Joint Class Support */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        {isJointAlloc ? 'Primary Class / Grade' : 'Class / Grade'}
                                    </label>
                                    <select
                                        value={allocCourseId}
                                        onChange={e => {
                                            setAllocCourseId(e.target.value);
                                            setAllocStream('All Streams');
                                            setCustomAllocStream('');
                                            setJointStreamsSelected([]);
                                        }}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    >
                                        <option value="">-- Select Class --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {!isJointAlloc ? (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                                            <span>Stream</span>
                                            {allocStream && allocStream !== 'All Streams' && allocStream !== '__custom__' && (
                                                <span className="text-indigo-600 dark:text-indigo-400 font-bold lowercase text-[9px]">(specific)</span>
                                            )}
                                        </label>
                                        <select
                                            value={allocStream}
                                            onChange={e => setAllocStream(e.target.value)}
                                            disabled={!allocCourseId}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white disabled:opacity-50"
                                        >
                                            <option value="All Streams">All Streams (Whole Class)</option>
                                            {availableStreamsForAlloc.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                            <option value="__custom__">+ Custom / Specific Stream...</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center justify-between">
                                            <span>Joint Mode</span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">Active</span>
                                        </label>
                                        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                                            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>Multiple Streams Combined</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Joint Class Toggle Banner */}
                            <div className={`p-3.5 rounded-2xl border transition-all ${
                                isJointAlloc 
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 shadow-xs' 
                                    : 'bg-slate-50/90 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isJointAlloc}
                                            onChange={e => {
                                                const next = e.target.checked;
                                                setIsJointAlloc(next);
                                                if (next && jointStreamsSelected.length === 0 && availableStreamsForAlloc.length > 0) {
                                                    setJointStreamsSelected(availableStreamsForAlloc.slice(0, 2));
                                                }
                                            }}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                                        />
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                Joint Class / Multi-Stream Allocation
                                            </span>
                                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                                Enable when one teacher teaches a subject (e.g. CRE, IRE, Electives) for multiple streams at once.
                                            </p>
                                        </div>
                                    </label>
                                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                        isJointAlloc 
                                            ? 'bg-emerald-600 text-white shadow-xs' 
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {isJointAlloc ? 'Joint Enabled' : 'Single Stream'}
                                    </span>
                                </div>

                                {/* Joint Streams Selection Panel */}
                                {isJointAlloc && (
                                    <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-3 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                                                Select Streams taking this lesson jointly:
                                            </span>
                                            {availableStreamsForAlloc.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setJointStreamsSelected([...availableStreamsForAlloc])}
                                                        className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                                                    >
                                                        Select All
                                                    </button>
                                                    <span className="text-emerald-300 dark:text-emerald-700">•</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setJointStreamsSelected([])}
                                                        className="text-[9px] font-bold text-slate-500 hover:underline"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {availableStreamsForAlloc.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {availableStreamsForAlloc.map(s => {
                                                    const isChecked = jointStreamsSelected.includes(s);
                                                    return (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isChecked) {
                                                                    setJointStreamsSelected(prev => prev.filter(x => x !== s));
                                                                } else {
                                                                    setJointStreamsSelected(prev => [...prev, s]);
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                                isChecked
                                                                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                                                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                                                            }`}
                                                        >
                                                            {isChecked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                                                            Stream {s}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[9.5px] text-amber-600 dark:text-amber-400 italic">
                                                No predefined streams detected for this class. You can add stream names below:
                                            </p>
                                        )}

                                        {/* Additional / Custom Stream Adder */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="text"
                                                placeholder="Add custom stream (e.g. East, West, North, Red)..."
                                                value={customJointStream}
                                                onChange={e => setCustomJointStream(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (customJointStream.trim() && !jointStreamsSelected.includes(customJointStream.trim())) {
                                                            setJointStreamsSelected(prev => [...prev, customJointStream.trim()]);
                                                            setCustomJointStream('');
                                                        }
                                                    }
                                                }}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (customJointStream.trim() && !jointStreamsSelected.includes(customJointStream.trim())) {
                                                        setJointStreamsSelected(prev => [...prev, customJointStream.trim()]);
                                                        setCustomJointStream('');
                                                    }
                                                }}
                                                disabled={!customJointStream.trim()}
                                                className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-emerald-700 transition-all shadow-xs"
                                            >
                                                + Add Stream
                                            </button>
                                        </div>

                                        {/* Optional Cross-Class Joining */}
                                        <details className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 cursor-pointer">
                                            <summary className="font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 select-none flex items-center gap-1">
                                                <span>🤝</span> Optional: Combine with another Class / Level
                                            </summary>
                                            <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                                                    Select other classes that attend this joint lesson at the same time:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {courses.filter(c => c.id !== allocCourseId).map(c => {
                                                        const isChecked = jointCoursesSelected.includes(c.id);
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isChecked) {
                                                                        setJointCoursesSelected(prev => prev.filter(x => x !== c.id));
                                                                    } else {
                                                                        setJointCoursesSelected(prev => [...prev, c.id]);
                                                                    }
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all ${
                                                                    isChecked
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                {c.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </details>

                                        {/* Selected Summary Preview */}
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🤝</span>
                                                <div>
                                                    <p className="text-[10.5px] font-black uppercase text-emerald-900 dark:text-emerald-200">
                                                        {jointStreamsSelected.length > 0 
                                                            ? `Joint Streams: ${jointStreamsSelected.join(' + ')}` 
                                                            : 'Please pick or add at least 2 streams above'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-medium">
                                                        Lesson will show up for each stream's timetable and can be signed off by either stream prefect.
                                                    </p>
                                                </div>
                                            </div>
                                            {jointStreamsSelected.length > 0 && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                                    {jointStreamsSelected.length} Streams
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isJointAlloc && allocStream === '__custom__' && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Custom Stream Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. East, West, North, Red, Stream A..."
                                        value={customAllocStream}
                                        onChange={e => setCustomAllocStream(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Subject</label>
                            <select
                                value={allocSubjectId}
                                onChange={e => setAllocSubjectId(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="">-- Select Remedial Subject --</option>
                                {activeRemedialSubjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Subject Scheduling Restrictions Warning */}
                        {(() => {
                            const selRemSub = allocSubjectId ? remedialSubjects.find(rs => rs.subjectId === allocSubjectId || rs.id === allocSubjectId) : null;
                            const hasAllowedDays = (selRemSub?.allowedDays?.length ?? 0) > 0;
                            const hasAllowedPeriods = (selRemSub?.allowedPeriods?.length ?? 0) > 0;
                            if (!selRemSub || (!hasAllowedDays && !hasAllowedPeriods)) return null;
                            const dayViolation = hasAllowedDays && allocDay && !(selRemSub.allowedDays || []).includes(allocDay as any);
                            return (
                                <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-[10px] font-bold ${
                                    dayViolation
                                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                }`}>
                                    <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <div className="space-y-0.5">
                                        <p className="font-black uppercase tracking-wider text-[9px]">Scheduling Restriction — {selRemSub.subjectName}</p>
                                        {hasAllowedDays && (
                                            <p>Days: <span className="font-black">{(selRemSub.allowedDays || []).join(', ')}</span> only
                                                {dayViolation ? <span className="ml-1 text-rose-600 dark:text-rose-400"> ⛔ Current day not allowed!</span> : null}
                                            </p>
                                        )}
                                        {hasAllowedPeriods && (
                                            <p>Periods: <span className="font-black">{(selRemSub.allowedPeriods || []).map(p => `P${p}`).join(', ')}</span> only</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Teacher */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Teacher</label>
                            <select
                                value={allocTeacherId}
                                onChange={e => setAllocTeacherId(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="">-- Select Teacher --</option>
                                {teachersList.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Day of Week */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Day of Week</label>
                            <div className="grid grid-cols-7 gap-1">
                                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((short, i) => {
                                    const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
                                    const fullDay = fullDays[i];
                                    const isWeekend = i >= 5;
                                    const isSelected = allocDay === fullDay;
                                    const selRemSub2 = allocSubjectId ? remedialSubjects.find(rs => rs.subjectId === allocSubjectId || rs.id === allocSubjectId) : null;
                                    const isBlocked = (selRemSub2?.allowedDays?.length ?? 0) > 0 && !(selRemSub2?.allowedDays || []).includes(fullDay as any);
                                    return (
                                        <button
                                            key={fullDay}
                                            type="button"
                                            disabled={isBlocked}
                                            title={isBlocked ? `${selRemSub2?.subjectName || 'Subject'} cannot be scheduled on ${fullDay}` : fullDay}
                                            onClick={() => {
                                                setAllocDay(fullDay);
                                                if (fullDay === 'Saturday') {
                                                    setAllocStartTime(saturdayStartTime || '08:00');
                                                    setAllocEndTime(includeSaturdayBreak ? (saturdayBreakStartTime || '10:00') : (saturdayEndTime || '12:00'));
                                                } else if (fullDay === 'Sunday') {
                                                    setAllocStartTime(sundayStartTime || '09:00');
                                                    setAllocEndTime(includeSundayBreak ? (sundayBreakStartTime || '11:00') : (sundayEndTime || '13:00'));
                                                } else {
                                                    setAllocStartTime(weekdayStartTime || '16:00');
                                                    setAllocEndTime(weekdayEndTime || '18:00');
                                                }
                                            }}
                                            className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                                                isBlocked
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 line-through cursor-not-allowed opacity-50'
                                                    : isSelected
                                                        ? isWeekend
                                                            ? 'bg-amber-500 text-white shadow-md'
                                                            : 'bg-indigo-600 text-white shadow-md'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >
                                            {short}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Interactive Slot Availability Selector */}
                        <div className="space-y-2.5 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    Available Periods ({allocDay})
                                </label>
                                <span className="text-[9px] font-bold text-slate-400">
                                    Click any free slot to apply
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {modalCandidateSlots.map((s, idx) => {
                                    const avail = getModalSlotAvailability(s);
                                    const isSelected = allocStartTime === s.startTime && allocEndTime === s.endTime;

                                    if (s.isBreak) {
                                        return (
                                            <div
                                                key={`break-${idx}`}
                                                className="p-2.5 rounded-xl border border-dashed border-amber-300/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between opacity-70 select-none col-span-1 sm:col-span-2"
                                            >
                                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                                    <Coffee className="w-3.5 h-3.5" /> {s.label}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    Recess
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={`${s.startTime}-${idx}`}
                                            type="button"
                                            onClick={() => {
                                                if (avail.isAvailable || allowManualCollisionOverride) {
                                                    setAllocStartTime(s.startTime);
                                                    setAllocEndTime(s.endTime);
                                                } else {
                                                    if (window.confirm(
                                                        `Slot Overlap Notice:\n\n• ${avail.reason}\n\n` +
                                                        `This period already has a lesson scheduled. To place another lesson here, you must enable collision override.\n\n` +
                                                        `Select this slot and enable override?`
                                                    )) {
                                                        setAllocStartTime(s.startTime);
                                                        setAllocEndTime(s.endTime);
                                                        setAllowManualCollisionOverride(true);
                                                    }
                                                }
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 ${
                                                isSelected
                                                    ? 'ring-2 ring-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                                                    : avail.isAvailable
                                                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-xs'
                                                        : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/80 opacity-90'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[11px] font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-1">
                                                    {s.startTime} - {s.endTime}
                                                </span>
                                                <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                    avail.isAvailable
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                                        : avail.isClassOccupied
                                                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                }`}>
                                                    {avail.isAvailable ? 'Free Slot' : avail.isClassOccupied ? `Occupied (${avail.count})` : 'Teacher Busy'}
                                                </span>
                                            </div>

                                            <p className={`text-[9.5px] font-semibold truncate ${
                                                avail.isAvailable 
                                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                                    : avail.isClassOccupied 
                                                        ? 'text-rose-600 dark:text-rose-400' 
                                                        : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                                {avail.isAvailable ? '✓ Ready for allocation' : `✗ ${avail.reason}`}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Window Custom Adjuster */}
                        <div className="space-y-2 pt-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Start Time</label>
                                    <input
                                        type="time"
                                        value={allocStartTime}
                                        onChange={e => setAllocStartTime(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold font-mono outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">End Time</label>
                                    <input
                                        type="time"
                                        value={allocEndTime}
                                        onChange={e => setAllocEndTime(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold font-mono outline-none focus:border-indigo-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            {allocDay === 'Saturday' && includeSaturdayBreak && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Coffee className="w-3 h-3" /> Saturday Break Slots:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(saturdayStartTime || '08:00');
                                            setAllocEndTime(saturdayBreakStartTime || '10:00');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Pre-Break ({saturdayStartTime || '08:00'} - {saturdayBreakStartTime || '10:00'})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(saturdayBreakEndTime || '10:30');
                                            setAllocEndTime(saturdayEndTime || '12:30');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Post-Break ({saturdayBreakEndTime || '10:30'} - {saturdayEndTime || '12:30'})
                                    </button>
                                </div>
                            )}

                            {allocDay === 'Saturday' && !includeSaturdayBreak && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Saturday Window:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(saturdayStartTime || '08:00');
                                            setAllocEndTime(saturdayEndTime || '12:30');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Full Window ({saturdayStartTime || '08:00'} - {saturdayEndTime || '12:30'})
                                    </button>
                                </div>
                            )}

                            {allocDay === 'Sunday' && includeSundayBreak && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Coffee className="w-3 h-3" /> Sunday Break Slots:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(sundayStartTime || '09:00');
                                            setAllocEndTime(sundayBreakStartTime || '11:00');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Pre-Break ({sundayStartTime || '09:00'} - {sundayBreakStartTime || '11:00'})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(sundayBreakEndTime || '11:30');
                                            setAllocEndTime(sundayEndTime || '13:30');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Post-Break ({sundayBreakEndTime || '11:30'} - {sundayEndTime || '13:30'})
                                    </button>
                                </div>
                            )}

                            {allocDay === 'Sunday' && !includeSundayBreak && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Sunday Window:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(sundayStartTime || '09:00');
                                            setAllocEndTime(sundayEndTime || '13:00');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Full Window ({sundayStartTime || '09:00'} - {sundayEndTime || '13:00'})
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Live Collision Warning Banner & Override Control */}
                        {(activeModalSlotConflicts.classConflicts.length > 0 || activeModalSlotConflicts.teacherConflicts.length > 0) && (
                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 space-y-3 animate-in fade-in">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                                            Slot Collision Detected ({activeModalSlotConflicts.classConflicts.length + activeModalSlotConflicts.teacherConflicts.length} Clash{activeModalSlotConflicts.classConflicts.length + activeModalSlotConflicts.teacherConflicts.length > 1 ? 'es' : ''})
                                        </p>
                                        {activeModalSlotConflicts.classConflicts.length > 0 && (
                                            <div className="text-rose-800 dark:text-rose-300 mt-1 space-y-0.5">
                                                <p className="font-bold">Class already scheduled at this time:</p>
                                                <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-300">
                                                    {activeModalSlotConflicts.classConflicts.map(c => (
                                                        <li key={c.id}>
                                                            <strong>{c.subjectName || 'Subject'}</strong> taught by {c.teacherName || 'Teacher'} ({c.startTime} - {c.endTime})
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {activeModalSlotConflicts.teacherConflicts.length > 0 && (
                                            <div className="text-amber-800 dark:text-amber-300 mt-1.5 space-y-0.5">
                                                <p className="font-bold">Teacher double-booked:</p>
                                                <ul className="list-disc list-inside text-[11px] text-amber-700 dark:text-amber-300">
                                                    {activeModalSlotConflicts.teacherConflicts.map(c => (
                                                        <li key={c.id}>
                                                            {c.teacherName || 'Teacher'} is teaching <strong>{c.className} {c.stream || ''}</strong> ({c.startTime} - {c.endTime})
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Override Checkbox */}
                                <label className="flex items-center gap-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/60 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={allowManualCollisionOverride}
                                        onChange={e => setAllowManualCollisionOverride(e.target.checked)}
                                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                                    />
                                    <div>
                                        <span className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                                            Allow Manual Collision Override
                                        </span>
                                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                            I understand multiple lessons will share this exact time period.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Tariff Badge */}
                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                            ['Saturday', 'Sunday'].includes(allocDay)
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40'
                        }`}>
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>
                                {['Saturday', 'Sunday'].includes(allocDay)
                                    ? `Weekend Tariff — KES ${weekendHourlyRate?.toLocaleString()}/hr`
                                    : `Weekday Tariff — KES ${weekdayHourlyRate?.toLocaleString()}/hr`
                                }
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowAllocModal(false); setEditingAlloc(null); }}
                                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={(activeModalSlotConflicts.classConflicts.length > 0 || activeModalSlotConflicts.teacherConflicts.length > 0) && !allowManualCollisionOverride}
                                className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    (activeModalSlotConflicts.classConflicts.length > 0 || activeModalSlotConflicts.teacherConflicts.length > 0) && !allowManualCollisionOverride
                                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                                }`}
                            >
                                {editingAlloc ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {(activeModalSlotConflicts.classConflicts.length > 0 || activeModalSlotConflicts.teacherConflicts.length > 0) && !allowManualCollisionOverride
                                    ? 'Blocked: Slot Conflict'
                                    : (editingAlloc ? 'Update Allocation' : 'Save Allocation')
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* ===== DOS MANUAL REASSIGN / SUBSTITUTE MODAL ===== */}
        {reassigningAlloc && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-indigo-500" /> Reassign Lesson Teacher
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Substitute or transfer teacher allocation</p>
                        </div>
                        <button
                            onClick={() => { setReassigningAlloc(null); setReassignTeacherId(''); }}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-7 space-y-5">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{reassigningAlloc.subjectName}</p>
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                {reassigningAlloc.className} {reassigningAlloc.stream && reassigningAlloc.stream !== 'All Streams' ? `• ${reassigningAlloc.stream}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {reassigningAlloc.dayOfWeek} {reassigningAlloc.startTime} - {reassigningAlloc.endTime}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                Current: <span className="font-bold text-slate-700 dark:text-slate-300">{reassigningAlloc.teacherName}</span>
                            </p>
                        </div>

                        {/* Option 1: Trigger Smart Auto-Substitute Engine */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Option 1: Recommended Priority Engine</label>
                            <button
                                type="button"
                                onClick={() => {
                                    const allocToSub = reassigningAlloc;
                                    setReassigningAlloc(null);
                                    handleDosAutoSubstitute(allocToSub);
                                }}
                                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" /> Auto-Find Best Substitute
                            </button>
                            <p className="text-[9px] text-slate-400 font-medium">Scoring evaluates subject specialization, day preferences, and collision freedom.</p>
                        </div>

                        <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                            <span className="flex-shrink mx-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">OR</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        </div>

                        {/* Option 2: Direct Manual Override */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Option 2: Direct Teacher Assignment
                                </label>
                                <select
                                    value={reassignTeacherId}
                                    onChange={e => setReassignTeacherId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                >
                                    <option value="">-- Choose Target Teacher --</option>
                                    {teachersList.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.role || 'Teacher'})</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                disabled={!reassignTeacherId}
                                onClick={() => handleDosManualReassign(reassigningAlloc, reassignTeacherId)}
                                className="w-full py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <UserCheck className="w-4 h-4" /> Directly Assign Selected Teacher
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ===== ADD REMEDIAL SUBJECT MODAL ===== */}
        {showSubjectModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-pink-500" /> {editingSubject ? 'Edit Remedial Subject' : 'Add Remedial Subject'}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {editingSubject ? 'Update subject priority, weekly occurrences, and day placement' : 'Register a subject to enable extra tuition sessions'}
                            </p>
                        </div>
                        <button
                            onClick={() => { setShowSubjectModal(false); setEditingSubject(null); }}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleSaveRemedialSubject} className="p-7 space-y-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Select School Subject
                            </label>
                            <select
                                value={newSubjectId}
                                onChange={e => setNewSubjectId(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-pink-600 dark:text-white"
                            >
                                <option value="">-- Choose Subject --</option>
                                {effectiveSchoolSubjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                                <option value="custom">+ Other / Custom Subject Name</option>
                            </select>
                        </div>

                        {newSubjectId === 'custom' && (
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Custom Subject Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Remedial Coding &amp; Robotics"
                                    value={customSubjectName}
                                    onChange={e => setCustomSubjectName(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-pink-600 dark:text-white"
                                />
                            </div>
                        )}

                        {/* Priority Selection */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-rose-500" /> Remedial Priority Level
                            </label>
                            <select
                                value={newSubjectPriority}
                                onChange={e => setNewSubjectPriority(e.target.value as any)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-pink-600 dark:text-white cursor-pointer"
                            >
                                <option value="High">🔥 High Priority (Allocated first, e.g. Mathematics, Sciences)</option>
                                <option value="Medium">⚡ Medium Priority (Standard subjects)</option>
                                <option value="Low">📘 Low Priority (Electives &amp; technicals)</option>
                            </select>
                        </div>

                        {/* Weekly Frequency & Placement */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Weekly Frequency
                                </label>
                                <select
                                    value={newSubjectWeeklyOccurrences}
                                    onChange={e => setNewSubjectWeeklyOccurrences(Number(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-pink-600 dark:text-white cursor-pointer"
                                >
                                    <option value={1}>1× per week</option>
                                    <option value={2}>2× per week (Rec.)</option>
                                    <option value={3}>3× per week</option>
                                    <option value={4}>4× per week</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Day Placement
                                </label>
                                <select
                                    value={newSubjectPreferredDayType}
                                    onChange={e => setNewSubjectPreferredDayType(e.target.value as any)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-pink-600 dark:text-white cursor-pointer"
                                >
                                    <option value="any">Any Days</option>
                                    <option value="weekdays">Weekdays Only</option>
                                    <option value="weekends">Weekends Only</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowSubjectModal(false); setEditingSubject(null); }}
                                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {editingSubject ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingSubject ? 'Update Subject' : 'Register Subject'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL 1: FORWARD TIMETABLE TO HEADTEACHER FOR APPROVAL */}
        {isForwardModalOpen && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isSubmittingWorkflow) setIsForwardModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Forward for Headteacher Approval
                                </h3>
                                <p className="text-[11px] text-blue-100 font-medium">
                                    Director of Studies (DOS) Submission Workflow
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsForwardModalOpen(false)}
                            disabled={isSubmittingWorkflow}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        {/* Timetable Overview Stats */}
                        <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Lessons</p>
                                <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{allocations.length}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Classes</p>
                                <p className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">{courses.length}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Teachers</p>
                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{distinctTeachersInAllocations.length}</p>
                            </div>
                        </div>

                        {/* Approver Selection */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Select Principal / Headteacher Approver
                            </label>
                            <select
                                value={targetHeadteacherId}
                                onChange={e => setTargetHeadteacherId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                            >
                                <option value="">-- School Headteacher / Principal --</option>
                                {headteachersList.map(h => (
                                    <option key={h.id} value={h.id}>
                                        {h.name} ({h.role ? h.role.toUpperCase() : 'Principal'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* DOS Submission Notes */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Remarks / Notes for Headteacher
                            </label>
                            <textarea
                                rows={3}
                                value={workflowNotes}
                                onChange={e => setWorkflowNotes(e.target.value)}
                                placeholder="Add submission comments, term notes, or specific scheduling guidelines..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>

                        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                            Once forwarded, the timetable status transitions to <strong>Pending Headteacher Approval</strong>. The Headteacher will review the schedule before it is officially dispersed to teachers.
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsForwardModalOpen(false)}
                            disabled={isSubmittingWorkflow}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmittingWorkflow}
                            onClick={handleConfirmForwardToHeadteacher}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {isSubmittingWorkflow ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Confirm &amp; Forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 2: HEADTEACHER APPROVE & DISPERSE TO TEACHERS */}
        {isApproveModalOpen && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isSubmittingWorkflow) setIsApproveModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <CheckSquare className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Authorize &amp; Disperse Timetable
                                </h3>
                                <p className="text-[11px] text-emerald-100 font-medium">
                                    Principal / Headteacher Official Approval
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsApproveModalOpen(false)}
                            disabled={isSubmittingWorkflow}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                            <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-600" /> Executive Endorsement &amp; Rollout
                            </p>
                            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                                By approving, you officially endorse the schedule containing <strong>{allocations.length} remedial lessons</strong>. It will be <strong>dispersed to {distinctTeachersInAllocations.length} subject teachers</strong>, and session verification via prefect scan cards will be activated.
                            </p>
                        </div>

                        {/* Headteacher Endorsement Remarks */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Headteacher Endorsement Remarks
                            </label>
                            <textarea
                                rows={3}
                                value={workflowNotes}
                                onChange={e => setWorkflowNotes(e.target.value)}
                                placeholder="e.g. Approved for immediate rollout across all classes. Teachers must adhere strictly to scheduled remedial hours."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:border-emerald-500 dark:text-white"
                            />
                        </div>

                        {/* Summary List of Teachers Receiving Schedules */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                <span>Subject Teachers to Receive Timetable</span>
                                <span className="font-bold text-emerald-600">{distinctTeachersInAllocations.length} Teachers</span>
                            </p>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                                {distinctTeachersInAllocations.map(t => (
                                    <div key={t.teacherId} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-black text-slate-800 dark:text-white uppercase leading-none">{t.teacherName}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {t.subjects.join(', ')} &bull; {t.classes.join(', ')}
                                            </p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black shrink-0">
                                            {t.slotsCount} lessons
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsApproveModalOpen(false)}
                            disabled={isSubmittingWorkflow}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmittingWorkflow}
                            onClick={handleConfirmApproveAndDisperse}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {isSubmittingWorkflow ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Authorizing &amp; Dispersing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="w-4 h-4" />
                                    <span>Approve &amp; Disperse Now</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 3: RETURN TIMETABLE TO DOS FOR REVISION */}
        {isRevisionModalOpen && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isSubmittingWorkflow) setIsRevisionModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <RotateCcw className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Return for Revision
                                </h3>
                                <p className="text-[11px] text-rose-100 font-medium">
                                    Send Timetable Back to Director of Studies (DOS)
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsRevisionModalOpen(false)}
                            disabled={isSubmittingWorkflow}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Feedback &amp; Revision Notes for DOS *
                            </label>
                            <textarea
                                rows={4}
                                value={workflowNotes}
                                onChange={e => setWorkflowNotes(e.target.value)}
                                placeholder="Explain the specific changes required (e.g., adjust Form 3 Science slots, reduce Friday afternoon sessions, reassign Teacher X)..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:border-rose-500 dark:text-white"
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            The Director of Studies will be prompted with these feedback notes to adjust allocations and resubmit the revised schedule.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsRevisionModalOpen(false)}
                            disabled={isSubmittingWorkflow}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmittingWorkflow}
                            onClick={handleConfirmRequestRevision}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {isSubmittingWorkflow ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Returning...</span>
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Return to DOS</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 4: DISPERSAL MEMO & BROADCAST SHARE */}
        {isDisperseModalOpen && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setIsDisperseModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <Megaphone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Official Timetable Dispersal Memo
                                </h3>
                                <p className="text-[11px] text-slate-300 font-medium">
                                    Approved by {timetableApproval.approvedBy || 'Principal / Headteacher'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDisperseModalOpen(false)}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Memo Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        {/* Letterhead Banner */}
                        <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700 space-y-1">
                            <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {currentInstitution?.name || 'SCHOOL REMEDIAL PROGRAM'}
                            </h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                Office of the Director of Studies &bull; Academic Intervention Timetable
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    OFFICIALLY DISPERSED
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                    {new Date(timetableApproval.approvedAt || Date.now()).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Endorsement Note */}
                        {timetableApproval.approvalNotes && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs italic text-slate-600 dark:text-slate-300">
                                &ldquo;{timetableApproval.approvalNotes}&rdquo;
                            </div>
                        )}

                        {/* Teacher Allocations Summary Table */}
                        <div className="space-y-2">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Dispersed Teacher Allocations ({distinctTeachersInAllocations.length} Staff)
                            </h5>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="p-3">Teacher</th>
                                            <th className="p-3">Subjects</th>
                                            <th className="p-3">Classes</th>
                                            <th className="p-3 text-right">Lessons</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {distinctTeachersInAllocations.map(t => (
                                            <tr key={t.teacherId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                                <td className="p-3 font-bold text-slate-900 dark:text-white uppercase">{t.teacherName}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300">{t.subjects.join(', ')}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300">{t.classes.join(', ')}</td>
                                                <td className="p-3 text-right font-black text-emerald-600">{t.slotsCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                const text = `*OFFICIAL REMEDIAL TIMETABLE DISPERSAL NOTICE*\nSchool: ${currentInstitution?.name || 'School'}\nApproved by: ${timetableApproval.approvedBy || 'Principal'}\nDate: ${new Date(timetableApproval.approvedAt || Date.now()).toLocaleDateString()}\n\nTeacher Allocations:\n${distinctTeachersInAllocations.map(t => `• ${t.teacherName}: ${t.subjects.join(', ')} (${t.classes.join(', ')}) - ${t.slotsCount} sessions`).join('\n')}\n\nAll allocated teachers are advised to adhere to their schedules.`;
                                navigator.clipboard.writeText(text);
                                alert('Dispersal notice text copied to clipboard! You can paste into WhatsApp or SMS staff groups.');
                            }}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer transition-all"
                        >
                            <Copy className="w-3.5 h-3.5" /> Copy Notice Text
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePrintTimetable}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
                            >
                                <Printer className="w-3.5 h-3.5" /> Print Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsDisperseModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-300 transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 5: TOD ASSIGNMENT — WEEKEND & WEEKDAY */}
        {isDutyModalOpen && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isSavingDuty) setIsDutyModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`p-6 text-white flex justify-between items-center ${dutyModalType === 'weekday' ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    {dutyModalType === 'weekday' ? 'Weekday Duty Teachers' : 'Appoint Weekend Duty Teacher'}
                                </h3>
                                <p className="text-[11px] text-white/80 font-medium">
                                    {dutyModalType === 'weekday'
                                        ? 'Assign multiple teachers on duty for a weekday — each with their own rate'
                                        : 'Assign Teacher on Duty for Saturday & Sunday Lessons'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDutyModalOpen(false)}
                            disabled={isSavingDuty}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">

                        {/* ── Duty Type Toggle ── */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                            {(['weekend', 'weekday'] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                        setDutyModalType(type);
                                        setDutyTeacherList([]);
                                        setDutyTeacherPickId('');
                                        setDutyTeacherPickRate(String(weekdayDutyFlatRate || 200));
                                        setDutyTeacherPickPayType('flat');
                                    }}
                                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        dutyModalType === type
                                            ? type === 'weekday'
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-amber-500 text-white shadow-md'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    {type === 'weekend' ? '🌅 Weekend (Sat/Sun)' : '📅 Weekday (Mon–Fri)'}
                                </button>
                            ))}
                        </div>

                        {/* ── Academic Week ── */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Duty Academic Week *
                            </label>
                            <select
                                value={dutyModalWeek}
                                onChange={e => setDutyModalWeek(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                            >
                                {Array.from({ length: 14 }, (_, i) => `WEEK ${i + 1}`).map(wk => (
                                    <option key={wk} value={wk}>{wk}</option>
                                ))}
                            </select>
                        </div>

                        {/* ── Duty Class / Subject ── */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Duty Class
                                </label>
                                <select
                                    value={dutyModalCourseId}
                                    onChange={e => setDutyModalCourseId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                >
                                    <option value="">General</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Duty Subject
                                </label>
                                <select
                                    value={dutyModalSubjectId}
                                    onChange={e => setDutyModalSubjectId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                >
                                    <option value="">General Remedials</option>
                                    {remedialSubjects.map(s => (
                                        <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ══ WEEKEND MODE ══ */}
                        {dutyModalType === 'weekend' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Select Weekend Teacher on Duty *
                                    </label>
                                    <select
                                        value={dutyModalTeacherId}
                                        onChange={e => setDutyModalTeacherId(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                    >
                                        <option value="">-- Choose Teacher --</option>
                                        {users.filter(u => !u.role || ['teacher', 'admin', 'headteacher', 'principal', 'staff'].includes(u.role.toLowerCase())).map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.role || 'Teacher'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={dutyModalAutoAllocate}
                                            onChange={e => setDutyModalAutoAllocate(e.target.checked)}
                                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-black uppercase tracking-tight text-amber-900 dark:text-amber-200">
                                            Auto-allocate 1 Saturday &amp; 1 Sunday Duty Lesson
                                        </span>
                                    </label>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed pl-6">
                                        Creates Saturday ({saturdayStartTime || '08:00'}) and Sunday ({sundayStartTime || '09:00'}) remedial sessions automatically.
                                    </p>
                                </div>
                            </>
                        )}

                        {/* ══ WEEKDAY MODE ══ */}
                        {dutyModalType === 'weekday' && (
                            <>
                                {/* Day picker */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                        Duty Weekday *
                                    </label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {(['Monday','Tuesday','Wednesday','Thursday','Friday'] as const).map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => setDutyModalWeekday(day)}
                                                className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                                                    dutyModalWeekday === day
                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
                                                }`}
                                            >
                                                {day.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Add teacher row */}
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                        Add Teacher to Duty List
                                    </p>
                                    <select
                                        value={dutyTeacherPickId}
                                        onChange={e => setDutyTeacherPickId(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-indigo-500 dark:text-white"
                                    >
                                        <option value="">-- Select Teacher --</option>
                                        {users
                                            .filter(u => !u.role || ['teacher', 'admin', 'headteacher', 'principal', 'staff'].includes(u.role.toLowerCase()))
                                            .filter(u => !dutyTeacherList.some(e => e.teacherId === u.id))
                                            .map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role || 'Teacher'})</option>
                                            ))
                                        }
                                    </select>
                                    <div className="p-2.5 bg-indigo-100/60 dark:bg-indigo-900/40 rounded-xl border border-indigo-200/80 dark:border-indigo-700/60 flex items-start gap-2">
                                        <span className="text-xs">💡</span>
                                        <p className="text-[10px] text-indigo-900 dark:text-indigo-200 leading-tight font-bold">
                                            Weekday Duty pays a flat daily rate per teacher (e.g. KES 200/day), paid regardless of lesson duration.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-indigo-500 mb-1">Flat Rate / Day (KES)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="50"
                                                value={dutyTeacherPickRate}
                                                onChange={e => setDutyTeacherPickRate(e.target.value)}
                                                placeholder={String(weekdayDutyFlatRate || 200)}
                                                className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-indigo-500 dark:text-white placeholder:text-slate-400 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-indigo-500 mb-1">Rate Type</label>
                                            <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl p-1">
                                                {(['flat','hourly'] as const).map(t => (
                                                    <button key={t} type="button"
                                                        onClick={() => setDutyTeacherPickPayType(t)}
                                                        className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                                            dutyTeacherPickPayType === t
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                    >
                                                        {t === 'flat' ? 'Flat / Day' : '/hr'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!dutyTeacherPickId}
                                        onClick={() => {
                                            if (!dutyTeacherPickId) return;
                                            const rateToAdd = dutyTeacherPickRate || String(weekdayDutyFlatRate || 200);
                                            setDutyTeacherList(prev => [...prev, { teacherId: dutyTeacherPickId, payRate: rateToAdd, payType: dutyTeacherPickPayType }]);
                                            setDutyTeacherPickId('');
                                            setDutyTeacherPickRate(String(weekdayDutyFlatRate || 200));
                                            setDutyTeacherPickPayType('flat');
                                        }}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                                    >
                                        + Add to List
                                    </button>
                                </div>

                                {/* Teacher bulk list */}
                                {dutyTeacherList.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Duty Teachers — {dutyModalWeekday} ({dutyTeacherList.length})
                                        </p>
                                        {dutyTeacherList.map((entry, idx) => {
                                            const t = users.find(u => u.id === entry.teacherId);
                                            return (
                                                <div key={entry.teacherId} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[9px] font-black text-indigo-600 dark:text-indigo-300">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-800 dark:text-white">{t?.name || entry.teacherId}</p>
                                                            <p className="text-[9px] text-slate-400">
                                                                {entry.payRate ? `KES ${entry.payRate} (${entry.payType === 'flat' ? 'Flat / day' : '/hr'})` : `KES ${weekdayDutyFlatRate || 200} (Flat / day)`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDutyTeacherList(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {dutyTeacherList.length === 0 && (
                                    <div className="text-center py-3 text-[10px] text-slate-400 font-bold">
                                        No teachers added yet — use the form above
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsDutyModalOpen(false)}
                            disabled={isSavingDuty}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSavingDuty || (dutyModalType === 'weekday' ? dutyTeacherList.length === 0 : !dutyModalTeacherId)}
                            onClick={handleSaveDuty}
                            className={`px-5 py-2.5 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                                dutyModalType === 'weekday'
                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/20'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/20'
                            }`}
                        >
                            {isSavingDuty ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Assigning...</span>
                                </>
                            ) : (
                                <>
                                    <Calendar className="w-4 h-4" />
                                    <span>{dutyModalType === 'weekday' ? `Appoint ${dutyTeacherList.length} Teacher(s)` : 'Appoint & Allocate'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 6: OPERATIONS MANAGER CASH HANDOVER TO DOS */}
        {isOpsCashModalOpen && opsDisburseBatch && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isDisbursingOpsCash) setIsOpsCashModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-800 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Banknote className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Operations Cash Handover to DOS
                                </h3>
                                <p className="text-[11px] text-purple-200 font-medium">
                                    Stage 4: Physical Cash Release to Director of Studies
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpsCashModalOpen(false)}
                            disabled={isDisbursingOpsCash}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">Teacher Recipient</span>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mt-0.5">{opsDisburseBatch.teacherName}</h4>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">{opsDisburseBatch.totalHours} hrs &bull; {opsDisburseBatch.sessionIds.length} approved lessons</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">Physical Cash Amount</span>
                                <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
                                    KES {opsDisburseBatch.totalAmount.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                Official Cash Voucher / Folio Reference Number *
                            </label>
                            <input
                                type="text"
                                value={opsCashVoucherRef}
                                onChange={e => setOpsCashVoucherRef(e.target.value)}
                                placeholder="e.g. CSH-2026-0042 / FOLIO-78"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold outline-none focus:border-purple-500 dark:text-white"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                Enter the physical paper voucher number or cash ledger folio ref for institutional auditing.
                            </p>
                        </div>

                        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-purple-600" /> Custody Transfer Notice
                            </p>
                            <p>
                                Submitting this form records that physical cash of <strong>KES {opsDisburseBatch.totalAmount.toLocaleString()}</strong> has been handed to the Director of Studies (DOS). The DOS will distribute the cash to the teacher and collect an on-screen signature.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsOpsCashModalOpen(false)}
                            disabled={isDisbursingOpsCash}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isDisbursingOpsCash}
                            onClick={handleConfirmOperationsCashHandover}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {isDisbursingOpsCash ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Recording Handover...</span>
                                </>
                            ) : (
                                <>
                                    <Banknote className="w-4 h-4" />
                                    <span>Confirm Handover to DOS</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 7: DOS CASH PAYMENT WITH ON-SCREEN CANVAS SIGNATURE */}
        {isDosPayModalOpen && dosPayTeacherData && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isSubmittingDosPayment) setIsDosPayModalOpen(false);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-cyan-600 via-teal-700 to-cyan-700 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <PenTool className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Teacher Cash Payment &amp; Signature
                                </h3>
                                <p className="text-[11px] text-cyan-100 font-medium">
                                    Stage 5: DOS Cash Distribution &amp; Physical On-Screen Signing
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDosPayModalOpen(false)}
                            disabled={isSubmittingDosPayment}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 rounded-2xl border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Teacher Recipient</span>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mt-0.5">{dosPayTeacherData.teacherName}</h4>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">Voucher Ref: #{dosPayTeacherData.cashVoucherRef || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Net Cash Handover</span>
                                <p className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                                    KES {dosPayTeacherData.totalAmount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">{dosPayTeacherData.totalHours} hrs @ KES {dosPayTeacherData.rate.toLocaleString()}/hr</p>
                            </div>
                        </div>

                        {/* Signature Pad */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Teacher On-Screen Digital Signature *
                                </label>
                                <button
                                    type="button"
                                    onClick={handleClearCanvasSignature}
                                    className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" /> Clear Signature
                                </button>
                            </div>

                            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl overflow-hidden bg-white shadow-inner">
                                <canvas
                                    ref={canvasRef}
                                    width={460}
                                    height={160}
                                    onMouseDown={handleCanvasStart}
                                    onMouseMove={handleCanvasDraw}
                                    onMouseUp={handleCanvasStop}
                                    onMouseLeave={handleCanvasStop}
                                    onTouchStart={handleCanvasStart}
                                    onTouchMove={handleCanvasDraw}
                                    onTouchEnd={handleCanvasStop}
                                    className="w-full h-40 cursor-crosshair touch-none bg-white block"
                                />
                                {!hasTeacherSigned && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <PenTool className="w-4 h-4 opacity-50" /> Draw Signature Here
                                        </p>
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-slate-400 italic">
                                Teacher must sign on the signature canvas above to acknowledge receipt of physical cash from the Director of Studies.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsDosPayModalOpen(false)}
                            disabled={isSubmittingDosPayment}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSubmittingDosPayment || !hasTeacherSigned}
                            onClick={handleConfirmDosPaymentWithSignature}
                            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {isSubmittingDosPayment ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Sealing Payment...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Seal Payment &amp; Issue Receipt</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* MODAL 8: OFFICIAL SIGNED CASH RECEIPT VOUCHER */}
        {viewingReceiptPayout && typeof document !== 'undefined' && createPortal(
            <div 
                className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setViewingReceiptPayout(null);
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Official Cash Remuneration Voucher
                                </h3>
                                <p className="text-[11px] text-slate-400 font-mono">
                                    Voucher #{viewingReceiptPayout.id}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setViewingReceiptPayout(null)}
                            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Printable Receipt Body */}
                    <div id="remedial-cash-receipt-printable" className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {/* Letterhead */}
                        <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700 space-y-1">
                            <h2 className="text-lg font-black uppercase tracking-tight">
                                {currentInstitution?.name || 'SCHOOL ACADEMIC MANAGEMENT'}
                            </h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                Official Remedial &amp; Academic Intervention Cash Payout Voucher
                            </p>
                            <p className="text-[9px] font-mono text-slate-400">
                                Date Issued: {viewingReceiptPayout.payoutDate || new Date().toISOString().split('T')[0]}
                            </p>
                        </div>

                        {/* Payment Details Table */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    <tr>
                                        <td className="p-3 bg-slate-50 dark:bg-slate-900/60 font-black uppercase text-[10px] text-slate-400 w-1/3">Payee Teacher</td>
                                        <td className="p-3 font-bold uppercase">{viewingReceiptPayout.teacherName}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 dark:bg-slate-900/60 font-black uppercase text-[10px] text-slate-400">Hours Taught</td>
                                        <td className="p-3 font-bold">{viewingReceiptPayout.totalHours} Hours</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 dark:bg-slate-900/60 font-black uppercase text-[10px] text-slate-400">Rate per Hour</td>
                                        <td className="p-3 font-mono">KES {viewingReceiptPayout.hourlyRate?.toLocaleString() || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 dark:bg-slate-900/60 font-black uppercase text-[10px] text-slate-400">Total Cash Paid</td>
                                        <td className="p-3 font-black font-mono text-base text-emerald-600 dark:text-emerald-400">
                                            KES {viewingReceiptPayout.totalAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 dark:bg-slate-900/60 font-black uppercase text-[10px] text-slate-400">Cash Voucher Folio</td>
                                        <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                                            #{viewingReceiptPayout.cashVoucherRef || 'N/A'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 bg-slate-50 dark:bg-slate-900/60 font-black uppercase text-[10px] text-slate-400">Disbursed By (DOS)</td>
                                        <td className="p-3 font-bold">{viewingReceiptPayout.paidByDosName || 'Director of Studies'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Signatures Chain */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Disbursed by (DOS / Operations):
                                </p>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {viewingReceiptPayout.paidByDosName || 'Director of Studies'}
                                </p>
                                <p className="text-[9px] text-slate-400 font-mono">
                                    Ref: #{viewingReceiptPayout.cashVoucherRef || 'VOUCHER'}
                                </p>
                            </div>

                            <div className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Teacher Physical Signature:
                                </p>
                                {viewingReceiptPayout.teacherSignatureDataUrl ? (
                                    <div className="bg-white rounded-lg p-1 border border-slate-200 dark:border-slate-700 inline-block">
                                        <img
                                            src={viewingReceiptPayout.teacherSignatureDataUrl}
                                            alt="Teacher Signature"
                                            className="h-12 w-auto object-contain"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                                        {viewingReceiptPayout.anonymousSignature || 'Signed in Cash Ledger'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                    const content = document.getElementById('remedial-cash-receipt-printable')?.innerHTML;
                                    printWindow.document.write(`
                                        <html>
                                            <head>
                                                <title>Cash Voucher Receipt - ${viewingReceiptPayout.teacherName}</title>
                                                <style>
                                                    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; }
                                                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                                                    th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; }
                                                    td:first-child { background: #f8fafc; font-weight: bold; width: 35%; }
                                                    .letterhead { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #0f172a; padding-bottom: 15px; }
                                                    .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
                                                    .sig-box { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; width: 45%; }
                                                </style>
                                            </head>
                                            <body>
                                                ${content}
                                            </body>
                                        </html>
                                    `);
                                    printWindow.document.close();
                                    printWindow.focus();
                                    setTimeout(() => {
                                        printWindow.print();
                                        printWindow.close();
                                    }, 250);
                                }
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print Receipt
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewingReceiptPayout(null)}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-300 transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
        </>
    );
};
