

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LoginView } from './LoginView';
import { AdminView } from './AdminView';
import { SuperAdminView } from './SuperAdminView';
import { LecturerView } from './LecturerView';
import { StudentView } from './StudentView';
import { Header } from './Header';
import { ChatBot } from './ChatBot';
import { MandatoryUpdateView } from './MandatoryUpdateView';
import { SuspendedAccountView } from './SuspendedAccountView';
import { PublicAppointmentView } from './PublicAppointmentView';
import { GuestFeedbackView } from './GuestFeedbackView';
import { ProfileModal } from './ProfileModal';
import { SecurityView, StoreView, InfoDeskView, SupplierView } from './SupportStaffViews';
import { LibrarianView } from './LibrarianView';
import { AcademicsOfficerView } from './AcademicsOfficerView';
import { apiService, initSupabaseClient } from '../services/apiService';
import { generateAlphanumericCode } from '../utils/stringUtils';
import { generateUserId, generateId } from '../utils/idGenerator';
import { generateFullSqlScript } from '../utils/sqlGenerator';
import { detectTimetableConflicts } from '../utils/conflictUtils';
import {
    INITIAL_USERS, INITIAL_INSTITUTIONS, INITIAL_COMPANY_DETAILS,
    INITIAL_ACADEMIC_LEVELS, INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS,
    INITIAL_ACADEMIC_YEARS, INITIAL_SEMESTERS
} from '../constants';
import type {
    User, Role, Institution, AllocationRequest, TimetableEntry,
    Priority, RequestStatus, CompanyDetails, Room, Subject, Course,
    Department, AcademicYear, Semester, UserTask, ActivityLog,
    MpesaTransaction, Receipt, Invoice, VoteHead, FeeStructure, FinancialPeriod,
    ProfileUpdateData, PasswordUpdateData, Appointment, GuestFeedback, Visitor, SecurityAlert, FeedbackSubmission, AcademicLevel, LetterheadConfig, Building, StudentAttendance, Assessment, AssessmentMark, TimeOffRequest, StudentAbsenceRequest, EnrollmentRequest, AbsenceRequest, LecturerContract, ExamTimetableEntry, TaAssignment, Assignment, Submission, LessonRating, Book, LibraryTransaction, Supplier, Internship, StudentAbsenceRequestStatus,
    ExtensionRequest, Requisition, TransactionStatus, InventoryItem, StockTransaction,
    AllocationRequestPreferences, InvoiceItem, InstitutionRegistrationData, Conflict
} from '../types';
import { ClockIcon, XIcon, ShieldExclamationIcon, ArrowRightOnRectangleIcon, ArrowPathIcon, ExclamationTriangleIcon, SparklesIcon, CheckCircleIcon, CommandLineIcon, DocumentArrowDownIcon, BuildingOfficeIcon } from './icons/index';

const SystemPulseLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-2xl animate-pulse">
                    <SparklesIcon className="w-8 h-8" />
                </div>
            </div>
        </div>
        <div className="mt-10 text-center">
            <h2 className="text-white font-black uppercase tracking-[0.3em] text-sm">EduAi Academic</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-3 animate-pulse">{message}</p>
        </div>
    </div>
);

const PerspectiveReturnButton: React.FC<{ role: Role | null; onReturn: () => void }> = ({ role, onReturn }) => {
    if (!role) return null;
    return (
        <div className="fixed bottom-24 left-6 z-[200] animate-fade-in-up no-print">
            <button
                onClick={onReturn}
                className="flex items-center gap-3 pl-2 pr-6 py-2 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform border-2 border-indigo-500 group"
            >
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-indigo-500 transition-colors">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-80 text-indigo-200">Viewing as</p>
                    <p className="text-xs font-black uppercase tracking-tight text-white">{role.replace('_', ' ')}</p>
                </div>
            </button>
        </div>
    );
};

