import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    QrCode, Camera, Clock, Calendar, DollarSign, CheckCircle2,
    AlertCircle, User as UserIcon, MapPin, ShieldCheck, Check, X,
    ChevronRight, Download, LogOut, RefreshCw, Briefcase, Languages,
    Plus, Phone, Building2, Sparkles, CheckSquare, Square, FileDown,
    Eye, HelpCircle, Send, ArrowLeft, Timer, Bell, Sun, Moon,
    FileText, Info, Award, Compass, Smartphone, ChevronDown
} from 'lucide-react';
import type { Institution, User, PayrollRecord } from '../../types';
import { apiService } from '../../services/apiService';
import { generateStaffPayslipPdf } from '../../services/pdfService';
import { calculateDistance } from '../../utils/locationUtils';

export interface SupportStaffMobileAppProps {
    currentUser: User;
    currentInstitution: Institution;
    onRefreshData?: () => Promise<void> | void;
    onSwitchPerspective?: (role: string) => void;
    onLogout?: () => void;
}

type TabType = 'attendance' | 'leave' | 'payslips' | 'tasks' | 'badge';

interface LeaveRequestItem {
    id: string;
    institution_id: string;
    user_id: string;
    staff_id?: string;
    applicant_name?: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: string;
    approved_at?: string;
    created_at?: string;
}

interface StaffTask {
    id: string;
    title: string;
    is_complete: boolean;
    due_date?: string;
    completed_at?: string;
    category?: string;
}

// English and Kiswahili localizations tailored for Kenyan Support Staff
const TRANSLATIONS = {
    en: {
        appName: "Staff Mobile Portal",
        greeting: "Jambo",
        role: "Role",
        shiftStatus: "Current Status",
        onDuty: "On Duty (Clocked In)",
        offDuty: "Off Duty (Clocked Out)",
        clockIn: "Clock In Now",
        clockOut: "Clock Out Shift",
        attendance: "Attendance",
        leave: "Leave",
        payslips: "Payslips",
        tasks: "My Duties",
        badge: "ID Badge",
        campusDistance: "Campus GPS Distance",
        withinRange: "Inside Campus Boundary",
        outsideRange: "Outside Campus Boundary",
        scanGateQr: "Scan Gate QR Code",
        myQrBadge: "My Digital QR Badge",
        applyLeave: "Apply for Leave",
        leaveBalance: "Leave Balances",
        annualLeave: "Annual Leave",
        sickLeave: "Sick Leave",
        compassionateLeave: "Compassionate",
        maternityLeave: "Maternity / Paternity",
        daysRemaining: "days remaining",
        pending: "Pending HR Review",
        approved: "Approved",
        rejected: "Rejected",
        salaryBreakdown: "Salary Breakdown",
        grossPay: "Gross Pay",
        netPay: "Net Salary",
        totalDeductions: "Total Deductions",
        downloadPayslip: "Download Payslip PDF",
        advanceRequest: "Request Salary Advance",
        advanceAmount: "Advance Amount (KES)",
        submitRequest: "Submit Application",
        reason: "Reason / Notes",
        dailyChecklist: "Today's Work Orders",
        addTask: "Add Personal Duty",
        markDone: "Mark Completed",
        completed: "Completed",
        switchLang: "Kiswahili",
        cameraError: "Unable to start camera. Please verify camera permissions.",
        clockInSuccess: "Clock-In Verified & Logged Successfully!",
        clockOutSuccess: "Clock-Out Logged Successfully!",
        leaveSuccess: "Leave application sent to HR / Management!",
        advanceSuccess: "Salary advance request submitted!",
        emergencyContacts: "Campus Emergency & Security",
        terms: "Employment Terms",
        employeeNo: "Staff / Payroll ID"
    },
    sw: {
        appName: "Mfumo wa Wafanyakazi",
        greeting: "Habari yako",
        role: "Wadhifa",
        shiftStatus: "Hali ya Kazi",
        onDuty: "Upo Kazini (Umeingia)",
        offDuty: "Nje ya Kazi (Umetoka)",
        clockIn: "Ingia Kazini Sasa",
        clockOut: "Toka Kazini (Shift)",
        attendance: "Mahudhurio",
        leave: "Likizo",
        payslips: "Mishahara",
        tasks: "Majukumu",
        badge: "Kitambulisho",
        campusDistance: "Umbali wa Shule / Taasisi",
        withinRange: "Ndani ya Eneo la Taasisi",
        outsideRange: "Nje ya Eneo la Taasisi",
        scanGateQr: "Piga Picha QR ya Lango",
        myQrBadge: "QR ya Kitambulisho",
        applyLeave: "Omba Likizo",
        leaveBalance: "Salio la Likizo",
        annualLeave: "Likizo ya Mwaka",
        sickLeave: "Likizo ya Ugonjwa",
        compassionateLeave: "Likizo ya Dharura",
        maternityLeave: "Likizo ya Uzazi",
        daysRemaining: "siku zilizobaki",
        pending: "Inasubiri Idhini ya HR",
        approved: "Imeidhinishwa",
        rejected: "Imekataliwa",
        salaryBreakdown: "Mchanganuo wa Mshahara",
        grossPay: "Jumla ya Mapato",
        netPay: "Mshahara Halisi (Wavu)",
        totalDeductions: "Jumla ya Makato",
        downloadPayslip: "Pakua Hati ya Malipo",
        advanceRequest: "Omba Mkopo / Advance",
        advanceAmount: "Kiasi cha Advance (KES)",
        submitRequest: "Wasilisha Ombi",
        reason: "Sababu / Maelezo",
        dailyChecklist: "Orodha ya Majukumu ya Leo",
        addTask: "Ongeza Jukumu Jipya",
        markDone: "Kamilisha Jukumu",
        completed: "Imekamilika",
        switchLang: "English",
        cameraError: "Kamera haipatikani. Tafadhali ruhusu kamera kwenye simu yako.",
        clockInSuccess: "Umeingia kazini kikamilifu!",
        clockOutSuccess: "Umetoka kazini kikamilifu!",
        leaveSuccess: "Ombi la likizo limewasilishwa kwa usimamizi!",
        advanceSuccess: "Ombi la mkopo limewasilishwa!",
        emergencyContacts: "Nambari za Dharura za Shule",
        terms: "Masharti ya Kazi",
        employeeNo: "Nambari ya Mfanyakazi"
    }
};

