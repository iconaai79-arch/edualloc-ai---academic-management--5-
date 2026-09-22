
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { User, Course, Department, TimetableEntry, Subject, AllocationRequest, TimeOffRequest } from '../../types';
import { isSuperAdminUser } from '../../types';
import { SearchIcon as Search } from '../icons/SearchIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { EnvelopeIcon } from '../icons/EnvelopeIcon';
import { BuildingOfficeIcon as BuildingIcon } from '../icons/BuildingOfficeIcon';
import { AlertTriangleIcon as AlertIcon } from '../icons/AlertTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ArrowUpTrayIcon as UploadIcon } from '../icons/ArrowUpTrayIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { getInitials } from '../../utils/stringUtils';
import { generatePastelColor } from '../../utils/colorUtils';
import { ManageLessonsModal } from '../ManageLessonsModal';
import { TimeOffRequestModal } from '../TimeOffRequestModal';

interface TimetableUserDirectoryProps {
    institutionId: string;
    role: 'teacher' | 'student';
    allUsers: User[];
    allCourses: Course[];
    departments?: Department[];
    timetableEntries?: TimetableEntry[];
    onViewCalendar: (user: User) => void;
    // Teacher-action extras (optional — only applies when role === 'teacher')
    subjects?: Subject[];
    allocations?: AllocationRequest[];
    onDirectAssign?: (lecturerId: string, subjectIds: string[], priority: any, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onUpdateRequest?: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest?: (requestId: string) => Promise<void>;
    onAddTimeOffRequest?: (data: Partial<TimeOffRequest>) => Promise<void>;
    onRestoreSchedule?: (userId: string) => void;
    isSchool?: boolean;
    // Import callbacks
    onImportStudents?: (students: any[]) => Promise<void>;
    onImportUsers?: (users: any[]) => Promise<void>;
}

export function TimetableUserDirectory({
    institutionId,
    role,
    allUsers = [],
    allCourses = [],
    departments = [],
    timetableEntries = [],
    onViewCalendar,
    subjects = [],
    allocations = [],
    onDirectAssign,
    onUpdateRequest,
    onWithdrawRequest,
    onAddTimeOffRequest,
    onRestoreSchedule,
    isSchool,
    onImportStudents,
    onImportUsers,
}: TimetableUserDirectoryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Teacher action modal state
    const [managingWorkloadFor, setManagingWorkloadFor] = useState<User | null>(null);
    const [requestingTimeOffFor, setRequestingTimeOffFor] = useState<User | null>(null);
    const [confirmRestoreFor, setConfirmRestoreFor] = useState<User | null>(null);

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        setImportResult(null);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rows.length === 0) {
                alert('The uploaded file appears to be empty or has no data rows.');
                setIsImporting(false);
                return;
            }

            // Smart column mapping — case-insensitive, handles common column name variants
            const sanitized = rows.map((row: any) => {
                const get = (...keys: string[]) => {
                    for (const k of keys) {
                        const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        if (found && String(row[found]).trim()) return String(row[found]).trim();
                    }
                    return '';
                };

                const name = get('name', 'fullname', 'studentname', 'teachername', 'staffname');
                const email = get('email', 'emailaddress', 'mail');
                const phone = get('phone', 'phonenumber', 'mobile', 'contact', 'tel');
                const admissionNumber = get('admissionnumber', 'admno', 'regno', 'registrationnumber', 'studentid', 'id');
                const staffId = get('staffid', 'employeeid', 'staffno', 'id');
                const gender = get('gender', 'sex');
                const courseName = get('course', 'class', 'grade', 'program', 'stream');
                const departmentName = get('department', 'dept', 'faculty', 'section');

                // Try to resolve courseId from course name
                const matchedCourse = allCourses.find(c =>
                    c.name.toLowerCase() === courseName.toLowerCase() ||
                    c.code?.toLowerCase() === courseName.toLowerCase()
                );

                // Try to resolve departmentId from department name
                const matchedDept = departments.find(d =>
                    d.name.toLowerCase() === departmentName.toLowerCase()
                );

                if (role === 'student') {
                    return {
                        name: name || 'Unknown',
                        email,
                        phoneNumber: phone,
                        admissionNumber,
                        gender: gender || 'Male',
                        role: 'student',
                        roles: ['student'],
                        courseId: matchedCourse?.id || '',
                        institutionId,
                    };
                } else {
                    return {
                        name: name || 'Unknown',
                        email,
                        phoneNumber: phone,
                        staffId,
                        gender: gender || 'Male',
                        role: 'teacher',
                        roles: ['teacher'],
                        departmentId: matchedDept?.id || '',
                        institutionId,
                    };
                }
            }).filter((r: any) => r.name && r.name !== 'Unknown');