const SchemaInitializationView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isRepairing, setIsRepairing] = useState(false);
    const sqlScript = useMemo(() => generateFullSqlScript(), []);

    const handleAutoRepair = async () => {
        if (!window.confirm("Initialize registry tables? Proceed?")) return;
        setIsRepairing(true);
        try {
            const result = await apiService.runMigration(sqlScript);
            if (result.success) onComplete();
            else alert("Auto-setup failed. Please run the SQL manually in Supabase editor.");
        } catch (e: any) { alert("An error occurred during registry initialization."); }
        finally { setIsRepairing(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border text-center">
                <CommandLineIcon className="w-16 h-16 mx-auto text-indigo-600 mb-6" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">Database Initialisation</h2>
                <p className="text-slate-500 mt-2 mb-8">Registry connection active. Cloud tables need to be created.</p>
                <button onClick={handleAutoRepair} disabled={isRepairing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50">
                    {isRepairing ? 'Initializing...' : 'Run Registry Setup'}
                </button>
            </div>
        </div>
    );
};

export const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => apiService.getSession());
    const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(INITIAL_COMPANY_DETAILS);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [requests, setRequests] = useState<AllocationRequest[]>([]);
    const [generatedTimetable, setGeneratedTimetable] = useState<TimetableEntry[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
    const [userTasks, setUserTasks] = useState<UserTask[]>([]);
    const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isApiOnline, setIsApiOnline] = useState(false);
    const [isSchemaInitializationRequired, setIsSchemaInitializationRequired] = useState(false);
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const [appInitializing, setAppInitializing] = useState(true);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
    const [voteHeads, setVoteHeads] = useState<VoteHead[]>([]);
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [examTimetable, setExamTimetable] = useState<ExamTimetableEntry[]>([]);
    const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>([]);
    const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
    const [studentAbsenceRequests, setStudentAbsenceRequests] = useState<StudentAbsenceRequest[]>([]);
    const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
    const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
    const [contracts, setContracts] = useState<LecturerContract[]>([]);
    const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
    const [studentCheckIns, setStudentCheckIns] = useState<Record<string, string>>({});
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [assessmentMarks, setAssessmentMarks] = useState<AssessmentMark[]>([]);
    const [taAssignments, setTaAssignments] = useState<TaAssignment[]>([]);
    const [lessonRatings, setLessonRatings] = useState<LessonRating[]>([]);

    // Support Staff Specific State
    const [books, setBooks] = useState<Book[]>([]);
    const [libraryTransactions, setLibraryTransactions] = useState<LibraryTransaction[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);

    const [isGeneratingDemoData, setIsGeneratingDemoData] = useState(false);
    const [demoDataGenerationProgress, setDemoDataGenerationProgress] = useState(0);
    const [demoDataGenerationMessage, setDemoDataGenerationMessage] = useState("");

    const [showGuestPortal, setShowGuestPortal] = useState(false);
    const [showGuestFeedback, setShowGuestFeedback] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const initialLoadDone = useRef(false);

    const onStudentLessonCheckIn = useCallback(async (timetableEntryId: string) => {
        if (!currentUser) return;
        const now = new Date().toISOString();
        const checkInKey = `${currentUser.id}-${timetableEntryId}`;

        try {
            const attendanceRecord: Omit<StudentAttendance, 'id'> = {
                timetableEntryId,
                studentId: currentUser.id,
                date: now.split('T')[0],
                status: 'present',
                markedBy: currentUser.id,
                timestamp: now
            };

            await apiService.saveModuleRecord('student_attendances', attendanceRecord);

            setStudentCheckIns(prev => ({
                ...prev,
                [checkInKey]: now
            }));

            const newAttendance: StudentAttendance = { ...attendanceRecord, id: `att_${Date.now()}`, timestamp: now };
            setStudentAttendances(prev => [...prev, newAttendance]);
        } catch (error) {
            console.error("Check-in error:", error);
        }
    }, [currentUser]);

    const getLecturerById = useCallback((id: string) => (Array.isArray(users) ? users : []).find(u => u && u.id === id), [users]);
    const getSubjectById = useCallback((id: string) => (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === id), [subjects]);
    const getRoomById = useCallback((id: string) => (Array.isArray(rooms) ? rooms : []).find(r => r && r.id === id), [rooms]);

    const activeInstitution = useMemo(() => {
        if (!currentUser || !Array.isArray(institutions)) return null;
        return institutions.find(i => i && i.id === currentUser.institutionId) || null;
    }, [currentUser, institutions]);

    const activeAcademicYear = useMemo(() =>
        (Array.isArray(academicYears) ? academicYears : []).find(y => y && y.status === 'active') || null
        , [academicYears]);

    const activeSemester = useMemo(() =>
        (Array.isArray(semesters) ? semesters : []).find(s => s && s.status === 'active') || null
        , [semesters]);

    const timetableSettings = useMemo(() => activeInstitution?.timetableSettings || INITIAL_TIMETABLE_SETTINGS, [activeInstitution]);

    const allocations = useMemo(() => (Array.isArray(requests) ? requests : []).filter(r => r && (r.status === 'approved' || r.status === 'change_request_pending' || r.status === 'deallocation_pending')), [requests]);

    const timetableConflicts = useMemo(() => detectTimetableConflicts(generatedTimetable, rooms), [generatedTimetable, rooms]);

    const courseSizes = useMemo(() => {
        const sizes = new Map<string, number>();
        (courses || []).forEach(course => {
            (course.levels || []).forEach(level => {
                const count = (users || []).filter(u => u && u.role === 'student' && u.courseId === course.id && u.courseLevelId === level.id).length;
                sizes.set(level.id, count);
            });
        });
        return sizes;
    }, [courses, users]);

    const activeLetterheadConfig = useMemo(() => activeInstitution?.letterheadConfig || companyDetails.letterheadConfig, [activeInstitution, companyDetails]);
    const activeFooterImageUrl = useMemo(() => activeInstitution?.footerImageUrl || companyDetails.footerImageUrl || null, [activeInstitution, companyDetails]);
    const activeLogoUrl = useMemo(() => activeInstitution?.logoUrl || companyDetails.logoUrl, [activeInstitution, companyDetails]);

    const loadData = useCallback(async (isFirstLoad = false) => {
        if (isFirstLoad) setAppInitializing(true);

        try {
            if (!apiService.isConfigured()) initSupabaseClient();
            setIsBootstrapped(true);

            const health = await apiService.testDatabaseConnection();
            if (health.status === 'setup_required') {
                setIsSchemaInitializationRequired(true);
                setIsApiOnline(true);
                setAppInitializing(false);
                return;
            }

            setIsApiOnline(health.status !== 'offline');
            setIsSchemaInitializationRequired(false);

            const instId = currentUser && currentUser.role !== 'super_admin' ? currentUser.institutionId : undefined;

            const [insts, sett, u, d, s, c, a, ay, sem, r, b, al, tasks, txns, recs, logs] = await Promise.all([
                apiService.fetchInstitutions(instId).catch(() => []),
                apiService.fetchCompanySettings().catch(() => null),
                apiService.fetchUsers(instId).catch(() => []),
                apiService.fetchDepartments(instId).catch(() => []),
                apiService.fetchSubjects(instId).catch(() => []),
                apiService.fetchCourses(instId).catch(() => []),
                apiService.fetchAllocations(instId).catch(() => []),
                apiService.fetchAcademicYears(instId).catch(() => []),
                apiService.fetchSemesters(instId).catch(() => []),
                apiService.fetchRooms(instId).catch(() => []),
                apiService.fetchModuleRecords<Building>('buildings', instId).catch(() => []),
                apiService.fetchAcademicLevels(instId).catch(() => []),
                apiService.fetchModuleRecords<UserTask>('tasks', instId).catch(() => []),
                apiService.fetchTransactions(instId).catch(() => []),
                apiService.fetchModuleRecords<Receipt>('receipts', instId).catch(() => []),
                apiService.fetchModuleRecords<ActivityLog>('activity_log', instId).catch(() => []),
            ]);

            if (insts && insts.length > 0) setInstitutions(insts);
            if (sett) setCompanyDetails(sett);

            let finalUsers = u || [];
            const systemSuperAdmin = INITIAL_USERS.find(iu => iu.role === 'super_admin');
            if (systemSuperAdmin && !finalUsers.some(existing => existing.email === systemSuperAdmin.email)) {
                finalUsers = [...finalUsers, systemSuperAdmin];
            }
            setUsers(finalUsers);

            setDepartments(d || []);
            setSubjects(s || []);
            setCourses(c || []);
            setRequests(a || []);
            setAcademicYears(ay || []);
            setSemesters(sem || []);
            setRooms(r || []);
            setBuildings(b || []);
            setAcademicLevels(al || []);
            setUserTasks(tasks || []);
            setTransactions(txns || []);
            setReceipts(recs || []);
            setActivityLog(logs || []);

            const [inv, ext, vh, fs, fp, fb, sar, enr, abs, con, att, item, tt, et, asg, subm, rat, ta, asmt, asmtMarks, bks, ltx, apts, sups, stx] = await Promise.all([
                apiService.fetchInvoices(instId).catch(() => []),
                apiService.fetchExtensionRequests(instId).catch(() => []),
                apiService.fetchVoteHeads(instId).catch(() => []),
                apiService.fetchFeeStructures(instId).catch(() => []),
                apiService.fetchFinancialPeriods(instId).catch(() => []),
                apiService.fetchModuleRecords<FeedbackSubmission>('feedback_submissions', instId).catch(() => []),
                apiService.fetchModuleRecords<StudentAbsenceRequest>('student_absence_requests', instId).catch(() => []),
                apiService.fetchModuleRecords<EnrollmentRequest>('enrollment_requests', instId).catch(() => []),
                apiService.fetchAbsenceRequests(instId).catch(() => []),
                apiService.fetchModuleRecords<LecturerContract>('contracts', instId).catch(() => []),
                apiService.fetchModuleRecords<StudentAttendance>('student_attendances', instId).catch(() => []),
                apiService.fetchModuleRecords<InventoryItem>('inventory', instId).catch(() => []),
                apiService.fetchTimetable(instId || '').catch(() => []),
                apiService.fetchExamTimetable(instId || '').catch(() => []),
                apiService.fetchModuleRecords<Assignment>('assignments', instId).catch(() => []),
                apiService.fetchModuleRecords<Submission>('submissions', instId).catch(() => []),
                apiService.fetchModuleRecords<LessonRating>('lesson_ratings', instId).catch(() => []),
                apiService.fetchModuleRecords<TaAssignment>('ta_assignments', instId).catch(() => []),
                apiService.fetchModuleRecords<Assessment>('assessments', instId).catch(() => []),
                apiService.fetchModuleRecords<AssessmentMark>('assessment_marks', instId).catch(() => []),
                apiService.fetchModuleRecords<Book>('books', instId).catch(() => []),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', instId).catch(() => []),
                apiService.fetchModuleRecords<Appointment>('appointments', instId).catch(() => []),
                apiService.fetchModuleRecords<Supplier>('suppliers', instId).catch(() => []),
                apiService.fetchModuleRecords<StockTransaction>('stock_transactions', instId).catch(() => []),
            ]);

            setInvoices(inv || []);
            setExtensionRequests(ext || []);
            setVoteHeads(vh || []);
            setFeeStructures(fs || []);
            setFinancialPeriods(fp || []);
            setFeedbackSubmissions(fb || []);
            setStudentAbsenceRequests(sar || []);
            setEnrollmentRequests(enr || []);
            setAbsenceRequests(abs || []);
            setContracts(con || []);
            setStudentAttendances(att || []);
            setInventory(item || []);
            setGeneratedTimetable(tt || []);
            setExamTimetable(et || []);
            setAssignments(asg || []);
            setSubmissions(subm || []);
            setLessonRatings(rat || []);
            setTaAssignments(ta || []);
            setAssessments(asmt || []);
            setAssessmentMarks(asmtMarks || []);
            setBooks(bks || []);
            setLibraryTransactions(ltx || []);
            setAppointments(apts || []);
            setSuppliers(sups || []);
            setStockTransactions(stx || []);

        } catch (error) {
            console.error("Sync Error:", error);
        } finally {
            setAppInitializing(false);
            initialLoadDone.current = true;
        }
    }, [currentUser]);

    useEffect(() => {
        loadData(true);
    }, [loadData]);

    const handleLogout = () => {
        apiService.clearSession();
        setCurrentUser(null);
        setImpersonatedRole(null);
    };

    // --- Infrastructure Handlers ---

    const handleAddDepartment = async (name: string) => {
        const id = `dept_${Date.now()}`;
        await apiService.saveModuleRecord('departments', { id, name, institutionId: currentUser?.institutionId });
        loadData();
    };

    const handleUpdateDepartment = async (id: string, name: string) => {
        await apiService.saveModuleRecord('departments', { id, name });
        loadData();
    };

    const handleDeleteDepartment = async (id: string) => {
        await apiService.deleteModuleRecord('departments', id);
        loadData();
    };

    const handleImportDepartments = async (data: any[]) => {
        const enriched = data.map(d => ({ ...d, institutionId: currentUser?.institutionId }));
        await apiService.onImportDepartments(enriched);
        loadData();
    };

    const handleAddBuilding = async (name: string) => {
        const id = `bldg_${Date.now()}`;
        await apiService.saveModuleRecord('buildings', { id, name, institutionId: currentUser?.institutionId });
        loadData();
        return true;
    };

    const handleUpdateBuilding = async (id: string, data: any) => {
        await apiService.saveModuleRecord('buildings', { id, ...data });
        loadData();
    };

    const handleDeleteBuilding = async (id: string) => {
        await apiService.deleteModuleRecord('buildings', id);
        loadData();
    };

    const handleAddRoom = async (data: any) => {
        const id = `room_${Date.now()}`;
        await apiService.saveModuleRecord('rooms', { id, ...data, institutionId: currentUser?.institutionId });
        loadData();
    };

    const handleUpdateRoom = async (id: string, data: any) => {
        await apiService.saveModuleRecord('rooms', { id, ...data });
        loadData();
    };

    const handleDeleteRoom = async (id: string) => {
        await apiService.deleteModuleRecord('rooms', id);
        loadData();
    };

    const handleImportRooms = async (data: any[]) => {
        const enriched = data.map(r => ({ ...r, institutionId: currentUser?.institutionId }));
        await apiService.onImportRooms(enriched);
        loadData();
    };

    const handleAddAcademicLevel = async (name: string) => {
        const id = `al_${Date.now()}`;
        await apiService.saveModuleRecord('academic_levels', { id, name, institutionId: currentUser?.institutionId });
        loadData();
    };

    const handleUpdateAcademicLevel = async (id: string, name: string) => {
        await apiService.saveModuleRecord('academic_levels', { id, name });
        loadData();
    };

    const handleDeleteAcademicLevel = async (id: string) => {
        await apiService.deleteModuleRecord('academic_levels', id);
        loadData();
    };

    // --- Academic Handlers ---

    const handleUpdateSubject = async (id: string, data: any) => {
        await apiService.saveSubject({ ...data, id });
        loadData();
    };

    const handleDeleteSubject = async (id: string) => {
        await apiService.deleteModuleRecord('subjects', id);
        loadData();
    };

    const handleAddSubject = async (data: any, levelIds?: string[]) => {
        const id = `sub_${Date.now()}`;
        const subject = { ...data, id, institutionId: currentUser?.institutionId };
        await apiService.saveSubject(subject);
        if (levelIds && levelIds.length > 0) {
            for (const lid of levelIds) { await apiService.onAssociateSubjectToCourseLevel(id, lid); }
        }
        loadData();
    };

    const handleAddCourse = async (data: any) => {
        const id = `course_${Date.now()}`;
        const courseData = { ...data, id, institutionId: currentUser?.institutionId, levels: data.levels || [] };
        await apiService.saveModuleRecord('courses', courseData);
        loadData();
    };

    const handleUpdateCourse = async (id: string, data: any) => {
        await apiService.saveModuleRecord('courses', { id, ...data });
        loadData();
    };

    const handleDeleteCourse = async (id: string) => {
        await apiService.deleteModuleRecord('courses', id);
        loadData();
    };

    const handleImportCourses = async (data: any[]) => {
        const enriched = data.map(c => ({ ...c, institutionId: currentUser?.institutionId }));
        await apiService.onImportCourses(enriched);
        loadData();
    };

    // --- User Handlers ---

    const onImportUsers = async (data: any[]) => {
        await apiService.onImportUsers(data, currentUser?.institutionId);
        loadData();
    };

    const onImportStudents = async (data: any[]) => {
        await apiService.onImportStudents(data, currentUser?.institutionId);
        loadData();
    };

    const onDeleteUser = async (id: string) => {
        await apiService.deleteModuleRecord('users', id);
        loadData();
    };

    const onEditUser = async (id: string, data: any) => {
        await apiService.saveModuleRecord('users', { id, ...data });
        loadData();
    };

    const onDeleteInstitution = async (id: string) => {
        await apiService.deleteModuleRecord('institutions', id);
        loadData();
    };

    const onToggleInstitutionStatus = async (id: string) => {
        const inst = institutions.find(i => i.id === id);
        if (inst) {
            await apiService.saveInstitution({ ...inst, status: inst.status === 'suspended' ? 'active' : 'suspended' });
            loadData();
        }
    };

    const onUpdateInstitution = async (id: string, data: any) => {
        const inst = institutions.find(i => i.id === id);
        if (inst) {
            await apiService.saveInstitution({ ...inst, ...data });
            loadData();
        }
    };

    const onLoginAsAdmin = (institutionId: string) => {
        const admin = users.find(u => u.institutionId === institutionId && (u.role === 'admin' || u.role === 'head_teacher'));
        if (admin) {
            setCurrentUser(admin);
            apiService.storeSession(admin);
            setImpersonatedRole(null);
        } else {
            alert("No admin account found for this institution.");
        }
    };

    const handleDirectAssign = useCallback(async (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections?: Record<string, string>) => {
        if (!activeInstitution) return;
        const now = new Date().toISOString();
        const promises = subjectIds.map(subjectId => {
            const req: AllocationRequest = {
                id: `ar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                requesterId: currentUser!.id, // Admin is the requester
                institutionId: activeInstitution.id,
                subjectId,
                lecturerId,
                status: 'approved', // Auto-approved since it's direct assign
                priority,
                justification: justification || 'Direct Assignment by Admin',
                timestamp: now,
                reviewedBy: currentUser!.id,
                reviewedAt: now,
                courseLevelIds: courseLevelSelections?.[subjectId] ? [courseLevelSelections[subjectId]] : []
            };
            return apiService.saveModuleRecord('allocation_requests', req);
        });

        try {
            await Promise.all(promises);
            await loadData(); // Refresh data
            alert("Subjects assigned successfully.");
        } catch (error) {
            console.error("Failed to assign subjects:", error);
            alert("Failed to assign subjects. Please try again.");
        }
    }, [activeInstitution, currentUser, loadData]);

    const onGenerateReceipt = useCallback(async (txn: MpesaTransaction) => {
        const id = `rec_${Date.now()}`;
        const receipt: Receipt = {
            id,
            receiptNumber: `REC-${Date.now()}`,
            institutionId: txn.institutionId,
            paymentDate: new Date().toISOString(),
            amountPaid: txn.amount,
            paidFor: 'Institutional License',
            paymentMethod: 'M-Pesa',
            relatedTransactionId: txn.id
        };
        await apiService.saveModuleRecord('receipts', receipt);
        loadData();
    }, [loadData]);

    // --- Allocation Handlers ---

    const handleAllocationChangeRequest = async (requestId: string, justification: string, newPriority: Priority) => {
        await apiService.updateAllocationStatus(requestId, 'change_request_pending', justification, newPriority);
        loadData();
    };

    const handleDeallocationRequest = async (requestId: string, justification: string) => {
        await apiService.updateAllocationStatus(requestId, 'deallocation_pending', justification);
        loadData();
    };

    const handleLecturerRequest = async (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: AllocationRequestPreferences | undefined, courseLevelSelections: Record<string, string[]>) => {
        if (!currentUser) return false;
        try {
            for (const subjectId of subjectIds) {
                const reqData = { subjectId, lecturerId: currentUser.id, institutionId: currentUser.institutionId, status: 'pending', priority, justification, academicYearId, semesterId, preferences: { ...preferences, courseLevelIds: courseLevelSelections[subjectId] || [] }, signatureUrl, timestamp: new Date().toISOString() };
                await apiService.saveModuleRecord('allocation_requests', reqData);
            }
            loadData();
            return true;
        } catch (e) { return false; }
    };

    if (appInitializing) return <SystemPulseLoader message="Establishing secure cloud registry link..." />;
    if (isSchemaInitializationRequired) return <SchemaInitializationView onComplete={() => loadData(true)} />;

    const commonLoginProps = {
        users, institutions, courses, academicLevels, logoUrl: companyDetails.logoUrl, registrationProgress: null, registrationMessage: "",
        onOpenGuestPortal: () => setShowGuestPortal(true), onOpenGuestFeedback: () => setShowGuestFeedback(true), themeColor: companyDetails.themeColor || "#4f46e5",
        onParentRequestOtp: () => ({ success: true, message: '' }), onParentVerifyOtp: () => ({ success: true, message: '' }), companyDetails: companyDetails,
        onInstitutionRegister: async (data: InstitutionRegistrationData) => {
            try {
                const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const adminId = `u_admin_${Date.now()}`;
                const generatedPassword = Math.random().toString(36).slice(-8);
                const newInstitution: Institution = { id: instId, name: data.institutionName, email: data.institutionEmail, phoneNumber: data.institutionPhone, institutionType: data.institutionType as any, status: 'trial', trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), institutionCode: generateAlphanumericCode(8), useAllocationRequests: true };
                const adminRole: Role = (data.institutionType === 'University' || data.institutionType === 'College') ? 'admin' : 'head_teacher';
                const newAdmin: User = { id: adminId, name: data.adminName, email: data.adminEmail, phoneNumber: data.institutionPhone, role: adminRole, institutionId: instId, password: generatedPassword, expertise: ['Administration'], staffId: 'ADMIN-01' };
                await apiService.saveInstitution(newInstitution);
                await apiService.saveUser(newAdmin);
                if (data.loadDemoData) {
                    const { generateInstitutionalDemoData } = await import('../utils/demoData');
                    const d = generateInstitutionalDemoData(instId, adminId);
                    await Promise.all([
                        ...d.departments.map(x => apiService.saveModuleRecord('departments', x)),
                        ...d.buildings.map(x => apiService.saveModuleRecord('buildings', x)),
                        ...d.rooms.map(x => apiService.saveModuleRecord('rooms', x)),
                        ...d.users.map(x => apiService.saveModuleRecord('users', x)),
                        ...d.subjects.map(x => apiService.saveModuleRecord('subjects', x)),
                        ...d.courses.map(x => apiService.saveModuleRecord('courses', x)),
                    ]);
                }
                await loadData(true);
                return { success: true, message: 'Registration successful.', credentials: { email: newAdmin.email, password: generatedPassword } };
            } catch (e: any) { return { success: false, message: 'Registration failed: ' + e.message }; }
        },
        onStudentRegister: async () => ({ success: true, message: '' })
    };

    const activeRole = impersonatedRole || currentUser?.role;
    const isAdminCatchAll = ['admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy'].includes(activeRole || '');

    if (currentUser && activeRole !== 'super_admin') {
        const inst = institutions.find(i => i.id === currentUser.institutionId);
        if (inst && inst.status === 'suspended') {
            return <SuspendedAccountView user={currentUser} institution={inst} companyDetails={companyDetails} onLogout={handleLogout} onAddTransaction={apiService.onAddTransaction.bind(apiService)} onAddExtensionRequest={async (reason) => {
                await apiService.saveModuleRecord('extension_requests', { institutionId: inst.id, requesterId: currentUser.id, reason, status: 'pending', requestedAt: new Date().toISOString() });
                loadData();
            }} />;
        }
    }

    if (currentUser && (!currentUser.passwordLastUpdated || currentUser.password === 'password123')) {
        return <MandatoryUpdateView user={currentUser} onUpdate={async (pData, passData) => {
            const updated = { ...currentUser, ...pData, password: passData.newPassword, passwordLastUpdated: new Date().toISOString() };
            await apiService.saveUser(updated);
            setCurrentUser(updated);
            apiService.storeSession(updated);
        }} onLogout={handleLogout} logoUrl={activeLogoUrl} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
            {currentUser ? (
                <>
                    <Header currentUser={currentUser} institutionName={activeInstitution?.name} onLogout={handleLogout} onEditProfile={() => setIsProfileModalOpen(true)} logoUrl={activeInstitution?.logoUrl || companyDetails.logoUrl} systemLogoUrl={companyDetails.logoUrl} notifications={[]} onMarkAsRead={() => { }} currentInstitution={activeInstitution} isApiOnline={isApiOnline} applicationTitle={companyDetails.applicationTitle} />
                    <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                        {activeRole === 'super_admin' ? (
                            <SuperAdminView
                                currentUser={currentUser} institutions={institutions} users={users} subjects={subjects} departments={departments} courses={courses} companyDetails={companyDetails} transactions={transactions} receipts={receipts} activityLog={activityLog} onImportUsers={onImportUsers} onImportStudents={onImportStudents} onDeleteUser={onDeleteUser} onEditUser={onEditUser} onUpdateCompanyDetails={async (d) => await apiService.saveCompanySettings(d)} onAddInstitution={async (d) => { await apiService.saveInstitution(d as any); loadData(); }} onUpdateInstitution={onUpdateInstitution} onDeleteInstitution={onDeleteInstitution} onToggleInstitutionStatus={onToggleInstitutionStatus} onLoginAsAdmin={onLoginAsAdmin} allocations={allocations} requests={requests} semesters={semesters} letterheadConfig={activeLetterheadConfig} footerImageUrl={activeFooterImageUrl} onSendSms={async (r, m) => apiService.sendSms(r, m, companyDetails.smsConfig)}
                                rooms={rooms} buildings={buildings} academicLevels={academicLevels} academicYears={academicYears} activeAcademicYear={activeAcademicYear} activeSemester={activeSemester} timetableSettings={timetableSettings} examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS} onTimetableGenerated={async (entries, ay, sem) => apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries)} onExamTimetableGenerated={async (entries, ay, sem) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)} onAddSubject={handleAddSubject} onUpdateSubject={handleUpdateSubject} onDeleteSubject={handleDeleteSubject} onAddCourse={handleAddCourse} onUpdateCourse={handleUpdateCourse} onDeleteCourse={handleDeleteCourse} onImportCourses={handleImportCourses} onAddUser={async (data) => { await apiService.saveUser({ ...data, id: generateUserId(), institutionId: currentUser!.institutionId }); loadData(); }} onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: generateId('ay'), institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }} onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: generateId('sem'), institutionId: currentUser!.institutionId }); loadData(); }} onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment} onDeleteDepartment={handleDeleteDepartment} onImportDepartments={handleImportDepartments} onAddBuilding={handleAddBuilding} onUpdateBuilding={handleUpdateBuilding} onDeleteBuilding={handleDeleteBuilding} onAddRoom={handleAddRoom} onUpdateRoom={handleUpdateRoom} onDeleteRoom={handleDeleteRoom} onImportRooms={handleImportRooms} onAddAcademicLevel={handleAddAcademicLevel} onUpdateAcademicLevel={handleUpdateAcademicLevel} onDeleteAcademicLevel={handleDeleteAcademicLevel} onUpdateRequest={(id: string, data: any) => apiService.saveModuleRecord('allocation_requests', { id, ...data })} onWithdrawRequest={(id: string) => apiService.deleteModuleRecord('allocation_requests', id)}
                                logoUrl={activeLogoUrl}
                                finalTimetableUrl={null}
                                themeColor={companyDetails.themeColor || '#4f46e5'}
                                invoices={invoices}
                                extensionRequests={extensionRequests}
                                voteHeads={voteHeads}
                                feeStructures={feeStructures}
                                financialPeriods={financialPeriods}
                                userTasks={userTasks}
                                generatedTimetable={generatedTimetable}
                                allTimetableEntries={generatedTimetable}
                                timetableConflicts={timetableConflicts}
                                onUpdateLogo={(logo) => onUpdateInstitution(activeInstitution!.id, { logoUrl: logo })}
                                onUpdateFooterImage={(footer) => onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer })}
                                onSaveLetterheadConfig={(config) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config })}
                                onUpdateThemeColor={(color) => onUpdateInstitution(activeInstitution!.id, { themeColor: color })}
                                onUpdateExtensionRequestStatus={(id, s, d) => { }}
                                onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                onAddExtensionRequest={() => { }}
                                timeOffRequests={timeOffRequests}
                                onUpdateTimeOffRequestStatus={() => { }}
                                enrollmentRequests={enrollmentRequests}
                                absenceRequests={absenceRequests}
                                studentAbsenceRequests={studentAbsenceRequests}
                                onUpdateEnrollmentRequest={() => { }}
                                onUpdateAbsenceRequest={() => { }}
                                onUpdateStudentAbsenceRequestStatus={() => { }}
                                isTimetableGenerating={false}
                                timetableGenerationProgress={0}
                                timetableGenerationMessage=""
                                timetableGenerationEta={null}
                                securityAlerts={securityAlerts}
                                visitors={visitors}
                                requisitions={requisitions}
                                studentAttendances={studentAttendances}
                                studentCheckIns={studentCheckIns}
                                lessonRatings={lessonRatings}
                                feedbackSubmissions={feedbackSubmissions}
                                courseSizes={courseSizes}
                                assessments={assessments}
                                assessmentMarks={assessmentMarks}
                                contracts={contracts}
                                isGeneratingDemoData={false}
                                demoDataGenerationProgress={0}
                                demoDataGenerationMessage=""
                                examTimetable={examTimetable}
                                onManualInvoice={(instId: string, items: InvoiceItem[], total: number, due: string) => { }}
                                onUpdateRequestStatus={(id, status) => apiService.updateAllocationStatus(id, status)}
                                onBulkUpdateRequestStatus={async (status: RequestStatus, deptId?: string) => { const targets = requests.filter(r => r.status === 'pending' || r.status === 'hod_approved'); for (const t of targets) await apiService.updateAllocationStatus(t.id, status); loadData(); }}
                                onGenerateReceipt={onGenerateReceipt}
                                getLecturerById={getLecturerById}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                onLogAction={async (a) => apiService.saveModuleRecord('activity_log', { id: `log_${Date.now()}`, userId: currentUser!.id, userName: currentUser!.name, institutionId: activeInstitution?.id || currentUser!.institutionId, action: a, timestamp: new Date().toISOString() })}
                                smsConfig={companyDetails.smsConfig}
                                emailConfig={companyDetails.emailConfig}
                                onImportSubjectsAndAssociate={apiService.onImportSubjectsAndAssociate.bind(apiService)}
                                onSwitchPerspective={(role) => setImpersonatedRole(role)}
                                onAddParent={async (sid: string, p: any) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => ({ success: true, message: 'Parent added.' }))}
                                onDeleteParent={() => { }}
                                assignments={assignments}
                                submissions={submissions}
                                onAddAssignment={async (d) => { await apiService.saveModuleRecord('assignments', { ...d, id: `asg_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                onDeleteAssignment={async (id) => { await apiService.deleteModuleRecord('assignments', id); loadData(); }}
                                onUpdateSubmission={async (id, data) => {
                                    const sub = submissions.find(s => s.id === id);
                                    if (sub) {
                                        await apiService.saveModuleRecord('submissions', { ...sub, ...data, status: 'graded' });
                                        loadData();
                                    }
                                }}
                                onAddAssessment={async (d) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                onDeleteAssessment={async (id) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                onSaveAssessmentMarks={async (id: string, marks: any[]) => {
                                    const promises = marks.map(m => {
                                        const existing = assessmentMarks.find(am => am.assessmentId === id && am.studentId === m.studentId);
                                        const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()}`;

                                        const record: AssessmentMark = {
                                            id: recordId,
                                            assessmentId: id,
                                            studentId: m.studentId,
                                            marks: m.marks,
                                            comments: m.comments,
                                            gradedBy: currentUser.id,
                                            timestamp: new Date().toISOString(),
                                            institutionId: currentUser.institutionId
                                        };
                                        return apiService.saveModuleRecord('assessment_marks', record);
                                    });
                                    await Promise.all(promises);
                                    loadData();
                                }}
                                isImpersonating={!!impersonatedRole}
                            />
                        ) : activeRole === 'student' ? (
                            <StudentView
                                user={currentUser}
                                users={users}
                                courses={courses}
                                subjects={subjects}
                                enrollmentRequests={enrollmentRequests}
                                generatedTimetable={generatedTimetable}
                                examTimetable={examTimetable}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                getLecturerById={getLecturerById}
                                timetableSettings={timetableSettings!}
                                studentCheckIns={studentCheckIns}
                                onStudentLessonCheckIn={onStudentLessonCheckIn}
                                letterheadConfig={activeLetterheadConfig}
                                footerImageUrl={activeFooterImageUrl}
                                logoUrl={activeLogoUrl}
                                buildings={buildings}
                                onAddParent={async (sid: string, p: any) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => ({ success: true, message: 'Parent added.' }))}
                                onDeleteParent={() => { }}
                                departments={departments}
                                onSubmitEnrollmentRequest={async (sids, sig) => { }}
                                assignments={assignments}
                                submissions={submissions}
                                onAddSubmission={async (d) => { await apiService.saveModuleRecord('submissions', { ...d, id: `subm_${Date.now()}`, institutionId: currentUser.institutionId }); }}
                                lessonRatings={lessonRatings}
                                onAddLessonRating={() => { }}
                                onRateLesson={() => { }}
                                onAddFeedback={() => { }}
                                feedbackSubmissions={feedbackSubmissions}
                                studentAbsenceRequests={studentAbsenceRequests}
                                onSubmitStudentAbsenceRequest={() => { }}
                                finalTimetableUrl={null}
                                taAssignments={[]} // Placeholder
                                userTasks={userTasks}
                                onAddTask={() => { }}
                                onUpdateTask={() => { }}
                                onDeleteTask={() => { }}
                                currentInstitution={activeInstitution}
                                assessments={assessments}
                                assessmentMarks={assessmentMarks}
                            />
                        ) : activeRole === 'academics_officer' ? (
                            <AcademicsOfficerView
                                currentUser={currentUser}
                                subjects={subjects}
                                onUpdateSubject={handleUpdateSubject}
                                courses={courses}
                                onUpdateCourse={handleUpdateCourse}
                                users={users}
                                rooms={rooms}
                                onAddRoom={handleAddRoom}
                                onUpdateRoom={handleUpdateRoom}
                                onDeleteRoom={handleDeleteRoom}
                                onImportRooms={handleImportRooms}
                                departments={departments}
                                onAddDepartment={handleAddDepartment}
                                onUpdateDepartment={handleUpdateDepartment}
                                onDeleteDepartment={handleDeleteDepartment}
                                onImportDepartments={handleImportDepartments}
                                activeAcademicYear={activeAcademicYear}
                                activeSemester={activeSemester}
                                onExamTimetableGenerated={async (entries, ay, sem) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)}
                                examTimetable={examTimetable}
                                getSubjectById={getSubjectById}
                                getLecturerById={getLecturerById}
                                getRoomById={getRoomById}
                                courseSizes={courseSizes}
                                academicYears={academicYears}
                                onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: `ay_${Date.now()}`, institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }}
                                onUpdateAcademicYear={async (id, data) => { await apiService.saveModuleRecord('academic_years', { ...data, id }); loadData(); }}
                                onDeleteAcademicYear={async (id) => { await apiService.deleteModuleRecord('academic_years', id); loadData(); }}
                                semesters={semesters}
                                onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: `sem_${Date.now()}`, institutionId: currentUser!.institutionId }); loadData(); }}
                                onUpdateSemester={async (id, data) => { await apiService.saveModuleRecord('semesters', { ...data, id }); loadData(); }}
                                onDeleteSemester={async (id) => { await apiService.deleteModuleRecord('semesters', id); loadData(); }}
                                timetableSettings={timetableSettings}
                                onSaveTimetableSettings={(config) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: config })}
                                buildings={buildings}
                                onAddBuilding={handleAddBuilding}
                                onAddBuildings={async (b) => { }}
                                onUpdateBuilding={handleUpdateBuilding}
                                onDeleteBuilding={handleDeleteBuilding}
                                academicLevels={academicLevels}
                                letterheadConfig={activeLetterheadConfig}
                                logoUrl={activeLogoUrl}
                                footerImageUrl={activeFooterImageUrl}
                                emailConfig={companyDetails.emailConfig}
                                onSaveEmailConfig={() => { }}
                                onSendTestEmail={async (r) => ({ success: true, message: 'Test email sent.' })}
                                currentInstitution={activeInstitution}
                                onUpdateInstitution={onUpdateInstitution}
                                smsConfig={companyDetails.smsConfig}
                                themeColor={companyDetails.themeColor || '#4f46e5'}
                                examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                onSaveExamTimetableSettings={(config) => onUpdateInstitution(activeInstitution!.id, { examTimetableSettings: config })}
                                onTimetableGenerated={async (entries, ay, sem) => apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries as TimetableEntry[])}
                                allocations={allocations}
                                timeOffRequests={timeOffRequests}
                            />
                        ) : activeRole === 'security' ? (
                            <SecurityView
                                user={currentUser}
                                users={users}
                                visitors={visitors}
                                securityAlerts={securityAlerts}
                                appointments={[]} // Appointments not fetched into dedicated state but used in view? 
                                // Actually appointments are used. Adding fetching for them.
                                onAddVisitor={async (v) => { await apiService.saveModuleRecord('visitors', { ...v, id: `vis_${Date.now()}` }); loadData(); }}
                                onCheckoutVisitor={async (id) => { const v = visitors.find(x => x.id === id); if (v) await apiService.saveModuleRecord('visitors', { ...v, timeOut: new Date().toLocaleTimeString() }); loadData(); }}
                                onAddAlert={async (a) => { await apiService.saveModuleRecord('security_alerts', { ...a, id: `alert_${Date.now()}`, institutionId: currentUser.institutionId, createdBy: currentUser.id, createdAt: new Date().toISOString(), status: 'active' }); loadData(); }}
                                onResolveAlert={async (id) => { const a = securityAlerts.find(x => x.id === id); if (a) await apiService.saveModuleRecord('security_alerts', { ...a, status: 'resolved' }); loadData(); }}
                                onUpdateAppointmentStatus={async (id, status) => { /* Placeholder for appointment update */ loadData(); }}
                            />
                        ) : activeRole === 'info_desk' ? (
                            <InfoDeskView
                                user={currentUser}
                                visitors={visitors}
                                generatedTimetable={generatedTimetable}
                                timetableSettings={timetableSettings}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                getLecturerById={getLecturerById}
                            />
                        ) : activeRole === 'store' ? (
                            <StoreView
                                user={currentUser}
                                inventory={inventory}
                                suppliers={suppliers}
                                stockTransactions={stockTransactions}
                                onAddItem={async (item) => { await apiService.saveModuleRecord('inventory', { ...item, id: `inv_${Date.now()}`, institutionId: currentUser.institutionId, lastUpdated: new Date().toISOString() }); loadData(); }}
                                onAddStoreTransaction={async (item, type, qty, party, method, sig) => {
                                    const newQty = type === 'Restock' ? item.quantity + qty : item.quantity - qty;
                                    await apiService.saveModuleRecord('inventory', { ...item, quantity: newQty, lastUpdated: new Date().toISOString() });
                                    await apiService.saveModuleRecord('stock_transactions', { id: `stx_${Date.now()}`, itemId: item.id, itemName: item.name, type, quantity: qty, recipientOrSupplier: party, verificationMethod: method, date: new Date().toISOString(), institutionId: currentUser.institutionId, recordedBy: currentUser.id });
                                    loadData();
                                }}
                            />
                        ) : activeRole === 'librarian' ? (
                            <LibrarianView
                                user={currentUser}
                                users={users}
                                books={books}
                                transactions={libraryTransactions}
                                onAddBook={async (b) => { await apiService.saveModuleRecord('books', { ...b, id: `bk_${Date.now()}`, institutionId: currentUser.institutionId, addedDate: new Date().toISOString() }); loadData(); }}
                                onUpdateBook={async (id, d) => { const b = books.find(x => x.id === id); if (b) await apiService.saveModuleRecord('books', { ...b, ...d }); loadData(); }}
                                onDeleteBook={async (id) => { await apiService.deleteModuleRecord('books', id); loadData(); }}
                                onIssueBook={async (bid, uid, due) => {
                                    await apiService.saveModuleRecord('library_transactions', { id: `ltx_${Date.now()}`, bookId: bid, userId: uid, dueDate: due, issueDate: new Date().toISOString(), status: 'issued', institutionId: currentUser.institutionId });
                                    const b = books.find(x => x.id === bid);
                                    if (b) await apiService.saveModuleRecord('books', { ...b, available: b.available - 1 });
                                    loadData();
                                }}
                                onReturnBook={async (tid) => {
                                    const t = libraryTransactions.find(x => x.id === tid);
                                    if (t) {
                                        await apiService.saveModuleRecord('library_transactions', { ...t, returnDate: new Date().toISOString(), status: 'returned' });
                                        const b = books.find(x => x.id === t.bookId);
                                        if (b) await apiService.saveModuleRecord('books', { ...b, available: b.available + 1 });
                                        loadData();
                                    }
                                }}
                            />

                        ) : isAdminCatchAll ? (
                            <AdminView
                                currentUser={currentUser}
                                users={users}
                                requests={requests}
                                allocations={allocations}
                                departments={departments}
                                subjects={subjects}
                                courses={courses}
                                rooms={rooms}
                                buildings={buildings}
                                academicLevels={academicLevels}
                                academicYears={academicYears}
                                semesters={semesters}
                                activeAcademicYear={activeAcademicYear}
                                activeSemester={activeSemester}
                                timetableSettings={timetableSettings}
                                examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                logoUrl={activeLogoUrl}
                                footerImageUrl={activeFooterImageUrl}
                                themeColor={companyDetails.themeColor || '#4f46e5'}
                                companyDetails={companyDetails}
                                activityLog={activityLog}
                                transactions={transactions}
                                receipts={receipts}
                                invoices={invoices}
                                extensionRequests={extensionRequests}
                                voteHeads={voteHeads}
                                feeStructures={feeStructures}
                                financialPeriods={financialPeriods}
                                userTasks={userTasks}
                                generatedTimetable={generatedTimetable}
                                allTimetableEntries={generatedTimetable}
                                finalTimetableUrl={null}
                                letterheadConfig={activeLetterheadConfig}
                                smsConfig={companyDetails.smsConfig}
                                emailConfig={companyDetails.emailConfig}
                                timetableConflicts={timetableConflicts}
                                currentInstitution={activeInstitution}
                                onAddUser={async (data) => { await apiService.saveUser({ ...data, id: generateUserId(), institutionId: currentUser!.institutionId }); loadData(); }}
                                onEditUser={onEditUser}
                                onDeleteUser={onDeleteUser}
                                onImportUsers={onImportUsers}
                                onImportStudents={onImportStudents}
                                onAddDepartment={handleAddDepartment}
                                onUpdateDepartment={handleUpdateDepartment}
                                onDeleteDepartment={handleDeleteDepartment}
                                onImportDepartments={handleImportDepartments}
                                onAddSubject={handleAddSubject}
                                onUpdateSubject={handleUpdateSubject}
                                onDeleteSubject={handleDeleteSubject}
                                onAddRoom={handleAddRoom}
                                onUpdateRoom={handleUpdateRoom}
                                onDeleteRoom={handleDeleteRoom}
                                onImportRooms={handleImportRooms}
                                onAddCourse={handleAddCourse}
                                onImportCourses={handleImportCourses}
                                onUpdateCourse={handleUpdateCourse}
                                onDeleteCourse={handleDeleteCourse}
                                onAddAcademicLevel={handleAddAcademicLevel}
                                onUpdateAcademicLevel={handleUpdateAcademicLevel}
                                onDeleteAcademicLevel={handleDeleteAcademicLevel}
                                onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: `ay_${Date.now()}`, institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }}
                                onUpdateAcademicYear={async (id, data) => { await apiService.saveModuleRecord('academic_years', { ...data, id }); loadData(); }}
                                onDeleteAcademicYear={async (id) => { await apiService.deleteModuleRecord('academic_years', id); loadData(); }}
                                onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: `sem_${Date.now()}`, institutionId: currentUser!.institutionId }); loadData(); }}
                                onUpdateSemester={async (id, data) => { await apiService.saveModuleRecord('semesters', { ...data, id }); loadData(); }}
                                onDeleteSemester={async (id) => { await apiService.deleteModuleRecord('semesters', id); loadData(); }}
                                onUpdateRequestStatus={(id, status) => apiService.updateAllocationStatus(id, status)}
                                onBulkUpdateRequestStatus={async (status, deptId) => { const targets = requests.filter(r => r.status === 'pending' || r.status === 'hod_approved'); for (const t of targets) await apiService.updateAllocationStatus(t.id, status); loadData(); }}
                                onDirectAssign={handleDirectAssign}
                                onTimetableGenerated={async (entries, ay, sem) => apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries)}
                                onExamTimetableGenerated={async (entries, ay, sem) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)}
                                onSaveTimetableSettings={(config) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: config })}
                                onSaveExamTimetableSettings={(config) => onUpdateInstitution(activeInstitution!.id, { examTimetableSettings: config })}
                                onUpdateLogo={(logo) => onUpdateInstitution(activeInstitution!.id, { logoUrl: logo })}
                                onUpdateThemeColor={(color) => onUpdateInstitution(activeInstitution!.id, { themeColor: color })}
                                onUpdateInstitution={onUpdateInstitution}
                                onAddTask={async (t) => apiService.saveModuleRecord('tasks', { ...t, userId: currentUser.id, id: `t_${Date.now()}`, createdAt: new Date().toISOString() })}
                                onUpdateTask={async (id, c) => { const task = userTasks.find(x => x.id === id); if (task) await apiService.saveModuleRecord('tasks', { ...task, isComplete: c }); }}
                                onDeleteTask={async (id) => apiService.deleteModuleRecord('tasks', id)}
                                onLogAction={async (a) => apiService.saveModuleRecord('activity_log', { id: `log_${Date.now()}`, userId: currentUser!.id, userName: currentUser!.name, institutionId: currentUser!.institutionId, action: a, timestamp: new Date().toISOString() })}
                                onSendSms={async (r, m) => apiService.sendSms(r, m, companyDetails.smsConfig)}
                                onSaveSmsConfig={() => { }}
                                onUpdateRequest={(id, data) => apiService.saveModuleRecord('allocation_requests', { id, ...data })}
                                onWithdrawRequest={(id) => apiService.deleteModuleRecord('allocation_requests', id)}
                                onAddUnavailability={() => { }}
                                onUpdateUnavailability={() => { }}
                                onDeleteUnavailability={() => { }}
                                onManageUnavailability={() => { }}
                                onAddParent={async (sid, p) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => ({ success: true, message: 'Parent added.' }))}
                                onDeleteParent={() => { }}
                                getLecturerById={getLecturerById}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                onPublishTimetable={() => { }}
                                onRemovePublishedTimetable={() => { }}
                                onSendTestEmail={async (r) => ({ success: true, message: 'Test email sent.' })}
                                onSaveEmailConfig={() => { }}
                                onSaveLetterheadConfig={(config) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config })}
                                onUpdateFooterImage={(footer) => onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer })}
                                onImportSubjectsAndAssociate={apiService.onImportSubjectsAndAssociate.bind(apiService)}
                                onAssociateSubjectToCourseLevel={apiService.onAssociateSubjectToCourseLevel.bind(apiService)}
                                onDisassociateSubjectFromCourseLevel={() => { }}
                                onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                onAddExtensionRequest={() => { }}
                                onUpdateExtensionRequestStatus={() => { }}
                                onSaveBiometricConfig={() => { }}
                                onUpdateVoteHeads={() => { }}
                                onUpdateFeeStructures={() => { }}
                                onUpdateFinancialPeriods={() => { }}
                                onAddBuildings={async (b) => { }}
                                timeOffRequests={timeOffRequests}
                                onUpdateTimeOffRequestStatus={() => { }}
                                enrollmentRequests={enrollmentRequests}
                                absenceRequests={absenceRequests}
                                studentAbsenceRequests={studentAbsenceRequests}
                                onUpdateEnrollmentRequest={() => { }}
                                onUpdateAbsenceRequest={() => { }}
                                onUpdateStudentAbsenceRequestStatus={() => { }}
                                isTimetableGenerating={false}
                                timetableGenerationProgress={0}
                                timetableGenerationMessage=""
                                timetableGenerationEta={null}
                                onAddSecurityAlert={() => { }}
                                onSetSettingsTab={() => { }}
                                onSetSettingsSubTab={() => { }}
                                onResolveSecurityAlert={() => { }}
                                securityAlerts={securityAlerts}
                                visitors={visitors}
                                requisitions={requisitions}
                                studentAttendances={studentAttendances}
                                studentCheckIns={studentCheckIns}
                                lessonRatings={lessonRatings}
                                feedbackSubmissions={feedbackSubmissions}
                                onUpdateFeedbackStatus={() => { }}
                                courseSizes={courseSizes}
                                assessments={assessments}
                                assessmentMarks={assessmentMarks}
                                onAddAssessment={async (d) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                onDeleteAssessment={async (id) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                onUpdateAssessmentStatus={() => { }}
                                onSaveAssessmentMarks={async (id, marks) => {
                                    const promises = marks.map((m: any) => {
                                        const existing = assessmentMarks.find(am => am.assessmentId === id && am.studentId === m.studentId);
                                        const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()}`;

                                        const record: AssessmentMark = {
                                            id: recordId,
                                            assessmentId: id,
                                            studentId: m.studentId,
                                            marks: m.marks,
                                            comments: m.comments,
                                            gradedBy: currentUser.id,
                                            timestamp: new Date().toISOString(),
                                            institutionId: currentUser.institutionId
                                        };
                                        return apiService.saveModuleRecord('assessment_marks', record);
                                    });
                                    await Promise.all(promises);
                                    loadData();
                                }}
                                contracts={contracts}
                                onGenerateDemoData={() => { }}
                                onClearDemoData={() => { }}
                                isGeneratingDemoData={false}
                                demoDataGenerationProgress={0}
                                demoDataGenerationMessage=""
                                examTimetable={examTimetable}
                                onSwitchPerspective={(role) => setImpersonatedRole(role)}
                                onWithdrawRequestStatus={async (id) => { }}
                                onManualInvoice={() => { }}
                                onUpdateCompanyDetails={async (d) => await apiService.saveCompanySettings(d)}
                                onAddInstitution={async (d) => await apiService.saveInstitution(d as any)}
                                onDeleteInstitution={onDeleteInstitution}
                                onToggleInstitutionStatus={onToggleInstitutionStatus}
                                onLoginAsAdmin={onLoginAsAdmin}
                                onGenerateReceipt={onGenerateReceipt}
                                assignments={assignments}
                                submissions={submissions}
                                onAddAssignment={async (d) => { await apiService.saveModuleRecord('assignments', { ...d, id: `asg_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                onDeleteAssignment={async (id) => { await apiService.deleteModuleRecord('assignments', id); loadData(); }}
                                onUpdateSubmission={async (id, data) => {
                                    const sub = submissions.find(s => s.id === id);
                                    if (sub) {
                                        await apiService.saveModuleRecord('submissions', { ...sub, ...data, status: 'graded' });
                                        loadData();
                                    }
                                }}
                                isImpersonating={!!impersonatedRole}
                            />
                        ) : (
                            <LecturerView
                                user={currentUser}
                                users={users}
                                subjects={subjects}
                                departments={departments}
                                courses={courses}
                                rooms={rooms}
                                requests={requests}
                                allocations={allocations}
                                timetableSettings={timetableSettings}
                                generatedTimetable={generatedTimetable}
                                allTimetableEntries={generatedTimetable}
                                letterheadConfig={activeLetterheadConfig}
                                footerImageUrl={activeFooterImageUrl}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                getLecturerById={getLecturerById}
                                academicYears={academicYears}
                                semesters={semesters}
                                userTasks={userTasks}
                                onSubmitRequest={handleLecturerRequest}
                                onAllocationChangeRequest={handleAllocationChangeRequest}
                                onDeallocationRequest={handleDeallocationRequest}
                                onAddTask={async (t) => apiService.saveModuleRecord('tasks', { ...t, userId: currentUser.id, id: `t_${Date.now()}`, createdAt: new Date().toISOString() })}
                                onUpdateTask={async (id, c) => { const task = userTasks.find(x => x.id === id); if (task) await apiService.saveModuleRecord('tasks', { ...task, isComplete: c }); }}
                                onDeleteTask={async (id) => apiService.deleteModuleRecord('tasks', id)}
                                timeOffRequests={timeOffRequests.filter(r => r.lecturerId === currentUser.id)}
                                onWithdrawRequest={(id) => apiService.deleteModuleRecord('allocation_requests', id)}
                                currentInstitution={activeInstitution}
                                assignments={assignments}
                                submissions={submissions}
                                onAddAssignment={async (d) => { await apiService.saveModuleRecord('assignments', { ...d, id: `asg_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                onDeleteAssignment={async (id) => { await apiService.deleteModuleRecord('assignments', id); loadData(); }}
                                onUpdateSubmission={async (id, data) => {
                                    const sub = submissions.find(s => s.id === id);
                                    if (sub) {
                                        await apiService.saveModuleRecord('submissions', { ...sub, ...data, status: 'graded' });
                                        loadData();
                                    }
                                }}
                                assessments={assessments}
                                assessmentMarks={assessmentMarks}
                                onAddAssessment={async (d) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                onDeleteAssessment={async (id) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                onSaveAssessmentMarks={async (id, marks) => {
                                    const promises = marks.map((m: any) => {
                                        const existing = assessmentMarks.find(am => am.assessmentId === id && am.studentId === m.studentId);
                                        const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()}`;

                                        const record: AssessmentMark = {
                                            id: recordId,
                                            assessmentId: id,
                                            studentId: m.studentId,
                                            marks: m.marks,
                                            comments: m.comments,
                                            gradedBy: currentUser.id,
                                            timestamp: new Date().toISOString(),
                                            institutionId: currentUser.institutionId
                                        };
                                        return apiService.saveModuleRecord('assessment_marks', record);
                                    });
                                    await Promise.all(promises);
                                    loadData();
                                }}
                            />
                        )}
                    </main>

                    {isProfileModalOpen && (
                        <ProfileModal currentUser={currentUser} onClose={() => setIsProfileModalOpen(false)} onSave={async (id, data) => { const fullUpdate = { ...data, id, role: currentUser.role, institutionId: currentUser.institutionId }; await apiService.saveUser(fullUpdate); setCurrentUser(prev => prev ? ({ ...prev, ...fullUpdate }) : null); setIsProfileModalOpen(false); }} onChangePassword={async (id, data) => { const updated = { id, password: data.newPassword, passwordLastUpdated: new Date().toISOString(), role: currentUser.role, institutionId: currentUser.institutionId }; await apiService.saveUser(updated); return { success: true, message: "Password updated." }; }} onManageUnavailability={() => { }} />
                    )}
                </>
            ) : (
                <>
                    <LoginView onLogin={(e, p) => { const u = (users || []).find(user => user && user.email?.toLowerCase() === e.toLowerCase() && (user.password === p || (!user.password && p === 'password123'))); if (u) { const inst = institutions.find(i => i.id === u.institutionId); if (inst?.status === 'suspended' && u.role !== 'super_admin') return 'suspended'; setCurrentUser(u); return 'success'; } return 'failed'; }} {...commonLoginProps} />
                    {showGuestPortal && (
                        <PublicAppointmentView users={users} timetable={generatedTimetable} timetableSettings={timetableSettings} onClose={() => setShowGuestPortal(false)} onBookAppointment={async (apt) => { await apiService.saveModuleRecord('appointments', apt); setShowGuestPortal(false); alert("Appointment submitted."); }} institutions={institutions} />
                    )}
                    {showGuestFeedback && (
                        <GuestFeedbackView institutions={institutions} onClose={() => setShowGuestFeedback(false)} onSubmit={async (feedback) => { await apiService.saveModuleRecord('feedback_submissions', feedback); setShowGuestFeedback(false); }} />
                    )}
                </>
            )}
            {companyDetails.chatAssistantConfig?.enabled && <ChatBot welcomeMessage={companyDetails.chatAssistantConfig?.welcomeMessage} currentInstitution={activeInstitution} />}
            <PerspectiveReturnButton role={impersonatedRole} onReturn={() => setImpersonatedRole(null)} />
        </div>
    );
};