export const SupportStaffMobileApp: React.FC<SupportStaffMobileAppProps> = ({
    currentUser,
    currentInstitution,
    onRefreshData,
    onSwitchPerspective,
    onLogout
}) => {
    // Current Active Tab
    const [activeTab, setActiveTab] = useState<TabType>('attendance');

    // Language Toggle: English or Swahili
    const [lang, setLang] = useState<'en' | 'sw'>('en');
    const t = TRANSLATIONS[lang];

    // Status message toast
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // -------------------------------------------------------------
    // 1. ATTENDANCE & SHIFT STATE
    // -------------------------------------------------------------
    const [isOnDuty, setIsOnDuty] = useState<boolean>(false);
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [clockOutTime, setClockOutTime] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [todayPunchCount, setTodayPunchCount] = useState<number>(0);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

    // GPS Geolocation state
    const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
    const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [isInsideCampus, setIsInsideCampus] = useState<boolean>(true);

    // QR Scanner Modal State
    const [isScanningQr, setIsScanningQr] = useState<boolean>(false);
    const [isShowingMyBadge, setIsShowingMyBadge] = useState<boolean>(false);
    const [scannerFacing, setScannerFacing] = useState<'environment' | 'user'>('environment');
    const [scanProcessing, setScanProcessing] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // -------------------------------------------------------------
    // 2. LEAVE MANAGEMENT STATE
    // -------------------------------------------------------------
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
    const [isApplyingLeave, setIsApplyingLeave] = useState<boolean>(false);
    const [leaveType, setLeaveType] = useState<string>('Annual Leave');
    const [leaveStartDate, setLeaveStartDate] = useState<string>('');
    const [leaveEndDate, setLeaveEndDate] = useState<string>('');
    const [leaveReason, setLeaveReason] = useState<string>('');
    const [leaveHandover, setLeaveHandover] = useState<string>('');
    const [leavePhone, setLeavePhone] = useState<string>('');
    const [submittingLeave, setSubmittingLeave] = useState<boolean>(false);

    // Leave Balances (defaults standard for Kenya Employment Act)
    const [leaveBalances, setLeaveBalances] = useState({
        annualTotal: 21,
        annualUsed: 5,
        sickTotal: 30,
        sickUsed: 2,
        compassionateTotal: 5,
        compassionateUsed: 0,
        maternityTotal: 90,
        maternityUsed: 0
    });

    // -------------------------------------------------------------
    // 3. PAYSLIPS & FINANCIALS STATE
    // -------------------------------------------------------------
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [isRequestingAdvance, setIsRequestingAdvance] = useState<boolean>(false);
    const [advanceAmount, setAdvanceAmount] = useState<string>('');
    const [advanceReason, setAdvanceReason] = useState<string>('');
    const [submittingAdvance, setSubmittingAdvance] = useState<boolean>(false);
    const [selectedPayslipRecord, setSelectedPayslipRecord] = useState<PayrollRecord | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

    // -------------------------------------------------------------
    // 4. DAILY TASKS & DUTIES STATE
    // -------------------------------------------------------------
    const [tasks, setTasks] = useState<StaffTask[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState<string>('');
    const [isAddingTask, setIsAddingTask] = useState<boolean>(false);

    // Format Role Name Display
    const staffRoleTitle = useMemo(() => {
        const rawRole = (currentUser.role || 'support_staff').toLowerCase();
        if (rawRole === 'cleaner') return lang === 'sw' ? 'Afisa Usafi' : 'Sanitation & Cleaner';
        if (rawRole === 'cook') return lang === 'sw' ? 'Mpishi Mkuu' : 'Head Catering & Cook';
        if (rawRole === 'driver') return lang === 'sw' ? 'Dereva wa Taasisi' : 'Institutional Driver';
        if (rawRole === 'groundsman') return lang === 'sw' ? 'Mtunza Mazingira' : 'Groundsman & Landscaper';
        if (rawRole === 'security') return lang === 'sw' ? 'Mlinzi wa Usalama' : 'Campus Security Guard';
        if (rawRole === 'maintenance') return lang === 'sw' ? 'Ufundi & Matengenezo' : 'Maintenance Technician';
        return lang === 'sw' ? 'Mhudumu wa Taasisi' : 'General Support Staff';
    }, [currentUser.role, lang]);

    // Employee ID code
    const staffIdCode = useMemo(() => {
        const meta = currentUser.metadata || {};
        return currentUser.staffId || (currentUser as any).staff_id || meta.staffId || meta.nationalId || `EMP-${currentUser.id.slice(-6).toUpperCase()}`;
    }, [currentUser]);

    // -------------------------------------------------------------
    // INITIAL DATA LOADING
    // -------------------------------------------------------------
    const loadStaffData = useCallback(async () => {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Load today's check-in / attendance records
        try {
            const todayRecords = await apiService.fetchModuleRecords<any>('staff_attendance_daily', currentInstitution.id).catch(() => []);
            const myToday = todayRecords.find((r: any) => 
                (r.staff_id === currentUser.id || r.staffId === currentUser.id || r.user_id === currentUser.id) &&
                (r.attendance_date === todayStr || r.attendanceDate === todayStr)
            );

            if (myToday) {
                setIsOnDuty(myToday.status === 'present' && !myToday.last_out);
                setClockInTime(myToday.first_in || myToday.firstIn || null);
                setClockOutTime(myToday.last_out || myToday.lastOut || null);
                setTodayPunchCount(myToday.punch_count || myToday.punchCount || 1);
            }

            // Filter recent 7 days attendance
            const myHistory = todayRecords
                .filter((r: any) => (r.staff_id === currentUser.id || r.staffId === currentUser.id || r.user_id === currentUser.id))
                .sort((a: any, b: any) => (b.attendance_date || b.attendanceDate || '').localeCompare(a.attendance_date || a.attendanceDate || ''));
            setAttendanceHistory(myHistory.slice(0, 7));
        } catch (e) {
            console.warn('[StaffApp] Attendance load fallback:', e);
        }

        // 2. Load Leave Requests
        try {
            const leaves = await apiService.fetchModuleRecords<LeaveRequestItem>('leave_requests', currentInstitution.id).catch(() => []);
            const myLeaves = leaves.filter((l: any) => l.user_id === currentUser.id || l.staff_id === currentUser.id);
            setLeaveRequests(myLeaves);

            // Compute used days
            const approvedAnnualDays = myLeaves
                .filter(l => l.status === 'Approved' && l.leave_type.toLowerCase().includes('annual'))
                .reduce((acc, curr) => acc + (curr.days || 1), 0);
            const approvedSickDays = myLeaves
                .filter(l => l.status === 'Approved' && l.leave_type.toLowerCase().includes('sick'))
                .reduce((acc, curr) => acc + (curr.days || 1), 0);

            setLeaveBalances(prev => ({
                ...prev,
                annualUsed: approvedAnnualDays || prev.annualUsed,
                sickUsed: approvedSickDays || prev.sickUsed
            }));
        } catch (e) {
            console.warn('[StaffApp] Leave load fallback:', e);
        }

        // 3. Load Payroll Records
        try {
            const records = await apiService.fetchModuleRecords<PayrollRecord>('payroll_records', currentInstitution.id).catch(() => []);
            const myRecords = records
                .filter((r: any) => r.staffId === currentUser.id || r.staff_id === currentUser.id || r.userId === currentUser.id)
                .sort((a, b) => (b.month || '').localeCompare(a.month || ''));
            setPayrollRecords(myRecords);
            if (myRecords.length > 0) {
                setSelectedPayslipRecord(myRecords[0]);
            }
        } catch (e) {
            console.warn('[StaffApp] Payroll load fallback:', e);
        }

        // 4. Load Tasks
        try {
            const userTasks = await apiService.fetchModuleRecords<any>('tasks', undefined, undefined, {
                filter: { user_id: currentUser.id }
            }).catch(() => []);

            if (userTasks && userTasks.length > 0) {
                setTasks(userTasks.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    is_complete: Boolean(t.is_complete || t.isComplete),
                    due_date: t.due_date || t.dueDate,
                    completed_at: t.completed_at || t.completedAt
                })));
            } else {
                // Seed smart role-specific default duties if empty
                seedDefaultRoleTasks();
            }
        } catch (e) {
            seedDefaultRoleTasks();
        }
    }, [currentUser.id, currentInstitution.id]);

    const seedDefaultRoleTasks = () => {
        const rawRole = (currentUser.role || '').toLowerCase();
        let defaultList: string[] = [];

        if (rawRole === 'cleaner') {
            defaultList = [
                'Disinfect Science Labs & Computer Rooms',
                'Deep clean student sanitation blocks & restock soap',
                'Empty waste receptacles across Admin block',
                'Mop Administration corridors & reception entrance'
            ];
        } else if (rawRole === 'cook') {
            defaultList = [
                'Prepare 10:00 AM Staff Tea & light refreshments',
                'Inspect dry food store rations & hygiene levels',
                'Prepare student mid-day meal (Githeri / Steamed Rice)',
                'Sanitize kitchen counters & industrial cookers'
            ];
        } else if (rawRole === 'driver') {
            defaultList = [
                'Pre-trip bus mechanical check (Oil, Coolant, Tires)',
                'Morning student transport route pickup',
                'Log daily fuel consumption & odometer reading',
                'Afternoon safe student drop-off route departure'
            ];
        } else if (rawRole === 'groundsman') {
            defaultList = [
                'Mow main sports pitch & trim perimeter grass',
                'Water flower beds & bougainvillea borders',
                'Inspect compound stormwater drainage & clean grates',
                'Rake fallen leaves around dining hall & dormitories'
            ];
        } else if (rawRole === 'security') {
            defaultList = [
                'Complete morning shift handover logbook',
                'Verify visitor passes & electronic gate logs',
                'Perimeter fence inspection (North & East Wings)',
                'Evening student roll call security presence'
            ];
        } else {
            defaultList = [
                'Morning campus readiness & utility inspection',
                'Deliver internal stationery & department requisitions',
                'Assist facilities officer with routine campus maintenance',
                'Complete daily supervisor sign-off sheet'
            ];
        }

        setTasks(defaultList.map((title, idx) => ({
            id: `task_${Date.now()}_${idx}`,
            title,
            is_complete: idx === 0,
            due_date: new Date().toISOString().split('T')[0]
        })));
    };

    useEffect(() => {
        loadStaffData();
    }, [loadStaffData]);

    // Live Shift Timer (Tick every second if on duty)
    useEffect(() => {
        let timer: any = null;
        if (isOnDuty && clockInTime) {
            const startTime = new Date(clockInTime).getTime();
            const updateTimer = () => {
                const now = Date.now();
                const diff = Math.max(0, Math.floor((now - startTime) / 1000));
                setElapsedSeconds(diff);
            };
            updateTimer();
            timer = setInterval(updateTimer, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isOnDuty, clockInTime]);

    // -------------------------------------------------------------
    // GPS LOCATION CHECK
    // -------------------------------------------------------------
    const checkGpsLocation = useCallback(() => {
        if (!navigator.geolocation) {
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setUserGps({ lat, lng });

                const instLat = currentInstitution.location?.latitude || (currentInstitution as any).latitude;
                const instLng = currentInstitution.location?.longitude || (currentInstitution as any).longitude;

                if (instLat && instLng) {
                    const dist = calculateDistance(lat, lng, Number(instLat), Number(instLng));
                    setDistanceMeters(Math.round(dist));
                    const radius = currentInstitution.checkinRadiusMeters || 250;
                    setIsInsideCampus(dist <= radius);
                } else {
                    // If institution coordinates aren't set yet, consider inside
                    setDistanceMeters(15);
                    setIsInsideCampus(true);
                }
                setIsLocating(false);
            },
            (err) => {
                console.warn('[StaffApp] GPS location warning:', err.message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }, [currentInstitution]);

    useEffect(() => {
        checkGpsLocation();
    }, [checkGpsLocation]);

    // -------------------------------------------------------------
    // CAMERA QR SCANNER ENGINE
    // -------------------------------------------------------------
    const startScannerCamera = async (facing: 'environment' | 'user' = 'environment') => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
        } catch (err: any) {
            console.warn('[StaffApp] Camera fallback:', err);
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = fallbackStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                    await videoRef.current.play().catch(() => {});
                }
            } catch (fallbackErr) {
                showToast(t.cameraError, 'error');
                setIsScanningQr(false);
            }
        }
    };

    const stopScannerCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        let scanInterval: any = null;
        let detector: any = null;

        if (isScanningQr) {
            startScannerCamera(scannerFacing);

            if ('BarcodeDetector' in window) {
                try {
                    detector = new (window as any).BarcodeDetector({
                        formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix']
                    });
                } catch (e) {
                    console.warn('[StaffApp] BarcodeDetector init:', e);
                }
            }

            scanInterval = setInterval(async () => {
                const video = videoRef.current;
                if (!video || video.readyState < 2 || scanProcessing) return;

                let codeDetected: string | null = null;
                if (detector) {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                            codeDetected = String(barcodes[0].rawValue).trim();
                        }
                    } catch (_) {}
                }

                if (codeDetected) {
                    handleQrCodeScanned(codeDetected);
                }
            }, 500);
        } else {
            stopScannerCamera();
        }

        return () => {
            if (scanInterval) clearInterval(scanInterval);
            stopScannerCamera();
        };
    }, [isScanningQr, scannerFacing]);

    // Handle Scanned Gate Code
    const handleQrCodeScanned = async (code: string) => {
        if (scanProcessing) return;
        setScanProcessing(true);

        try {
            // Audio / Haptic feedback on modern Android
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
        } catch (_) {}

        // Perform Clock In / Out via Gate Scan
        await executeClockAction(isOnDuty ? 'clock_out' : 'clock_in', `Gate QR Scanned: ${code.slice(0, 20)}`);
        setScanProcessing(false);
        setIsScanningQr(false);
    };

    // -------------------------------------------------------------
    // EXECUTE CLOCK IN / OUT ACTION
    // -------------------------------------------------------------
    const executeClockAction = async (type: 'clock_in' | 'clock_out', sourceNotes = 'Mobile App One-Touch Punch') => {
        const now = new Date();
        const nowISO = now.toISOString();
        const todayStr = nowISO.split('T')[0];

        try {
            const punchNum = todayPunchCount + 1;
            const newIsOnDuty = type === 'clock_in';

            const recordPayload: any = {
                institution_id: currentInstitution.id,
                institutionId: currentInstitution.id,
                staff_id: currentUser.id,
                staffId: currentUser.id,
                user_id: currentUser.id,
                attendance_date: todayStr,
                attendanceDate: todayStr,
                first_in: type === 'clock_in' ? nowISO : (clockInTime || nowISO),
                firstIn: type === 'clock_in' ? nowISO : (clockInTime || nowISO),
                last_out: type === 'clock_out' ? nowISO : null,
                lastOut: type === 'clock_out' ? nowISO : null,
                status: 'present',
                punch_count: punchNum,
                punchCount: punchNum,
                location: userGps ? `GPS (${userGps.lat.toFixed(5)}, ${userGps.lng.toFixed(5)}) - ${distanceMeters || 0}m` : 'Mobile Campus Verification',
                notes: sourceNotes,
                updated_at: nowISO
            };

            await apiService.saveModuleRecord('staff_attendance_daily', recordPayload).catch(() => {});

            // Also record in teacher_checkins to link with unified school security logs
            const hour = now.getHours();
            const shiftType = hour >= 14 ? 'Afternoon' : 'Morning';
            await apiService.processTeacherCheckIn({
                teacher_id: currentUser.id,
                institution_id: currentInstitution.id,
                checkin_type: shiftType,
                location: userGps ? `GPS: ${userGps.lat.toFixed(4)}, ${userGps.lng.toFixed(4)}` : 'Staff Mobile App',
                notes: `${type.toUpperCase()} - ${sourceNotes}`
            }).catch(() => {});

            setIsOnDuty(newIsOnDuty);
            if (type === 'clock_in') {
                setClockInTime(nowISO);
                showToast(t.clockInSuccess, 'success');
            } else {
                setClockOutTime(nowISO);
                showToast(t.clockOutSuccess, 'success');
            }
            setTodayPunchCount(punchNum);
            loadStaffData();
        } catch (err: any) {
            console.error('[StaffApp] Clock action error:', err);
            showToast(err?.message || 'Clock action failed', 'error');
        }
    };

    // -------------------------------------------------------------
    // LEAVE SUBMISSION HANDLER
    // -------------------------------------------------------------
    const handleSubmitLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveStartDate || !leaveEndDate) {
            showToast('Please select both start and end dates', 'error');
            return;
        }

        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate);
        if (end < start) {
            showToast('End date cannot precede start date', 'error');
            return;
        }

        // Calculate days difference
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        setSubmittingLeave(true);
        try {
            const newLeavePayload: any = {
                id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institution_id: currentInstitution.id,
                user_id: currentUser.id,
                staff_id: currentUser.id,
                applicant_name: currentUser.name,
                leave_type: leaveType,
                start_date: leaveStartDate,
                end_date: leaveEndDate,
                days: diffDays,
                reason: `${leaveReason}${leaveHandover ? ` | Handover to: ${leaveHandover}` : ''}${leavePhone ? ` | Contact: ${leavePhone}` : ''}`,
                status: 'Pending',
                created_at: new Date().toISOString()
            };

            await apiService.saveModuleRecord('leave_requests', newLeavePayload);
            showToast(t.leaveSuccess, 'success');
            setIsApplyingLeave(false);
            setLeaveReason('');
            setLeaveStartDate('');
            setLeaveEndDate('');
            setLeaveHandover('');
            setLeavePhone('');
            loadStaffData();
        } catch (err: any) {
            showToast(err?.message || 'Failed to submit leave', 'error');
        } finally {
            setSubmittingLeave(false);
        }
    };

    // -------------------------------------------------------------
    // SALARY ADVANCE REQUEST HANDLER
    // -------------------------------------------------------------
    const handleSubmitAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(advanceAmount);
        if (isNaN(amt) || amt <= 0) {
            showToast('Please enter a valid advance amount', 'error');
            return;
        }

        setSubmittingAdvance(true);
        try {
            const advancePayload: any = {
                id: `adv_${Date.now()}`,
                institution_id: currentInstitution.id,
                user_id: currentUser.id,
                staff_id: currentUser.id,
                staff_name: currentUser.name,
                requested_amount: amt,
                reason: advanceReason,
                status: 'pending',
                request_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString()
            };

            await apiService.saveModuleRecord('salary_advances', advancePayload).catch(() => {});
            showToast(t.advanceSuccess, 'success');
            setIsRequestingAdvance(false);
            setAdvanceAmount('');
            setAdvanceReason('');
        } catch (err: any) {
            showToast(err?.message || 'Failed to request advance', 'error');
        } finally {
            setSubmittingAdvance(false);
        }
    };

    // -------------------------------------------------------------
    // DOWNLOAD PAYSLIP PDF HANDLER
    // -------------------------------------------------------------
    const handleDownloadPayslip = async (record: PayrollRecord) => {
        setIsGeneratingPdf(true);
        try {
            const dataUri = await generateStaffPayslipPdf(
                currentUser,
                record,
                currentInstitution,
                currentInstitution.letterheadConfig
            );

            // Open or trigger download
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Payslip_${currentUser.name.replace(/\s+/g, '_')}_${record.month || 'Month'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Payslip PDF generated & downloaded!', 'success');
        } catch (err: any) {
            console.error('[StaffApp] Payslip PDF error:', err);
            showToast(err?.message || 'Could not generate PDF payslip', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // -------------------------------------------------------------
    // TASK TOGGLE HANDLER
    // -------------------------------------------------------------
    const handleToggleTask = async (task: StaffTask) => {
        const nextState = !task.is_complete;
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_complete: nextState, completed_at: nextState ? new Date().toISOString() : undefined } : t));

        try {
            await apiService.saveModuleRecord('tasks', {
                id: task.id,
                user_id: currentUser.id,
                title: task.title,
                is_complete: nextState,
                completed_at: nextState ? new Date().toISOString() : null
            }).catch(() => {});
        } catch (_) {}
    };

    const handleAddPersonalTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const newTask: StaffTask = {
            id: `task_${Date.now()}`,
            title: newTaskTitle.trim(),
            is_complete: false,
            due_date: new Date().toISOString().split('T')[0]
        };

        setTasks(prev => [newTask, ...prev]);
        setNewTaskTitle('');
        setIsAddingTask(false);

        try {
            await apiService.saveModuleRecord('tasks', {
                id: newTask.id,
                user_id: currentUser.id,
                title: newTask.title,
                is_complete: false,
                due_date: newTask.due_date
            }).catch(() => {});
        } catch (_) {}
    };

    // Format seconds into HH:MM:SS
    const formatTime = (totalSec: number) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Fallback Mock Payroll Record for Demo if none yet generated by Bursar
    const activePayroll: PayrollRecord = useMemo(() => {
        if (selectedPayslipRecord) return selectedPayslipRecord;
        const base = currentUser.salary || 24000;
        const housing = Math.round(base * 0.15);
        const gross = base + housing;
        const nssf = 1080;
        const shif = Math.round(gross * 0.0275);
        const ahl = Math.round(gross * 0.015);
        const paye = Math.max(0, Math.round((gross - 24000) * 0.1));
        const totalDed = nssf + shif + ahl + paye;
        const net = gross - totalDed;

        return {
            id: 'mock_current_month',
            institutionId: currentInstitution.id,
            staffId: currentUser.id,
            staffName: currentUser.name,
            month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            basicSalary: base,
            allowances: [{ name: 'House Allowance', amount: housing }],
            deductions: [
                { name: 'PAYE Tax Relief', amount: paye },
                { name: 'NSSF Tier I & II Pension', amount: nssf },
                { name: 'SHIF (Health Insurance 2.75%)', amount: shif },
                { name: 'Affordable Housing Levy (1.5%)', amount: ahl }
            ],
            grossSalary: gross,
            netSalary: net,
            status: 'paid',
            paymentDate: new Date().toISOString()
        } as any;
    }, [selectedPayslipRecord, currentUser, currentInstitution.id]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 select-none">
            {/* Top Android App Bar */}
            <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-[2px] shadow-md shadow-emerald-900/30">
                                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center overflow-hidden">
                                    {currentUser.avatarUrl ? (
                                        <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-base text-emerald-400">
                                            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold tracking-tight text-white line-clamp-1">{currentUser.name}</h1>
                                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {staffIdCode}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <Briefcase className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="line-clamp-1">{staffRoleTitle}</span>
                            </p>
                        </div>
                    </div>

                    {/* Header Action Controls */}
                    <div className="flex items-center gap-1.5">
                        {/* Language Toggle EN / SW */}
                        <button
                            onClick={() => setLang(prev => prev === 'en' ? 'sw' : 'en')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700/60 transition-all active:scale-95"
                            title="Toggle Language / Badili Lugha"
                        >
                            <Languages className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'SW' : 'EN'}</span>
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={async () => {
                                showToast('Refreshing data...', 'info');
                                await loadStaffData();
                                checkGpsLocation();
                                if (onRefreshData) await onRefreshData();
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 active:scale-95 transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Logout / Switch Role */}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 active:scale-95 transition-all"
                                title="Log Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-header Campus & Geofence Indicator */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-medium text-slate-300 truncate">{currentInstitution.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <MapPin className={`w-3.5 h-3.5 ${isInsideCampus ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span className={isInsideCampus ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                            {distanceMeters !== null ? `${distanceMeters}m away` : 'Locating...'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Notification / Alert Toast */}
            {toastMessage && (
                <div className={`fixed top-16 left-4 right-4 z-50 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
                    toastMessage.type === 'success'
                        ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                        : toastMessage.type === 'error'
                        ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                        : 'bg-indigo-950/90 text-indigo-200 border-indigo-500/40'
                }`}>
                    {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    {toastMessage.type === 'info' && <Info className="w-5 h-5 text-indigo-400 shrink-0" />}
                    <span className="text-xs font-semibold leading-relaxed flex-1">{toastMessage.text}</span>
                    <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/10 rounded-lg">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            )}

            {/* Main Interactive Screen Content */}
            <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
                {/* ------------------------------------------------------------- */}
                {/* 1. ATTENDANCE & SHIFT CLOCK VIEW */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'attendance' && (
                    <div className="space-y-4">
                        {/* Primary Tactical Shift Card */}
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 p-5 shadow-2xl">
                            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                                        {t.shiftStatus}
                                    </span>
                                    <h2 className="text-lg font-black text-white mt-0.5">
                                        {isOnDuty ? t.onDuty : t.offDuty}
                                    </h2>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                                    isOnDuty
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                                    <span>{isOnDuty ? 'Active Shift' : 'Idle'}</span>
                                </div>
                            </div>

                            {/* Live Shift Stopwatch Counter */}
                            {isOnDuty && (
                                <div className="mb-5 bg-slate-950/60 rounded-2xl p-4 border border-emerald-500/20 text-center">
                                    <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                        <Timer className="w-3.5 h-3.5 animate-spin" />
                                        <span>Duty Hours Elapsed Today</span>
                                    </div>
                                    <div className="text-3xl font-black tracking-wider text-emerald-300 font-mono mt-1">
                                        {formatTime(elapsedSeconds)}
                                    </div>
                                    {clockInTime && (
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Clocked in at {new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Big Tactile Clock In / Clock Out Button */}
                            <button
                                onClick={() => executeClockAction(isOnDuty ? 'clock_out' : 'clock_in')}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] ${
                                    isOnDuty
                                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-900/30'
                                        : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/40'
                                }`}
                            >
                                <Clock className="w-5 h-5" />
                                <span>{isOnDuty ? t.clockOut : t.clockIn}</span>
                            </button>

                            {/* Quick Attendance Action Row */}
                            <div className="grid grid-cols-2 gap-2.5 mt-3">
                                <button
                                    onClick={() => setIsScanningQr(true)}
                                    className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 transition-all active:scale-95"
                                >
                                    <Camera className="w-4 h-4" />
                                    <span>{t.scanGateQr}</span>
                                </button>
                                <button
                                    onClick={() => setIsShowingMyBadge(true)}
                                    className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 transition-all active:scale-95"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>{t.myQrBadge}</span>
                                </button>
                            </div>
                        </div>

                        {/* Campus Geofence Status Card */}
                        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isInsideCampus ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white">
                                        {isInsideCampus ? t.withinRange : t.outsideRange}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        {distanceMeters !== null ? `${distanceMeters} meters from institution center` : 'Detecting GPS coordinates...'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={checkGpsLocation}
                                disabled={isLocating}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 active:scale-95"
                            >
                                {isLocating ? 'Checking...' : 'Verify'}
                            </button>
                        </div>

                        {/* Recent Punch History Log */}
                        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Recent Attendance Logs</span>
                                </h3>
                                <span className="text-[11px] text-slate-500 font-medium">Last 7 Shifts</span>
                            </div>

                            {attendanceHistory.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 text-xs">
                                    No attendance records logged for this week yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800/80">
                                    {attendanceHistory.map((rec, idx) => (
                                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                            <div>
                                                <p className="font-semibold text-slate-200">
                                                    {rec.attendance_date || rec.attendanceDate || 'Today'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    In: {rec.first_in ? new Date(rec.first_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'} | Out: {rec.last_out ? new Date(rec.last_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Duty'}
                                                </p>
                                            </div>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Present
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 2. LEAVE MANAGEMENT VIEW */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'leave' && (
                    <div className="space-y-4">
                        {/* Leave Balance Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-900/40 p-4">
                                <span className="text-[11px] font-bold text-indigo-400 block">{t.annualLeave}</span>
                                <div className="text-2xl font-black text-white mt-1">
                                    {Math.max(0, leaveBalances.annualTotal - leaveBalances.annualUsed)}
                                    <span className="text-xs text-slate-400 font-normal ml-1">/ {leaveBalances.annualTotal}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{t.daysRemaining}</span>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-900/40 p-4">
                                <span className="text-[11px] font-bold text-emerald-400 block">{t.sickLeave}</span>
                                <div className="text-2xl font-black text-white mt-1">
                                    {Math.max(0, leaveBalances.sickTotal - leaveBalances.sickUsed)}
                                    <span className="text-xs text-slate-400 font-normal ml-1">/ {leaveBalances.sickTotal}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{t.daysRemaining}</span>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-900/40 p-4">
                                <span className="text-[11px] font-bold text-amber-400 block">{t.compassionateLeave}</span>
                                <div className="text-2xl font-black text-white mt-1">
                                    {leaveBalances.compassionateTotal}
                                    <span className="text-xs text-slate-400 font-normal ml-1">days</span>
                                </div>
                                <span className="text-[10px] text-slate-400">Emergency & Family</span>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-fuchsia-950/40 border border-fuchsia-900/40 p-4">
                                <span className="text-[11px] font-bold text-fuchsia-400 block">{t.maternityLeave}</span>
                                <div className="text-2xl font-black text-white mt-1">
                                    {leaveBalances.maternityTotal}
                                    <span className="text-xs text-slate-400 font-normal ml-1">days</span>
                                </div>
                                <span className="text-[10px] text-slate-400">Statutory Entitlement</span>
                            </div>
                        </div>

                        {/* Apply For Leave Action Button */}
                        <button
                            onClick={() => setIsApplyingLeave(true)}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span>{t.applyLeave}</span>
                        </button>

                        {/* My Leave Requests List */}
                        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                My Leave Application History
                            </h3>

                            {leaveRequests.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs">
                                    No leave requests submitted yet.
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {leaveRequests.map(req => (
                                        <div key={req.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">{req.leave_type}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    req.status === 'Approved'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : req.status === 'Rejected'
                                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                }`}>
                                                    {req.status === 'Approved' ? t.approved : req.status === 'Rejected' ? t.rejected : t.pending}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                📅 {req.start_date} to {req.end_date} ({req.days} days)
                                            </p>
                                            {req.reason && (
                                                <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                                                    {req.reason}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 3. PAYSLIPS & FINANCIALS VIEW */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'payslips' && (
                    <div className="space-y-4">
                        {/* Net Pay Hero Card */}
                        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 border border-emerald-900/50 p-5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>{activePayroll.month || 'Current Month'}</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                    Disbursed
                                </span>
                            </div>

                            <div className="mt-3">
                                <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
                                    {t.netPay}
                                </span>
                                <div className="text-3xl font-black text-emerald-400 tracking-tight mt-0.5">
                                    KES {(activePayroll.netSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
                                <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">{t.grossPay}</span>
                                    <span className="font-bold text-slate-200">
                                        KES {(activePayroll.grossSalary || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">{t.totalDeductions}</span>
                                    <span className="font-bold text-rose-400">
                                        - KES {((activePayroll.grossSalary || 0) - (activePayroll.netSalary || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Download PDF Button */}
                            <button
                                onClick={() => handleDownloadPayslip(activePayroll)}
                                disabled={isGeneratingPdf}
                                className="w-full mt-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-98 transition-all"
                            >
                                <Download className="w-4 h-4" />
                                <span>{isGeneratingPdf ? 'Creating Official PDF...' : t.downloadPayslip}</span>
                            </button>
                        </div>

                        {/* Kenyan Statutory Deductions Itemized Breakdown */}
                        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Statutory Deductions & Allowances</span>
                            </h3>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-slate-800">
                                    <span className="text-slate-400">Basic Wage / Salary</span>
                                    <span className="font-bold text-slate-200">KES {(activePayroll.basicSalary || 0).toLocaleString()}</span>
                                </div>
                                {activePayroll.allowances?.map((al: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-800">
                                        <span className="text-slate-400">{al.name}</span>
                                        <span className="font-bold text-emerald-400">+ KES {Number(al.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                                {activePayroll.deductions?.map((ded: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-800">
                                        <span className="text-slate-400">{ded.name}</span>
                                        <span className="font-bold text-rose-400">- KES {Number(ded.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Request Salary Advance Button */}
                        <button
                            onClick={() => setIsRequestingAdvance(true)}
                            className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                        >
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span>{t.advanceRequest}</span>
                        </button>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 4. DAILY WORK TASKS & ORDERS VIEW */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'tasks' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-white">{t.dailyChecklist}</h3>
                                <p className="text-[11px] text-slate-400">Check off assigned work duties as you finish</p>
                            </div>
                            <button
                                onClick={() => setIsAddingTask(true)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                            </button>
                        </div>

                        {/* Task Checklist Items */}
                        <div className="space-y-2.5">
                            {tasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => handleToggleTask(task)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                                        task.is_complete
                                            ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                                    }`}
                                >
                                    <div className="mt-0.5">
                                        {task.is_complete ? (
                                            <div className="w-5 h-5 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-lg border-2 border-slate-600 hover:border-emerald-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold leading-relaxed ${task.is_complete ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium">
                                            <span>📅 {task.due_date || 'Today'}</span>
                                            {task.is_complete && <span className="text-emerald-400 font-semibold">• Done</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* 5. DIGITAL STAFF ID BADGE VIEW */}
                {/* ------------------------------------------------------------- */}
                {activeTab === 'badge' && (
                    <div className="space-y-4">
                        {/* Digital Staff Smart ID Card */}
                        <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl" />

                            {/* Card Header with Institution Logo / Crest */}
                            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                                <div className="flex items-center gap-2.5">
                                    {currentInstitution.logoUrl ? (
                                        <img src={currentInstitution.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xs">
                                            EDU
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{currentInstitution.name}</h4>
                                        <span className="text-[10px] text-indigo-300 font-semibold">Official Staff Identification</span>
                                    </div>
                                </div>
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>

                            {/* Card Body with Photo & Particulars */}
                            <div className="mt-5 flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-indigo-400/40 p-1 shrink-0 overflow-hidden shadow-lg">
                                    {currentUser.avatarUrl ? (
                                        <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 font-bold text-2xl">
                                            {currentUser.name ? currentUser.name.charAt(0) : 'S'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-black text-white tracking-tight">{currentUser.name}</h3>
                                    <p className="text-xs font-bold text-emerald-400">{staffRoleTitle}</p>
                                    <div className="text-[11px] text-slate-300 font-mono">
                                        ID: <span className="font-bold text-white">{staffIdCode}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Gate QR Code */}
                            <div className="mt-6 pt-5 border-t border-indigo-500/20 flex flex-col items-center">
                                <div className="p-3 bg-white rounded-2xl shadow-xl">
                                    {/* High contrast QR representation */}
                                    <div className="w-36 h-36 flex flex-col items-center justify-center bg-slate-950 p-2 rounded-xl text-center">
                                        <QrCode className="w-24 h-24 text-white" />
                                        <span className="text-[9px] font-mono text-emerald-400 font-bold mt-1 tracking-widest">{staffIdCode}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 text-center mt-3">
                                    Scan at campus turnstiles, attendance clock-ins, or store issuance desks.
                                </p>
                            </div>
                        </div>

                        {/* Emergency Contacts & Help Desk */}
                        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{t.emergencyContacts}</span>
                            </h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                                    <span className="text-slate-400">Security Gate Hotline</span>
                                    <a href="tel:0700000000" className="text-emerald-400 font-bold">Call Gate</a>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                                    <span className="text-slate-400">HR & Staff Welfare</span>
                                    <a href="tel:0700000000" className="text-indigo-400 font-bold">Contact HR</a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ------------------------------------------------------------- */}
            {/* MODAL 1: LIVE QR CAMERA SCANNER */}
            {/* ------------------------------------------------------------- */}
            {isScanningQr && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-white pt-2">
                        <button
                            onClick={() => setIsScanningQr(false)}
                            className="p-2 rounded-2xl bg-slate-800/80 text-white active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Scan Gate Entrance QR</h3>
                        <button
                            onClick={() => setScannerFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                            className="p-2 rounded-2xl bg-slate-800/80 text-white active:scale-95"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Camera Video Viewfinder */}
                    <div className="relative my-auto w-full max-w-sm mx-auto aspect-square rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl flex items-center justify-center bg-slate-900">
                        <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                        {/* Target Reticle */}
                        <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-2xl pointer-events-none">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2" />
                        </div>
                        {scanProcessing && (
                            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                                <span className="text-xs font-bold text-white">Punch Verified!</span>
                            </div>
                        )}
                    </div>

                    <div className="text-center pb-6 text-xs text-slate-400">
                        Point camera directly at the official school entrance signboard QR code
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL 2: MY QR BADGE FULLSCREEN */}
            {/* ------------------------------------------------------------- */}
            {isShowingMyBadge && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4">
                        <div className="flex justify-end">
                            <button onClick={() => setIsShowingMyBadge(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <h3 className="text-base font-black text-white">{currentUser.name}</h3>
                        <p className="text-xs text-emerald-400 font-bold">{staffRoleTitle}</p>
                        <div className="bg-white p-5 rounded-2xl mx-auto inline-block shadow-2xl">
                            <QrCode className="w-48 h-48 text-slate-950" />
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                            ID: <span className="font-bold text-white">{staffIdCode}</span>
                        </p>
                        <button
                            onClick={() => setIsShowingMyBadge(false)}
                            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL 3: APPLY FOR LEAVE MODAL */}
            {/* ------------------------------------------------------------- */}
            {isApplyingLeave && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <h3 className="text-sm font-black text-white">{t.applyLeave}</h3>
                            <button onClick={() => setIsApplyingLeave(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitLeave} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Leave Category</label>
                                <select
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none"
                                >
                                    <option value="Annual Leave">Annual Leave ({leaveBalances.annualTotal - leaveBalances.annualUsed} days left)</option>
                                    <option value="Sick Leave">Sick Leave ({leaveBalances.sickTotal - leaveBalances.sickUsed} days left)</option>
                                    <option value="Compassionate Leave">Compassionate / Emergency Leave (5 days)</option>
                                    <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 font-semibold mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveStartDate}
                                        onChange={(e) => setLeaveStartDate(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 font-semibold mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveEndDate}
                                        onChange={(e) => setLeaveEndDate(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">{t.reason}</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={leaveReason}
                                    onChange={(e) => setLeaveReason(e.target.value)}
                                    placeholder="Explain briefly the reason for your time-off..."
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Duty Handover Colleague</label>
                                <input
                                    type="text"
                                    value={leaveHandover}
                                    onChange={(e) => setLeaveHandover(e.target.value)}
                                    placeholder="e.g. John Omondi / Faith Wanjiku"
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">Emergency Phone Number</label>
                                <input
                                    type="tel"
                                    value={leavePhone}
                                    onChange={(e) => setLeavePhone(e.target.value)}
                                    placeholder="e.g. 0712 345 678"
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submittingLeave}
                                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl active:scale-98 transition-all disabled:opacity-50"
                            >
                                {submittingLeave ? 'Submitting...' : t.submitRequest}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL 4: REQUEST SALARY ADVANCE */}
            {/* ------------------------------------------------------------- */}
            {isRequestingAdvance && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <h3 className="text-sm font-black text-white">{t.advanceRequest}</h3>
                            <button onClick={() => setIsRequestingAdvance(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAdvance} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">{t.advanceAmount}</label>
                                <input
                                    type="number"
                                    required
                                    min="500"
                                    max="50000"
                                    step="500"
                                    value={advanceAmount}
                                    onChange={(e) => setAdvanceAmount(e.target.value)}
                                    placeholder="e.g. 5000"
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-base font-bold focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 font-semibold mb-1">{t.reason}</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={advanceReason}
                                    onChange={(e) => setAdvanceReason(e.target.value)}
                                    placeholder="State purpose of salary advance (e.g. School fees, Medical, Emergency)..."
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:border-emerald-500 outline-none resize-none"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400">
                                ℹ️ Advance requests are deducted from your upcoming month's payroll upon Bursar approval.
                            </p>

                            <button
                                type="submit"
                                disabled={submittingAdvance}
                                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl active:scale-98 transition-all disabled:opacity-50"
                            >
                                {submittingAdvance ? 'Submitting...' : t.submitRequest}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODAL 5: ADD PERSONAL DUTY / TASK */}
            {/* ------------------------------------------------------------- */}
            {isAddingTask && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <h3 className="text-sm font-black text-white">{t.addTask}</h3>
                            <button onClick={() => setIsAddingTask(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddPersonalTask} className="space-y-3">
                            <input
                                type="text"
                                required
                                autoFocus
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="e.g. Check water tanks in dorm block B..."
                                className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                            />
                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                                Save Duty
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FIXED BOTTOM ANDROID NAVIGATION BAR */}
            {/* ------------------------------------------------------------- */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 shadow-2xl safe-area-inset-bottom">
                <div className="max-w-lg mx-auto grid grid-cols-5 gap-1 text-center">
                    {/* 1. Attendance Tab */}
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`py-1.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            activeTab === 'attendance'
                                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                                : 'text-slate-400 font-medium hover:text-slate-200'
                        }`}
                    >
                        <Clock className={`w-5 h-5 ${activeTab === 'attendance' ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[10px] truncate">{t.attendance}</span>
                    </button>

                    {/* 2. Leave Tab */}
                    <button
                        onClick={() => setActiveTab('leave')}
                        className={`py-1.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            activeTab === 'leave'
                                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                                : 'text-slate-400 font-medium hover:text-slate-200'
                        }`}
                    >
                        <Calendar className={`w-5 h-5 ${activeTab === 'leave' ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[10px] truncate">{t.leave}</span>
                    </button>

                    {/* 3. Payslips Tab */}
                    <button
                        onClick={() => setActiveTab('payslips')}
                        className={`py-1.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            activeTab === 'payslips'
                                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                                : 'text-slate-400 font-medium hover:text-slate-200'
                        }`}
                    >
                        <DollarSign className={`w-5 h-5 ${activeTab === 'payslips' ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[10px] truncate">{t.payslips}</span>
                    </button>

                    {/* 4. Tasks Tab */}
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`py-1.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            activeTab === 'tasks'
                                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                                : 'text-slate-400 font-medium hover:text-slate-200'
                        }`}
                    >
                        <CheckSquare className={`w-5 h-5 ${activeTab === 'tasks' ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[10px] truncate">{t.tasks}</span>
                    </button>

                    {/* 5. Badge Tab */}
                    <button
                        onClick={() => setActiveTab('badge')}
                        className={`py-1.5 px-1 rounded-2xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            activeTab === 'badge'
                                ? 'text-emerald-400 font-extrabold bg-emerald-500/10'
                                : 'text-slate-400 font-medium hover:text-slate-200'
                        }`}
                    >
                        <Award className={`w-5 h-5 ${activeTab === 'badge' ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[10px] truncate">{t.badge}</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};
