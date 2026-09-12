import React, { useState, useEffect, useMemo } from 'react';
import type { User, Course, Subject, RemedialSession, RemedialRateSetting, RemedialPayout, Invoice, RemedialAllocation, RemedialSubject, StudentEnrollment } from '../types';
import { apiService, safeLocalStorage } from '../services/apiService';
import { SubscriptionExpiryBanner } from './common/SubscriptionExpiryBanner';
import { 
    Clock, Plus, Check, CheckCircle2, CreditCard, Printer, QrCode, Search, 
    DollarSign, AlertCircle, Trash2, Shield, Eye, Award, BookOpen, Layers, UserCheck,
    Globe, Copy, ExternalLink, Sparkles, Calendar, RefreshCw, X, Download,
    Flame, Zap, Sliders, Coffee, UserX, ArrowRight, RotateCcw, AlertTriangle, Lock, UserPlus,
    FileText, BarChart3, Filter, Pencil
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { rankSubstituteCandidates, getRemainingMinutes, isConfirmationExpired } from '../utils/remedialSubstitutionUtils';
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
    getDistinctTimetableClasses
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
    const [activeTab, setActiveTab] = useState<'sessions' | 'allocations' | 'subjects' | 'payouts' | 'billing' | 'rates' | 'portal_hub' | 'reports'>('sessions');
    
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
    const [statusFilter, setStatusFilter] = useState<'all' | 'In Progress' | 'Prefect Confirmed' | 'Approved' | 'Paid'>('all');
    const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>('All');
    const [selectedTimetableStream, setSelectedTimetableStream] = useState<string>('All');
    
    // Rates Form State
    const [hourlyRate, setHourlyRate] = useState<number>(1000);
    const [weekdayHourlyRate, setWeekdayHourlyRate] = useState<number>(1000);
    const [weekendHourlyRate, setWeekendHourlyRate] = useState<number>(1500);
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
    const [teacherPreferences, setTeacherPreferences] = useState<Record<string, { preferredDays: string[]; maxLessonsPerWeek?: number; notes?: string }>>({});
    const [teacherDaySearchQuery, setTeacherDaySearchQuery] = useState('');
    const [cancellationCutoffHours, setCancellationCutoffHours] = useState<number>(3);
    const [confirmationTimeoutMinutes, setConfirmationTimeoutMinutes] = useState<number>(45);

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
        setWeekendBreakStartTime(r.weekendBreakStartTime || r.weekend_break_start_time || r.metadata?.weekendBreakStartTime || r.metadata?.weekend_break_start_time || '10:00');
        setWeekendBreakEndTime(r.weekendBreakEndTime || r.weekend_break_end_time || r.metadata?.weekendBreakEndTime || r.metadata?.weekend_break_end_time || '10:30');
        setWeekendBreakLabel(r.weekendBreakLabel || r.weekend_break_label || r.metadata?.weekendBreakLabel || r.metadata?.weekend_break_label || 'Tea & Refreshment Break');
        const loadedIncludeBreak = r.includeWeekendBreak ?? r.include_weekend_break ?? r.metadata?.includeWeekendBreak ?? r.metadata?.include_weekend_break ?? true;
        setIncludeWeekendBreak(loadedIncludeBreak !== false);
        const loadedTeacherPrefs = r.teacherPreferences || r.teacher_preferences || r.metadata?.teacherPreferences || r.metadata?.teacher_preferences || {};
        setTeacherPreferences(loadedTeacherPrefs);
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
            const [sessResult, ratesResult, payResult, allocResult, remSubResult] = await Promise.allSettled([
                apiService.fetchRemedialSessions(institutionId),
                apiService.fetchRemedialRateSettings(institutionId),
                apiService.fetchRemedialPayouts(institutionId),
                typeof (apiService as any).fetchRemedialAllocations === 'function'
                    ? (apiService as any).fetchRemedialAllocations(institutionId)
                    : apiService.fetchModuleRecords<RemedialAllocation>('school_remedial_allocations', institutionId).catch(() => []),
                typeof (apiService as any).fetchRemedialSubjects === 'function'
                    ? (apiService as any).fetchRemedialSubjects(institutionId)
                    : apiService.fetchModuleRecords<RemedialSubject>('school_remedial_subjects', institutionId).catch(() => [])
            ]);

            const sessList = sessResult.status === 'fulfilled' && Array.isArray(sessResult.value) ? sessResult.value : [];
            const rates = ratesResult.status === 'fulfilled' && Array.isArray(ratesResult.value) ? ratesResult.value : [];
            const payList = payResult.status === 'fulfilled' && Array.isArray(payResult.value) ? payResult.value : [];
            const allocList = allocResult.status === 'fulfilled' && Array.isArray(allocResult.value) ? allocResult.value : [];
            const remSubList = remSubResult.status === 'fulfilled' && Array.isArray(remSubResult.value) ? remSubResult.value : [];

            setSessions(sessList);
            setPayouts(payList);
            setAllocations(allocList);
            setRemedialSubjects(remSubList);

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

    // Teachers and Prefects Lists
    const teachersList = useMemo(() => {
        return (users || []).filter(u => u && (u.role === 'teacher' || u.role === 'lecturer' || (u.role as string) === 'instructor'));
    }, [users]);

    const prefectsList = useMemo(() => {
        const list: any[] = [];
        const addedIds = new Set<string>();

        // 1. Existing user-level prefects
        (users || []).forEach(u => {
            if (u && ((u.role as string) === 'prefect' || (u.metadata as any)?.isPrefect)) {
                list.push(u);
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
                role: 'prefect',
                institutionId: enr.institutionId || institutionId,
                courseId: matchedCourse?.id || enr.courseId || '',
                className: matchedCourse?.name || grade || '',
                stream: stream || '',
                leadershipPosition: leadPos,
                enrollmentId: enr.id,
                email: studentUser?.email,
                phoneNumber: studentUser?.phoneNumber,
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

    // Teacher Day Preference Handlers
    const handleToggleTeacherDay = (teacherId: string, day: string) => {
        setTeacherPreferences(prev => {
            const existing = prev[teacherId] || { preferredDays: [] };
            const days = existing.preferredDays || [];
            const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
            return {
                ...prev,
                [teacherId]: {
                    ...existing,
                    preferredDays: newDays
                }
            };
        });
    };

    const handleSetTeacherDaysPreset = (teacherId: string, preset: 'weekdays' | 'weekends' | 'all' | 'clear') => {
        const dayMap = {
            weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            weekends: ['Saturday', 'Sunday'],
            all: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            clear: []
        };
        setTeacherPreferences(prev => ({
            ...prev,
            [teacherId]: {
                ...(prev[teacherId] || {}),
                preferredDays: dayMap[preset] as any
            }
        }));
    };

    // Save Rate Settings (including teacher preferences)
    const handleSaveRates = async () => {
        try {
            safeLocalStorage.setItem(`eduai_remedial_weekend_max_${institutionId}`, String(maxWeekendLessonsPerDay));
            const stableId = rateSetting?.id || `rate_setting_${institutionId}`;
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
                weekendBreakStartTime,
                weekend_break_start_time: weekendBreakStartTime,
                weekendBreakEndTime,
                weekend_break_end_time: weekendBreakEndTime,
                weekendBreakLabel,
                weekend_break_label: weekendBreakLabel,
                includeWeekendBreak,
                include_weekend_break: includeWeekendBreak,
                metadata: {
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
                    weekendBreakStartTime,
                    weekend_break_start_time: weekendBreakStartTime,
                    weekendBreakEndTime,
                    weekend_break_end_time: weekendBreakEndTime,
                    weekendBreakLabel,
                    weekend_break_label: weekendBreakLabel,
                    includeWeekendBreak,
                    include_weekend_break: includeWeekendBreak,
                    teacherPreferences,
                    teacher_preferences: teacherPreferences,
                    ...(rateSetting?.metadata || {})
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

    // Open Create Allocation Modal
    const handleOpenCreateAllocation = () => {
        setEditingAlloc(null);
        setAllocCourseId('');
        setAllocStream('All Streams');
        setCustomAllocStream('');
        setAllocSubjectId('');
        setAllocTeacherId('');
        setAllocDay('Monday');
        setAllocStartTime(weekdayStartTime || '16:00');
        setAllocEndTime(weekdayEndTime || '18:00');
        setShowAllocModal(true);
    };

    // Open Edit Allocation Modal
    const handleOpenEditAllocation = (alloc: RemedialAllocation) => {
        setEditingAlloc(alloc);
        setAllocCourseId(alloc.courseId || '');

        const matchedCourse = courses.find(c => c.id === alloc.courseId);
        const courseStreams = matchedCourse?.streams || [];
        if (!alloc.stream || alloc.stream === 'All Streams') {
            setAllocStream('All Streams');
            setCustomAllocStream('');
        } else if (courseStreams.includes(alloc.stream)) {
            setAllocStream(alloc.stream);
            setCustomAllocStream('');
        } else {
            setAllocStream('__custom__');
            setCustomAllocStream(alloc.stream);
        }

        setAllocSubjectId(alloc.subjectId || '');
        setAllocTeacherId(alloc.teacherId || '');
        setAllocDay((alloc.dayOfWeek as any) || 'Monday');
        setAllocStartTime(alloc.startTime || (['Saturday', 'Sunday'].includes(alloc.dayOfWeek) ? (alloc.dayOfWeek === 'Sunday' ? (sundayStartTime || '09:00') : (saturdayStartTime || '08:00')) : (weekdayStartTime || '16:00')));
        setAllocEndTime(alloc.endTime || (['Saturday', 'Sunday'].includes(alloc.dayOfWeek) ? (alloc.dayOfWeek === 'Sunday' ? (sundayEndTime || '13:00') : (saturdayEndTime || '12:00')) : (weekdayEndTime || '18:00')));
        setShowAllocModal(true);
    };

    // Manual Allocation Handler (Create or Edit)
    const handleCreateManualAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allocCourseId || !allocSubjectId || !allocTeacherId) {
            return alert('Please select class, stream, subject, and teacher.');
        }

        try {
            const course = courses.find(c => c.id === allocCourseId);
            const remSubMatch = remedialSubjects.find(r => r.subjectId === allocSubjectId || r.id === allocSubjectId);
            const schoolSubMatch = effectiveSchoolSubjects.find(s => s.id === allocSubjectId);
            const resolvedSubjectName = schoolSubMatch?.name || remSubMatch?.subjectName || 'Subject';
            const teacher = users.find(u => u.id === allocTeacherId);
            const isWeekend = ['Saturday', 'Sunday'].includes(allocDay);
            const effectiveStream = allocStream === '__custom__'
                ? (customAllocStream.trim() || 'All Streams')
                : (allocStream || 'All Streams');

            const payloadAlloc: RemedialAllocation = {
                ...(editingAlloc || {}),
                id: editingAlloc?.id || `rem_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                courseId: allocCourseId,
                className: course?.name || editingAlloc?.className || 'Class',
                stream: effectiveStream,
                subjectId: allocSubjectId,
                subjectName: resolvedSubjectName,
                teacherId: allocTeacherId,
                teacherName: teacher?.name || editingAlloc?.teacherName || 'Teacher',
                dayOfWeek: allocDay,
                startTime: allocStartTime,
                endTime: allocEndTime,
                isWeekend,
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
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to save allocation');
        }
    };

    // Smart Auto-Generate Timetable Engine (Priority-Weighted, Spaced Occurrences, Teacher Preferred Day Matching)
    const handleAutoGenerateTimetable = async () => {
        if (courses.length === 0 || teachersList.length === 0) {
            return alert('Insufficient data to auto-generate remedial timetable. Please ensure classes and teachers are registered.');
        }

        // Use active remedial subjects if configured, or fall back to general school catalog
        const activeSubjects = remedialSubjects.filter(rs => rs.isActive !== false);
        const subjectsPool: { subjectId: string; subjectName: string; priority: 'High' | 'Medium' | 'Low'; weeklyOccurrences: number; preferredDayType: 'any' | 'weekdays' | 'weekends' }[] = 
            activeSubjects.length > 0 
                ? activeSubjects.map(rs => ({
                    subjectId: rs.subjectId,
                    subjectName: rs.subjectName,
                    priority: rs.priority || 'Medium',
                    weeklyOccurrences: Math.min(Math.max(rs.weeklyOccurrences || 1, 1), 4),
                    preferredDayType: rs.preferredDayType || 'any'
                }))
                : effectiveSchoolSubjects.map(s => {
                    const nameLower = s.name.toLowerCase();
                    const isCoreStem = nameLower.includes('math') || nameLower.includes('calc') || nameLower.includes('physic') || nameLower.includes('chem') || nameLower.includes('bio') || nameLower.includes('eng') || nameLower.includes('kisw');
                    return {
                        subjectId: s.id,
                        subjectName: s.name,
                        priority: isCoreStem ? 'High' : 'Medium',
                        weeklyOccurrences: isCoreStem ? 2 : 1,
                        preferredDayType: isCoreStem ? 'any' : 'weekdays'
                    };
                });

        if (subjectsPool.length === 0) {
            return alert('No subjects available for allocation. Please register school or remedial subjects.');
        }

        const highPriorityCount = subjectsPool.filter(s => s.priority === 'High').length;
        const totalExpectedLessonsPerClass = subjectsPool.reduce((acc, s) => acc + s.weeklyOccurrences, 0);

        const confirmMsg = 
            `Auto-Generate Smart Remedial Timetable for ${courses.length} class(es)?\n\n` +
            `• Subject Priority Ordering: High Priority subjects (e.g. Mathematics, Sciences) scheduled first.\n` +
            `• Weekly Occurrences: ${totalExpectedLessonsPerClass} total sessions planned per stream (High Priority subjects occur 2x/wk).\n` +
            `• Occurrence Spacing: Multiple sessions of the same subject spaced across non-consecutive days.\n` +
            `• Teacher Preferred Days: Teachers matched to their chosen available days (+bonus scoring).\n` +
            `• Daily Caps Enforced: Weekdays max ${maxLessonsPerDay}/day, Weekends max ${maxWeekendLessonsPerDay}/day per teacher.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setLoading(true);
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
            const classDayBooked: Record<string, Set<string>> = {};
            courses.forEach(c => {
                classDayBooked[c.id] = new Set();
            });

            const newAllocations: RemedialAllocation[] = [];
            let totalHighAllocated = 0;
            let totalPreferredDayMatches = 0;

            // Sort subjects by priority: High (3) -> Medium (2) -> Low (1)
            const priorityScore = (p: string) => (p === 'High' ? 3 : p === 'Medium' ? 2 : 1);
            const sortedSubjects = [...subjectsPool].sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

            for (const course of courses) {
                // Build the queue for this course
                const courseQueue: { subject: typeof sortedSubjects[0]; occurrenceIdx: number; totalOcc: number }[] = [];
                for (const sub of sortedSubjects) {
                    for (let occ = 0; occ < sub.weeklyOccurrences; occ++) {
                        courseQueue.push({ subject: sub, occurrenceIdx: occ, totalOcc: sub.weeklyOccurrences });
                    }
                }

                // Track assigned days for each subject in this course to ensure spacing
                const subjectAssignedDays: Record<string, string[]> = {};

                for (const item of courseQueue) {
                    const sub = item.subject;
                    if (sub.priority === 'High') totalHighAllocated++;

                    const previousDays = subjectAssignedDays[sub.subjectId] || [];

                    // Filter candidate days by preferredDayType
                    let candidateDays = [...daysOfWeek];
                    if (sub.preferredDayType === 'weekends') {
                        candidateDays = candidateDays.filter(d => ['Saturday', 'Sunday'].includes(d));
                    } else if (sub.preferredDayType === 'weekdays') {
                        candidateDays = candidateDays.filter(d => !['Saturday', 'Sunday'].includes(d));
                    }

                    // Sort candidate days by spacing from previous assignments of this subject
                    candidateDays.sort((d1, d2) => {
                        const idx1 = daysOfWeek.indexOf(d1);
                        const idx2 = daysOfWeek.indexOf(d2);

                        const dist1 = previousDays.length > 0 
                            ? Math.min(...previousDays.map(pd => Math.abs(idx1 - daysOfWeek.indexOf(pd as any))))
                            : 99;
                        const dist2 = previousDays.length > 0 
                            ? Math.min(...previousDays.map(pd => Math.abs(idx2 - daysOfWeek.indexOf(pd as any))))
                            : 99;

                        // Prefer day slots that this course doesn't have yet
                        const classFree1 = classDayBooked[course.id]?.has(d1) ? 0 : 1;
                        const classFree2 = classDayBooked[course.id]?.has(d2) ? 0 : 1;
                        if (classFree1 !== classFree2) return classFree2 - classFree1;

                        // Prefer greater spacing distance
                        return dist2 - dist1;
                    });

                    let selectedDay: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday') | null = null;
                    let selectedTeacher: User | null = null;
                    let matchedPreferredDay = false;

                    // Evaluate candidate days and teachers
                    for (const day of candidateDays) {
                        const isWeekend = ['Saturday', 'Sunday'].includes(day);
                        const courseDayLessonCount = newAllocations.filter(a => a.courseId === course.id && a.dayOfWeek === day).length;
                        
                        let candidateStartTime = weekdayStartTime || '16:00';
                        if (day === 'Saturday') {
                            if (includeWeekendBreak) {
                                candidateStartTime = courseDayLessonCount === 0 ? (saturdayStartTime || '08:00') : (weekendBreakEndTime || '10:30');
                            } else {
                                candidateStartTime = courseDayLessonCount === 0 ? (saturdayStartTime || '08:00') : '10:00';
                            }
                        } else if (day === 'Sunday') {
                            if (includeWeekendBreak) {
                                candidateStartTime = courseDayLessonCount === 0 ? (sundayStartTime || '09:00') : (weekendBreakEndTime || '11:00');
                            } else {
                                candidateStartTime = courseDayLessonCount === 0 ? (sundayStartTime || '09:00') : '11:00';
                            }
                        }
                        const dayLimit = isWeekend ? maxWeekendLessonsPerDay : maxLessonsPerDay;

                        // Score candidate teachers
                        const candidates = teachersList.map(t => {
                            const dailyCount = teacherDailyCount[t.id]?.[day] || 0;
                            if (dailyCount >= dayLimit) return { teacher: t, score: -9999 }; // Hit daily limit
                            if (teacherSlotBooked[t.id]?.has(`${day}_${candidateStartTime}`)) return { teacher: t, score: -9999 }; // Collision

                            let score = 100;
                            const prefs = teacherPreferences[t.id];
                            const preferredDays = prefs?.preferredDays || [];
                            const isPreferred = preferredDays.includes(day);

                            if (isPreferred) {
                                score += 80; // Significant bonus for teacher's preferred day
                            } else if (preferredDays.length > 0) {
                                score -= 30; // Teacher specified preferences, but not for today
                            }

                            // Workload balancing penalty
                            const weeklyTotal = Object.values(teacherDailyCount[t.id] || {}).reduce((a, b) => a + b, 0);
                            score -= weeklyTotal * 10;
                            score -= dailyCount * 25;

                            return { teacher: t, score, isPreferred };
                        }).filter(c => c.score > -1000);

                        candidates.sort((a, b) => b.score - a.score);

                        if (candidates.length > 0) {
                            selectedDay = day;
                            selectedTeacher = candidates[0].teacher;
                            matchedPreferredDay = !!candidates[0].isPreferred;
                            break;
                        }
                    }

                    // Fallback
                    if (!selectedDay || !selectedTeacher) {
                        selectedDay = candidateDays[0] || 'Monday';
                        selectedTeacher = teachersList[0];
                    }

                    const isWeekend = ['Saturday', 'Sunday'].includes(selectedDay);
                    const courseDayLessonCount = newAllocations.filter(a => a.courseId === course.id && a.dayOfWeek === selectedDay).length;
                    let startTime = weekdayStartTime || '16:00';
                    let endTime = weekdayEndTime || '18:00';

                    if (selectedDay === 'Saturday') {
                        if (includeWeekendBreak) {
                            if (courseDayLessonCount === 0) {
                                startTime = saturdayStartTime || '08:00';
                                endTime = weekendBreakStartTime || '10:00';
                            } else {
                                startTime = weekendBreakEndTime || '10:30';
                                endTime = saturdayEndTime || '12:30';
                            }
                        } else {
                            if (courseDayLessonCount === 0) {
                                startTime = saturdayStartTime || '08:00';
                                endTime = '10:00';
                            } else {
                                startTime = '10:00';
                                endTime = saturdayEndTime || '12:00';
                            }
                        }
                    } else if (selectedDay === 'Sunday') {
                        if (includeWeekendBreak) {
                            if (courseDayLessonCount === 0) {
                                startTime = sundayStartTime || '09:00';
                                endTime = weekendBreakStartTime || '11:00';
                            } else {
                                startTime = weekendBreakEndTime || '11:30';
                                endTime = sundayEndTime || '13:30';
                            }
                        } else {
                            if (courseDayLessonCount === 0) {
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

                    if (!subjectAssignedDays[sub.subjectId]) subjectAssignedDays[sub.subjectId] = [];
                    subjectAssignedDays[sub.subjectId].push(selectedDay);

                    if (matchedPreferredDay) totalPreferredDayMatches++;

                    newAllocations.push({
                        id: `rem_alloc_${Date.now()}_${course.id.slice(-4)}_${sub.subjectId.slice(-4)}_${selectedDay.slice(0, 3)}_${item.occurrenceIdx}`,
                        courseId: course.id,
                        className: course.name,
                        stream: 'All Streams',
                        subjectId: sub.subjectId,
                        subjectName: sub.subjectName,
                        teacherId: selectedTeacher.id,
                        teacherName: selectedTeacher.name,
                        dayOfWeek: selectedDay,
                        startTime,
                        endTime,
                        isWeekend,
                        priority: sub.priority,
                        createdAt: new Date().toISOString(),
                        institutionId
                    });
                }
            }

            // Save allocations
            for (const alloc of newAllocations) {
                if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                    await (apiService as any).saveRemedialAllocation(alloc);
                } else {
                    await apiService.saveModuleRecord('school_remedial_allocations', alloc);
                }
            }

            const matchPct = newAllocations.length > 0 ? Math.round((totalPreferredDayMatches / newAllocations.length) * 100) : 0;
            onLogAction?.(`Smart auto-generated ${newAllocations.length} remedial allocations across ${courses.length} classes. ${totalHighAllocated} high-priority slots scheduled, ${matchPct}% matched teacher preferred days.`);
            alert(
                `Smart Remedial Timetable Auto-Generated Successfully!\n\n` +
                `• Total Scheduled Sessions: ${newAllocations.length}\n` +
                `• High-Priority Sessions (e.g. Mathematics/Sciences 2×/wk): ${totalHighAllocated}\n` +
                `• Teacher Preferred Day Match Rate: ${matchPct}%\n` +
                `• Spaced Occurrences & Daily Limits: Enforced (${maxLessonsPerDay}/day Mon-Fri, ${maxWeekendLessonsPerDay}/day Sat-Sun).`
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
            const dayOfWeek = new Date(s.startTime).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const applicableRate = isWeekend
                ? (weekendHourlyRate || 1500)
                : (weekdayHourlyRate || hourlyRate || 1000);

            grouped[s.teacherId].totalHours += sHours;
            grouped[s.teacherId].totalAmount += sHours * applicableRate;
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
    }, [sessions, hourlyRate, weekdayHourlyRate, weekendHourlyRate]);

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

            if (isWeekend) {
                teacherMap[tId].weekendHours += hrs;
                teacherMap[tId].totalAmount += hrs * (weekendHourlyRate || 1500);
            } else {
                teacherMap[tId].weekdayHours += hrs;
                teacherMap[tId].totalAmount += hrs * (weekdayHourlyRate || hourlyRate || 1000);
            }
            teacherMap[tId].totalHours += hrs;
            teacherMap[tId].sessionCount += 1;
            if (s.status === 'Paid') teacherMap[tId].status = 'Paid';
        });

        return Object.values(teacherMap);
    }, [sessions, reportStartDate, reportEndDate, reportTeacherFilter, reportStatusFilter, weekdayHourlyRate, weekendHourlyRate, hourlyRate, users]);

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
                    users,
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
                    users,
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

    // Download Prefect QR Pass as A6 PDF
    const downloadPrefectCardPdf = (prefect: User, qrDataUrl: string, courseName: string, institutionName: string) => {
        try {
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

            // Institution Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(30, 27, 75);
            doc.text((institutionName || 'School Remedial Program').toUpperCase(), pageWidth / 2, 17, { align: 'center' });

            // Badge Pill
            doc.setFontSize(7.5);
            doc.setTextColor(79, 70, 229);
            doc.text('CLASS PREFECT VALIDATION CARD', pageWidth / 2, 23, { align: 'center' });

            // Horizontal Rule
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, 26, pageWidth - 14, 26);

            // Prefect Name
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text(prefect.name.toUpperCase(), pageWidth / 2, 34, { align: 'center' });

            // Stream Name
            doc.setFontSize(9);
            doc.setTextColor(79, 70, 229);
            doc.text(`STREAM: ${(courseName || 'Class').toUpperCase()}`, pageWidth / 2, 40, { align: 'center' });

            // QR Code Image
            const qrSource = qrDataUrl || prefectQrUrl;
            if (qrSource) {
                const qrSize = 54;
                const qrX = (pageWidth - qrSize) / 2;
                doc.addImage(qrSource, 'PNG', qrX, 45, qrSize, qrSize);
            }

            // Token ID
            doc.setFont('courier', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            const tokenStr = `Token: prefect_remedial_token_class_${prefect.courseId}`;
            doc.text(tokenStr, pageWidth / 2, 106, { align: 'center' });

            // Instructions
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text('Scan this QR code to verify session start and end.', pageWidth / 2, 114, { align: 'center' });
            doc.text('Authorized by Academic Administration', pageWidth / 2, 118, { align: 'center' });

            // Bottom Footer
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(79, 70, 229);
            doc.text('REMEDIAL LESSONS SCAN PASS', pageWidth / 2, 130, { align: 'center' });

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
                            font-size: 20px;
                            font-weight: 900;
                            text-transform: uppercase;
                            color: #0f172a;
                            letter-spacing: -0.5px;
                            margin: 0 0 4px 0;
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
                            (!cls.stream || a.stream === cls.stream || a.stream === 'All Streams' || !a.stream)
                        );
                        const cell = matches.map(a => `${getSubjectCode(a.subjectName, a.subjectId)} ${getTeacherCode(a.teacherId, a.teacherName, users)}`).join('<br/>') || '-';
                        return `<td style="text-align:center;font-weight:600;padding:6px;border:1px solid #334155;">${cell}</td>`;
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
                            (!cls.stream || a.stream === cls.stream || a.stream === 'All Streams' || !a.stream) &&
                            (a.startTime ? a.startTime >= slot.start && a.startTime < slot.end : true)
                        );
                        const cell = matches.map(a => `${getSubjectCode(a.subjectName, a.subjectId)} ${getTeacherCode(a.teacherId, a.teacherName, users)}`).join('<br/>') || '-';
                        return `<td style="text-align:center;font-weight:600;padding:6px;border:1px solid #334155;">${cell}</td>`;
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
                            (!cls.stream || a.stream === cls.stream || a.stream === 'All Streams' || !a.stream) &&
                            (a.startTime ? a.startTime >= slot.start && a.startTime < slot.end : true)
                        );
                        const cell = matches.map(a => `${getSubjectCode(a.subjectName, a.subjectId)} ${getTeacherCode(a.teacherId, a.teacherName, users)}`).join('<br/>') || '-';
                        return `<td style="text-align:center;font-weight:600;padding:6px;border:1px solid #334155;">${cell}</td>`;
                    }).join('')}
                </tr>
            `).join('');

            // Legend
            const subjectMap = new Map<string, string>();
            const teacherMap = new Map<string, string>();
            allocations.forEach(a => {
                const sCode = getSubjectCode(a.subjectName, a.subjectId);
                if (sCode && a.subjectName) subjectMap.set(sCode, a.subjectName);
                const tCode = getTeacherCode(a.teacherId, a.teacherName, users);
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

        const institutionName = currentInstitution?.name || 'School Remedial Program';
        const className = selectedTimetableClass === 'All' ? 'All Classes' : (courses.find(c => c.id === selectedTimetableClass)?.name || selectedTimetableClass);
        const streamName = selectedTimetableStream === 'All' ? 'All Streams' : selectedTimetableStream;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

        // Build HTML for each day's column
        const daysHtml = days.map(day => {
            const isWeekend = ['Saturday', 'Sunday'].includes(day);
            const dayAllocations = allocations.filter(a => {
                const matchDay = a.dayOfWeek === day;
                const matchClass = selectedTimetableClass === 'All' || a.courseId === selectedTimetableClass;
                const matchStream = selectedTimetableStream === 'All' 
                    || a.stream === selectedTimetableStream 
                    || (!a.stream && selectedTimetableStream === 'All Streams')
                    || (a.stream === 'All Streams');
                return matchDay && matchClass && matchStream;
            }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

            let lessonsHtml = '';

            const renderAllocCard = (alloc: RemedialAllocation) => `
                <div class="lesson-card ${alloc.priority === 'High' ? 'priority-high' : ''}">
                    <div class="lesson-subject">${alloc.subjectName} ${alloc.priority === 'High' ? '<span class="tag-high">High</span>' : ''}</div>
                    <div class="lesson-class">${alloc.className} ${alloc.stream && alloc.stream !== 'All Streams' ? `(${alloc.stream})` : ''}</div>
                    <div class="lesson-teacher">Teacher: ${alloc.teacherName}</div>
                    <div class="lesson-time">${alloc.startTime} - ${alloc.endTime}</div>
                </div>
            `;

            if (isWeekend && includeWeekendBreak) {
                const preBreak = dayAllocations.filter(a => (a.startTime || '') < (weekendBreakStartTime || '10:00'));
                const postBreak = dayAllocations.filter(a => (a.startTime || '') >= (weekendBreakStartTime || '10:00'));

                const preBreakHtml = preBreak.length > 0 ? preBreak.map(renderAllocCard).join('') : '<div class="empty-slot">No pre-break sessions</div>';
                const postBreakHtml = postBreak.length > 0 ? postBreak.map(renderAllocCard).join('') : '<div class="empty-slot">No post-break sessions</div>';

                const breakCardHtml = `
                    <div class="break-card">
                        <div class="break-title">&#9749; ${weekendBreakLabel || 'Tea & Refreshment Break'}</div>
                        <div class="break-time">${weekendBreakStartTime} – ${weekendBreakEndTime}</div>
                        <div class="break-sub">Weekend Recess</div>
                    </div>
                `;

                lessonsHtml = preBreakHtml + breakCardHtml + postBreakHtml;
            } else {
                if (dayAllocations.length === 0) {
                    lessonsHtml = '<div class="empty-slot">No lessons scheduled</div>';
                } else {
                    lessonsHtml = dayAllocations.map(renderAllocCard).join('');
                }
            }

            return `
                <div class="day-column ${isWeekend ? 'weekend-column' : ''}">
                    <div class="day-header">
                        <div class="day-name">${day}</div>
                        <div class="day-tag">${isWeekend ? 'Weekend' : 'Weekday'}</div>
                    </div>
                    <div class="day-content">
                        ${lessonsHtml}
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
                    <title>Remedial Timetable - ${className}</title>
                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 10mm;
                        }
                        * {
                            box-sizing: border-box;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            margin: 0;
                            padding: 16px;
                            background: #ffffff;
                            color: #0f172a;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            border-bottom: 2px solid #334155;
                            padding-bottom: 12px;
                            margin-bottom: 16px;
                        }
                        .inst-title {
                            font-size: 20px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: -0.5px;
                            margin: 0 0 4px 0;
                            color: #1e1b4b;
                        }
                        .doc-title {
                            font-size: 13px;
                            font-weight: 800;
                            text-transform: uppercase;
                            letter-spacing: 1.5px;
                            color: #4f46e5;
                            margin: 0;
                        }
                        .meta-box {
                            text-align: right;
                            font-size: 11px;
                            font-weight: 600;
                            color: #475569;
                        }
                        .meta-pill {
                            display: inline-block;
                            background: #eef2ff;
                            color: #4338ca;
                            padding: 3px 10px;
                            border-radius: 999px;
                            font-size: 10px;
                            font-weight: 800;
                            margin-top: 4px;
                            text-transform: uppercase;
                        }
                        .grid-container {
                            display: grid;
                            grid-template-columns: repeat(7, 1fr);
                            gap: 8px;
                            margin-bottom: 20px;
                        }
                        .day-column {
                            border: 1px solid #cbd5e1;
                            border-radius: 12px;
                            background: #f8fafc;
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                        }
                        .weekend-column {
                            background: #fffbeb;
                            border-color: #fde68a;
                        }
                        .day-header {
                            padding: 8px 6px;
                            text-align: center;
                            border-bottom: 1px solid #cbd5e1;
                            background: #f1f5f9;
                        }
                        .weekend-column .day-header {
                            background: #fef3c7;
                            border-bottom-color: #fde68a;
                        }
                        .day-name {
                            font-size: 12px;
                            font-weight: 900;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            color: #0f172a;
                        }
                        .day-tag {
                            font-size: 8px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #64748b;
                        }
                        .weekend-column .day-tag {
                            color: #b45309;
                        }
                        .day-content {
                            padding: 6px;
                            display: flex;
                            flex-direction: column;
                            gap: 6px;
                            flex: 1;
                        }
                        .lesson-card {
                            background: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            padding: 6px 7px;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                        }
                        .lesson-card.priority-high {
                            border-left: 3px solid #e11d48;
                        }
                        .tag-high {
                            display: inline-block;
                            background: #ffe4e6;
                            color: #be123c;
                            font-size: 7.5px;
                            font-weight: 800;
                            padding: 1px 4px;
                            border-radius: 4px;
                            text-transform: uppercase;
                            margin-left: 3px;
                        }
                        .lesson-subject {
                            font-size: 10.5px;
                            font-weight: 900;
                            text-transform: uppercase;
                            color: #0f172a;
                            margin-bottom: 2px;
                        }
                        .lesson-class {
                            font-size: 9px;
                            font-weight: 700;
                            color: #4f46e5;
                            text-transform: uppercase;
                            margin-bottom: 2px;
                        }
                        .lesson-teacher {
                            font-size: 8.5px;
                            color: #475569;
                            margin-bottom: 3px;
                        }
                        .lesson-time {
                            font-size: 8.5px;
                            font-family: monospace;
                            font-weight: 800;
                            color: #0f172a;
                            background: #f1f5f9;
                            padding: 2px 4px;
                            border-radius: 4px;
                            display: inline-block;
                        }
                        .break-card {
                            background: #fef3c7;
                            border: 1.5px dashed #f59e0b;
                            border-radius: 8px;
                            padding: 7px 5px;
                            text-align: center;
                            margin: 2px 0;
                        }
                        .break-title {
                            font-size: 9.5px;
                            font-weight: 900;
                            text-transform: uppercase;
                            color: #92400e;
                            letter-spacing: 0.3px;
                            margin-bottom: 1px;
                        }
                        .break-time {
                            font-size: 9px;
                            font-family: monospace;
                            font-weight: 900;
                            color: #b45309;
                        }
                        .break-sub {
                            font-size: 7.5px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #d97706;
                            letter-spacing: 0.5px;
                        }
                        .empty-slot {
                            font-size: 9px;
                            color: #94a3b8;
                            font-style: italic;
                            text-align: center;
                            padding: 12px 0;
                        }
                        .footer {
                            border-top: 1.5px solid #e2e8f0;
                            padding-top: 12px;
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            font-size: 9.5px;
                            color: #64748b;
                        }
                        .sig-line {
                            width: 180px;
                            border-top: 1px solid #334155;
                            margin-top: 24px;
                            text-align: center;
                            font-size: 9px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #0f172a;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 class="inst-title">${institutionName}</h1>
                            <p class="doc-title">Weekly Remedial Tuition &amp; Revision Timetable</p>
                        </div>
                        <div class="meta-box">
                            <div>Class: <strong>${className}</strong> | Stream: <strong>${streamName}</strong></div>
                            <div>Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div class="meta-pill">Official Academic Schedule</div>
                        </div>
                    </div>

                    <div class="grid-container">
                        ${daysHtml}
                    </div>

                    <div class="footer">
                        <div>
                            <div><strong>Guidelines:</strong> Weekday tuition starts at ${weekdayStartTime} to ${weekdayEndTime}.</div>
                            <div>Weekend tuition window: Saturday ${saturdayStartTime} to ${saturdayEndTime} | Sunday ${sundayStartTime} to ${sundayEndTime}. ${includeWeekendBreak ? `Weekend break interval observed: ${weekendBreakStartTime} – ${weekendBreakEndTime} (${weekendBreakLabel}).` : ''}</div>
                            <div style="margin-top: 3px; font-size: 8.5px; color: #94a3b8;">All remedial sessions require prefect QR authentication upon session initiation and conclusion.</div>
                        </div>
                        <div style="display: flex; gap: 32px;">
                            <div>
                                <div class="sig-line">Director of Studies</div>
                            </div>
                            <div>
                                <div class="sig-line">Principal / Headteacher</div>
                            </div>
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
            {activeTab === 'allocations' && (
                <div className="space-y-6">
                    {/* Header Controls */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-500" /> Remedial Subject Allocations &amp; Weekly Timetable
                            </h4>
                            <p className="text-xs text-slate-500">
                                Assign subjects and teachers manually or auto-generate a weekly remedial timetable respecting weekday/weekend limits.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

                    {/* Filter & Print Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Class:</span>
                                <select
                                    value={selectedTimetableClass}
                                    onChange={e => {
                                        setSelectedTimetableClass(e.target.value);
                                        setSelectedTimetableStream('All');
                                    }}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                >
                                    <option value="All">All Classes ({courses.length})</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Stream:</span>
                                <select
                                    value={selectedTimetableStream}
                                    onChange={e => setSelectedTimetableStream(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                >
                                    <option value="All">All Streams</option>
                                    {distinctTimetableStreams.map(str => (
                                        <option key={str} value={str}>{str}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handlePrintTimetable}
                            className="px-4 py-2 bg-gradient-to-r from-slate-900 to-indigo-900 dark:from-indigo-600 dark:to-violet-600 text-white hover:opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> Print Timetable Grid
                        </button>
                    </div>

                    {/* Weekly Timetable Grid View */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(day => {
                                const isWeekend = ['Saturday', 'Sunday'].includes(day);
                                const dayAllocations = allocations.filter(a => {
                                    const matchDay = a.dayOfWeek === day;
                                    const matchClass = selectedTimetableClass === 'All' || a.courseId === selectedTimetableClass;
                                    const matchStream = selectedTimetableStream === 'All' 
                                        || a.stream === selectedTimetableStream 
                                        || (!a.stream && selectedTimetableStream === 'All Streams')
                                        || (a.stream === 'All Streams');
                                    return matchDay && matchClass && matchStream;
                                }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                                const preBreakAllocations = isWeekend && includeWeekendBreak 
                                    ? dayAllocations.filter(a => (a.startTime || '') < (weekendBreakStartTime || '10:00'))
                                    : dayAllocations;
                                const postBreakAllocations = isWeekend && includeWeekendBreak 
                                    ? dayAllocations.filter(a => (a.startTime || '') >= (weekendBreakStartTime || '10:00'))
                                    : [];

                                const renderAllocCard = (alloc: RemedialAllocation) => (
                                    <div 
                                        key={alloc.id}
                                        className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:border-indigo-500/50 transition-all space-y-1.5"
                                    >
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
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
                                            <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <UserCheck className="w-3 h-3 text-slate-400" /> 
                                                <span className={alloc.substituteTeacherName ? 'line-through text-slate-400' : ''}>
                                                    {alloc.teacherName}
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

                                        {(() => {
                                            const streamPrefect = prefectsList.find(p => {
                                                const cMatch = p.courseId === alloc.courseId || 
                                                    (p.className && alloc.className && p.className.toLowerCase().trim() === alloc.className.toLowerCase().trim());
                                                if (!cMatch) return false;
                                                if (alloc.stream && alloc.stream !== 'All Streams' && p.stream) {
                                                    return p.stream.toLowerCase().trim() === alloc.stream.toLowerCase().trim();
                                                }
                                                return true;
                                            });
                                            if (!streamPrefect) return null;
                                            return (
                                                <p className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate" title={`Designated Leader: ${streamPrefect.name}`}>
                                                    <Shield className="w-2.5 h-2.5 shrink-0 text-amber-500" /> Leader: {streamPrefect.name}
                                                </p>
                                            );
                                        })()}

                                        {/* DOS Action Bar on Card */}
                                        <div className="pt-1.5 flex items-center justify-between gap-1 flex-wrap">
                                            {alloc.status === 'Substitute Pending' && (
                                                <div className="flex items-center gap-1 w-full justify-between">
                                                    <button 
                                                        onClick={() => handleDosApprovePendingSub(alloc)}
                                                        className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                                        title="Directly confirm and lock this substitute"
                                                    >
                                                        <Check className="w-2.5 h-2.5" /> Confirm
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDosRevertToOriginal(alloc)}
                                                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                                        title="Cancel substitute request and revert to original teacher"
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
                                                        title="Run priority engine to auto-assign next substitute"
                                                    >
                                                        <Sparkles className="w-2.5 h-2.5" /> Auto-Sub
                                                    </button>
                                                    <button 
                                                        onClick={() => { setReassigningAlloc(alloc); setReassignTeacherId(''); }}
                                                        className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded text-[8px] font-black uppercase transition-all flex items-center gap-0.5"
                                                        title="Manually select teacher"
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
                                                        title="Edit allocation slot"
                                                    >
                                                        <Pencil className="w-2.5 h-2.5" /> Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => { setReassigningAlloc(alloc); setReassignTeacherId(''); }}
                                                        className="text-[8px] font-bold text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-0.5 transition-colors"
                                                        title="Reassign or replace teacher"
                                                    >
                                                        <UserPlus className="w-2.5 h-2.5" /> Reassign
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                            <span className="text-[9px] font-mono font-bold text-slate-400">
                                                {alloc.startTime} - {alloc.endTime}
                                            </span>
                                            <span className="text-[8px] font-black uppercase text-slate-400">
                                                {isWeekend ? 'Weekend Tariff' : 'Weekday Tariff'}
                                            </span>
                                        </div>
                                    </div>
                                );

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
                                            {/* Pre-break allocations (or all allocations for weekdays) */}
                                            {preBreakAllocations.length > 0 ? (
                                                preBreakAllocations.map(renderAllocCard)
                                            ) : !isWeekend && (
                                                <p className="text-[10px] text-slate-400 font-medium italic text-center py-6">No lessons scheduled</p>
                                            )}

                                            {/* Weekend Break Card */}
                                            {isWeekend && includeWeekendBreak && (
                                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-3 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 shadow-xs flex flex-col items-center justify-center text-center space-y-1 my-2 print:border-amber-500 print:bg-amber-50">
                                                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                                                        <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">{weekendBreakLabel || 'Tea & Refreshment Break'}</span>
                                                    </div>
                                                    <p className="text-[9px] font-mono font-black text-amber-700 dark:text-amber-300">
                                                        {weekendBreakStartTime} – {weekendBreakEndTime}
                                                    </p>
                                                    <span className="text-[7.5px] font-bold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/90">Official Weekend Recess</span>
                                                </div>
                                            )}

                                            {/* Post-break allocations (for weekends) */}
                                            {postBreakAllocations.length > 0 && (
                                                postBreakAllocations.map(renderAllocCard)
                                            )}

                                            {isWeekend && dayAllocations.length === 0 && !includeWeekendBreak && (
                                                <p className="text-[10px] text-slate-400 font-medium italic text-center py-6">No lessons scheduled</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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
                                                        session.status === 'Approved' ? 'bg-indigo-100 text-indigo-600' :
                                                        session.status === 'Prefect Confirmed' ? 'bg-amber-100 text-amber-600' :
                                                        session.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
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
                                                    {session.status === 'Approved' && (
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                            <Check className="w-3.5 h-3.5" /> Ready for Payout
                                                        </span>
                                                    )}
                                                    {session.status === 'Paid' && (
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 justify-end">
                                                            Paid in Voucher
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
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Payout Vouchers Ledger</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher ID</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Anonymous Signature</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No payouts recorded.</td>
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
                                                    {p.anonymousSignature ? (
                                                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{p.anonymousSignature}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase italic">Awaiting Signature</span>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekday Rate (Mon - Fri / hr)</label>
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
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekend Rate (Sat & Sun / hr)</label>
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

                                    {/* Weekend Break Configuration */}
                                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox"
                                                    checked={includeWeekendBreak}
                                                    onChange={e => setIncludeWeekendBreak(e.target.checked)}
                                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                                    <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                    Include Weekend Break on Timetable &amp; Prints
                                                </span>
                                            </label>
                                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                                includeWeekendBreak 
                                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                            }`}>
                                                {includeWeekendBreak ? 'Printable & Active' : 'Disabled'}
                                            </span>
                                        </div>

                                        {includeWeekendBreak && (
                                            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/50 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">Break Time Window (Start – End)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input 
                                                                type="time"
                                                                value={weekendBreakStartTime}
                                                                onChange={e => setWeekendBreakStartTime(e.target.value)}
                                                                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white font-mono"
                                                            />
                                                            <input 
                                                                type="time"
                                                                value={weekendBreakEndTime}
                                                                onChange={e => setWeekendBreakEndTime(e.target.value)}
                                                                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">Break Label / Description</label>
                                                        <input 
                                                            type="text"
                                                            value={weekendBreakLabel}
                                                            onChange={e => setWeekendBreakLabel(e.target.value)}
                                                            placeholder="e.g. Tea & Refreshment Break"
                                                            className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-amber-500 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-amber-700 dark:text-amber-300/80 font-medium flex items-center gap-1">
                                                    <span>☕</span> This break interval will be displayed and printable on weekend timetable columns, separating morning and afternoon sessions.
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
                                <button
                                    onClick={handleSaveRates}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all shrink-0 flex items-center gap-1.5"
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
                                                                    (!cls.stream || a.stream === cls.stream || a.stream === 'All Streams' || !a.stream)
                                                                );
                                                                return (
                                                                    <td key={day} className={`py-2 px-2 text-[11px] font-bold ${dIdx < 4 ? 'border-r border-slate-300 dark:border-slate-700' : ''}`}>
                                                                        {matches.length === 0 ? (
                                                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                        ) : (
                                                                            matches.map((a, mIdx) => (
                                                                                <div key={mIdx} className="font-mono text-slate-900 dark:text-white font-extrabold">
                                                                                    <span className="text-indigo-700 dark:text-indigo-400">{getSubjectCode(a.subjectName, a.subjectId)}</span>{' '}
                                                                                    <span className="text-slate-700 dark:text-slate-300">{getTeacherCode(a.teacherId, a.teacherName, users)}</span>
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
                                                                    (!cls.stream || a.stream === cls.stream || a.stream === 'All Streams' || !a.stream) &&
                                                                    (a.startTime ? a.startTime >= slot.start && a.startTime < slot.end : true)
                                                                );
                                                                return (
                                                                    <td key={sIdx} className={`py-2 px-2 text-[11px] font-bold ${sIdx < 5 ? 'border-r border-slate-300 dark:border-slate-700' : ''}`}>
                                                                        {matches.length === 0 ? (
                                                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                        ) : (
                                                                            matches.map((a, mIdx) => (
                                                                                <div key={mIdx} className="font-mono text-slate-900 dark:text-white font-extrabold">
                                                                                    <span className="text-indigo-700 dark:text-indigo-400">{getSubjectCode(a.subjectName, a.subjectId)}</span>{' '}
                                                                                    <span className="text-slate-700 dark:text-slate-300">{getTeacherCode(a.teacherId, a.teacherName, users)}</span>
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
                                                Weekend Recess: 11:00 – 11:30 (Break)
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
                                                                    (!cls.stream || a.stream === cls.stream || a.stream === 'All Streams' || !a.stream) &&
                                                                    (a.startTime ? a.startTime >= slot.start && a.startTime < slot.end : true)
                                                                );
                                                                return (
                                                                    <td key={sIdx} className={`py-2 px-2 text-[11px] font-bold ${sIdx < 2 ? 'border-r border-slate-300 dark:border-slate-700' : ''}`}>
                                                                        {matches.length === 0 ? (
                                                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                                                        ) : (
                                                                            matches.map((a, mIdx) => (
                                                                                <div key={mIdx} className="font-mono text-slate-900 dark:text-white font-extrabold">
                                                                                    <span className="text-indigo-700 dark:text-indigo-400">{getSubjectCode(a.subjectName, a.subjectId)}</span>{' '}
                                                                                    <span className="text-slate-700 dark:text-slate-300">{getTeacherCode(a.teacherId, a.teacherName, users)}</span>
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
                                                            const tCode = getTeacherCode(a.teacherId, a.teacherName, users);
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
            {printingPrefect && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in no-print" 
                    onClick={() => setPrintingPrefect(null)}
                >
                    <div 
                        className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" 
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
                                    <h4 className="text-sm font-black uppercase tracking-tight text-indigo-950 leading-tight">
                                        {currentInstitution?.name || 'SCHOOL REMEDIAL PROGRAM'}
                                    </h4>
                                    <span className="inline-block mt-2 px-3 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                                        Class Prefect Card
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900">{printingPrefect.name}</h3>
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
                                    currentInstitution?.name || 'School Remedial Program'
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
                </div>
            )}

            {/* DOM Print Sheet for Native Browser Print Preview (Includes .print-only to override body visibility:hidden) */}
            {printingPrefect && (
                <div id="prefect-print-sheet" className="print-only hidden print:flex fixed inset-0 bg-white z-[999999] flex-col items-center justify-center p-8 text-black text-center font-sans">
                    <div className="border-4 border-double border-indigo-600 p-8 max-w-sm w-full mx-auto rounded-[2rem] space-y-5 bg-white">
                        <h2 className="text-lg font-black uppercase tracking-tight text-indigo-900">
                            {currentInstitution?.name || 'SCHOOL REMEDIAL PROGRAM'}
                        </h2>
                        <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                            Class Prefect Card
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">{printingPrefect.name}</h3>
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
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-500" /> {editingAlloc ? 'Edit Allocation' : 'Manual Allocation'}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {editingAlloc ? 'Modify scheduling, subject, class, stream, or teacher' : 'Assign a subject & teacher to a specific day slot'}
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
                    <form onSubmit={handleCreateManualAllocation} className="p-7 space-y-5">
                        {/* Class & Stream Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Class / Grade</label>
                                <select
                                    value={allocCourseId}
                                    onChange={e => {
                                        setAllocCourseId(e.target.value);
                                        setAllocStream('All Streams');
                                        setCustomAllocStream('');
                                    }}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                >
                                    <option value="">-- Select Class --</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

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
                        </div>

                        {allocStream === '__custom__' && (
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
                                {users
                                    .filter(u => u.role === 'lecturer' || u.role === 'teacher')
                                    .map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                                }
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
                                    return (
                                        <button
                                            key={fullDay}
                                            type="button"
                                            onClick={() => {
                                                setAllocDay(fullDay);
                                                if (fullDay === 'Saturday') {
                                                    setAllocStartTime(saturdayStartTime || '08:00');
                                                    setAllocEndTime(includeWeekendBreak ? (weekendBreakStartTime || '10:00') : (saturdayEndTime || '12:00'));
                                                } else if (fullDay === 'Sunday') {
                                                    setAllocStartTime(sundayStartTime || '09:00');
                                                    setAllocEndTime(sundayEndTime || '13:00');
                                                } else {
                                                    setAllocStartTime(weekdayStartTime || '16:00');
                                                    setAllocEndTime(weekdayEndTime || '18:00');
                                                }
                                            }}
                                            className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                                                isSelected
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

                        {/* Time Window */}
                        <div className="space-y-2">
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

                            {allocDay === 'Saturday' && includeWeekendBreak && (
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Coffee className="w-3 h-3" /> Saturday Break Slots:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(saturdayStartTime || '08:00');
                                            setAllocEndTime(weekendBreakStartTime || '10:00');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Pre-Break ({saturdayStartTime || '08:00'} - {weekendBreakStartTime || '10:00'})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAllocStartTime(weekendBreakEndTime || '10:30');
                                            setAllocEndTime(saturdayEndTime || '12:30');
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold transition-all"
                                    >
                                        Post-Break ({weekendBreakEndTime || '10:30'} - {saturdayEndTime || '12:30'})
                                    </button>
                                </div>
                            )}

                            {allocDay === 'Sunday' && (
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
                                className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {editingAlloc ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingAlloc ? 'Update Allocation' : 'Save Allocation'}
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
        </>
    );
};