            if (sanitized.length === 0) {
                alert('No valid records found. Ensure the file has a "Name" column and at least one data row.');
                setIsImporting(false);
                return;
            }

            if (role === 'student' && onImportStudents) {
                await onImportStudents(sanitized);
            } else if (role === 'teacher' && onImportUsers) {
                await onImportUsers(sanitized);
            } else {
                alert(`${sanitized.length} records parsed. No import handler connected — please use the main User Manager to complete the import.`);
                setIsImporting(false);
                return;
            }

            setImportResult({ success: sanitized.length, failed: rows.length - sanitized.length });
            alert(`✅ Import complete! ${sanitized.length} ${role === 'student' ? 'students' : 'teachers'} imported successfully.${rows.length - sanitized.length > 0 ? ` ${rows.length - sanitized.length} rows skipped (missing name).` : ''}`);
        } catch (err: any) {
            console.error('[Import Error]', err);
            alert(`Import failed: ${err.message || 'Unknown error. Ensure the file is a valid .xlsx or .csv.'}`);
        } finally {
            setIsImporting(false);
            // Reset file input so same file can be re-uploaded
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const displayUsers = useMemo(() => {
        const targetRoles = role === 'teacher' ? ['teacher', 'lecturer'] : ['student'];
        let filtered = allUsers.filter(u =>
            ((targetRoles.includes(u.role) ||
            (Array.isArray(u.roles) && u.roles.some(r => targetRoles.includes(r))))) &&
            !isSuperAdminUser(u)
        );

        if (selectedCourseId !== 'all' && role === 'student') {
            filtered = filtered.filter(u => u.courseId === selectedCourseId);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                u.name.toLowerCase().includes(query) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.phoneNumber && u.phoneNumber.includes(query)) ||
                (u.staffId && u.staffId.toLowerCase().includes(query)) ||
                ((u as any).admission_number && (u as any).admission_number.toLowerCase().includes(query)) ||
                (u.admissionNumber && u.admissionNumber.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [allUsers, role, selectedCourseId, searchQuery]);

    // Calculate timetable stats for a user
    const getUserTimetableInfo = (user: User) => {
        const userId = user.id;
        const userCourseId = user.courseId;

        const entries = timetableEntries.filter(entry => {
            if (role === 'teacher') {
                return entry.lecturerId === userId || entry.lecturer_id === userId;
            } else {
                return entry.courseId === userCourseId || entry.courseLevelId === userCourseId;
            }
        });

        let hasConflict = false;
        let conflictCount = 0;

        for (let i = 0; i < entries.length; i++) {
            const a = entries[i];
            const aStart = a.startTime || a.start_time || '';
            const aEnd = a.endTime || a.end_time || '';
            for (let j = i + 1; j < entries.length; j++) {
                const b = entries[j];
                const bStart = b.startTime || b.start_time || '';
                const bEnd = b.endTime || b.end_time || '';

                if (a.day === b.day) {
                    if ((aStart >= bStart && aStart < bEnd) || (bStart >= aStart && bStart < aEnd)) {
                        hasConflict = true;
                        conflictCount++;
                    }
                }
            }
        }

        return { count: entries.length, hasConflict, conflictCount };
    };

    const getCourseName = (courseId?: string) => {
        if (!courseId) return 'N/A';
        const course = allCourses.find(c => c.id === courseId);
        return course ? `${course.name} (${course.code})` : 'N/A';
    };

    const getDepartmentName = (deptId?: string) => {
        if (!deptId) return 'N/A';
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : 'N/A';
    };

    const teacherLessonCount = (user: User) =>
        timetableEntries.filter(e => e.lecturerId === user.id || e.lecturer_id === user.id).length;

    return (
        <>
            <div className="space-y-6">
                {/* Header / Filter Panel */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-[2.5rem] shadow-sm p-6 sm:p-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-500/10 text-indigo-600 rounded-3xl dark:bg-indigo-900/20 dark:text-indigo-400">
                            {role === 'teacher' ? <UserIcon className="w-6 h-6" /> : <UserGroupIcon className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {role === 'teacher' ? 'Academics: Teachers Registry' : 'Academics: Students Registry'}
                            </h2>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {displayUsers.length} total active {role === 'teacher' ? 'teachers' : 'students'}
                                </p>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <div
                                    className="relative inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg transition-all hover:scale-102 active:scale-98 cursor-pointer overflow-hidden"
                                >
                                    <UploadIcon className={`w-3.5 h-3.5 pointer-events-none ${isImporting ? 'animate-spin' : ''}`} />
                                    <span className="pointer-events-none">{isImporting ? 'Importing...' : `Import ${role === 'teacher' ? 'Teachers' : 'Students'}`}</span>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isImporting}
                                        onChange={handleFileImport}
                                        title={`Import ${role === 'teacher' ? 'Teachers' : 'Students'}`}
                                    />
                                </div>
                                {importResult && (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                                        ✓ {importResult.success} imported
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center flex-1 max-w-2xl justify-end">
                        {/* Search Field */}
                        <div className="relative flex-1 group">
                            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={`Search by name, ID, contact...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                            />
                        </div>

                        {/* Optional Grade Filter for Students */}
                        {role === 'student' && allCourses.length > 0 && (
                            <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="px-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="all">All Grades</option>
                                {allCourses.map(course => (
                                    <option key={course.id} value={course.id}>{course.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Directory Grid */}
                {displayUsers.length === 0 ? (
                    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-16 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            {role === 'teacher' ? <UserIcon className="w-10 h-10 text-slate-300" /> : <UserGroupIcon className="w-10 h-10 text-slate-300" />}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">No Records Found</h3>
                        <p className="text-slate-400 text-xs italic mt-2 font-medium">No records match the requested search parameters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {displayUsers.map((user) => {
                            const avatarColor = generatePastelColor(user.id);
                            const idVal = role === 'student'
                                ? (user.admissionNumber || (user as any).admission_number || 'N/A')
                                : (user.staffId || 'N/A');

                            const scheduleStats = getUserTimetableInfo(user);

                            return (
                                <div
                                    key={user.id}
                                    className="group bg-white dark:bg-slate-850 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                                >
                                    <div className="space-y-4">
                                        {/* Profile Header */}
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-slate-800 text-sm shadow-sm flex-shrink-0"
                                                style={{ backgroundColor: avatarColor }}
                                            >
                                                {getInitials(user.name)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-black text-slate-900 dark:text-white text-sm truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {user.name}
                                                </h4>
                                                <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                                                    {role === 'student' ? `ADM: ${idVal}` : `STAFF: ${idVal}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Faculty / Enrolled Class detail */}
                                        <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-2.5">
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <BuildingIcon className="w-4 h-4 text-slate-400" />
                                                <span className="font-semibold truncate">
                                                    {role === 'student'
                                                        ? getCourseName(user.courseId)
                                                        : getDepartmentName(user.departmentId)}
                                                </span>
                                            </div>

                                            {user.email && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Timetable Diagnostic Summary Panel */}
                                        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                                <span className="text-slate-400">Lessons Assigned</span>
                                                <span className={`px-2 py-0.5 rounded text-white ${scheduleStats.count > 0 ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                                                    {scheduleStats.count} {scheduleStats.count === 1 ? 'Lesson' : 'Lessons'}
                                                </span>
                                            </div>

                                            {/* Overlap Alarm Indicator */}
                                            {scheduleStats.hasConflict ? (
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-amber-600 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 animate-pulse">
                                                    <AlertIcon className="w-4 h-4 flex-shrink-0" />
                                                    <span>Overlap Warning: {scheduleStats.conflictCount} conflicts detected!</span>
                                                </div>
                                            ) : (
                                                scheduleStats.count > 0 && (
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                                                        <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                                                        <span>Schedule fully resolved (No overlaps)</span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 space-y-2">
                                        {/* Primary: View Calendar */}
                                        <button
                                            onClick={() => onViewCalendar(user)}
                                            className="w-full py-3 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-sm group-hover:scale-102 active:scale-98"
                                        >
                                            <CalendarDaysIcon className="w-4 h-4" />
                                            View Live Calendar
                                        </button>

                                        {/* Teacher-only actions */}
                                        {role === 'teacher' && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {/* Workload */}
                                                <button
                                                    onClick={() => setManagingWorkloadFor(user)}
                                                    title="Manage Workload"
                                                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[8px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                >
                                                    <ClipboardListIcon className="w-4 h-4" />
                                                    Workload
                                                </button>

                                                {/* Time Off */}
                                                <button
                                                    onClick={() => setRequestingTimeOffFor(user)}
                                                    title="Request Time Off"
                                                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl text-[8px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                >
                                                    <CalendarDaysIcon className="w-4 h-4" />
                                                    Time Off
                                                </button>

                                                {/* Restore / Reset Schedule */}
                                                <button
                                                    onClick={() => setConfirmRestoreFor(user)}
                                                    title="Restore / Reset Schedule"
                                                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl text-[8px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    Restore
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Modals ── */}

            {/* Workload Modal */}
            {managingWorkloadFor && (
                <ManageLessonsModal
                    teacher={managingWorkloadFor}
                    subjects={subjects}
                    departments={departments}
                    allocations={allocations}
                    courses={allCourses}
                    isSchool={isSchool}
                    onClose={() => setManagingWorkloadFor(null)}
                    onAssign={onDirectAssign || (() => {})}
                    onUpdateAllocation={onUpdateRequest || (() => {})}
                    onDeallocate={onWithdrawRequest || (async () => {})}
                />
            )}

            {/* Time Off Request Modal */}
            {requestingTimeOffFor && (
                <TimeOffRequestModal
                    onClose={() => setRequestingTimeOffFor(null)}
                    onSubmit={async (data) => {
                        if (onAddTimeOffRequest && requestingTimeOffFor) {
                            await onAddTimeOffRequest({ ...data, lecturerId: requestingTimeOffFor.id });
                            setRequestingTimeOffFor(null);
                        } else {
                            setRequestingTimeOffFor(null);
                        }
                    }}
                />
            )}

            {/* Restore / Reset Confirmation Modal */}
            {confirmRestoreFor && (
                <div
                    className="fixed inset-0 bg-slate-900/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md"
                    onClick={() => setConfirmRestoreFor(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 border border-white/20 dark:border-slate-800 animate-fade-in-up"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Icon */}
                        <div className="flex flex-col items-center text-center gap-4 mb-8">
                            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-[2rem] flex items-center justify-center shadow-xl shadow-rose-100 dark:shadow-none">
                                <ArrowPathIcon className="w-10 h-10 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Restore Schedule
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                    {confirmRestoreFor.name}
                                </p>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 mb-8 text-center">
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">
                                This will clear all{' '}
                                <span className="font-black text-rose-800 dark:text-rose-200">
                                    {teacherLessonCount(confirmRestoreFor)} timetable entries
                                </span>{' '}
                                for <span className="font-black">{confirmRestoreFor.name}</span> and trigger a fresh re-generation for their allocated subjects. This action cannot be undone.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmRestoreFor(null)}
                                className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (onRestoreSchedule) {
                                        onRestoreSchedule(confirmRestoreFor.id);
                                    } else {
                                        alert(`Schedule restore initiated for ${confirmRestoreFor.name}. Re-run the Timetable Wizard to regenerate.`);
                                    }
                                    setConfirmRestoreFor(null);
                                }}
                                className="flex-[2] py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Confirm Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
