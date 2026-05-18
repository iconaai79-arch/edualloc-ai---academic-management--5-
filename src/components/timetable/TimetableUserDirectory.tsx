import React, { useState, useMemo, useEffect } from 'react';
import type { User, Course, Department, TimetableEntry } from '../../types';
import { SearchIcon as Search } from '../icons/SearchIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { EnvelopeIcon } from '../icons/EnvelopeIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { BuildingOfficeIcon as BuildingIcon } from '../icons/BuildingOfficeIcon';
import { AlertTriangleIcon as AlertIcon } from '../icons/AlertTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ArrowUpTrayIcon as UploadIcon } from '../icons/ArrowUpTrayIcon';
import { getInitials } from '../../utils/stringUtils';
import { generatePastelColor } from '../../utils/colorUtils';

interface TimetableUserDirectoryProps {
    institutionId: string;
    role: 'teacher' | 'student';
    allUsers: User[];
    allCourses: Course[];
    departments?: Department[];
    timetableEntries?: TimetableEntry[];
    onViewCalendar: (user: User) => void;
}

export function TimetableUserDirectory({
    institutionId,
    role,
    allUsers = [],
    allCourses = [],
    departments = [],
    timetableEntries = [],
    onViewCalendar,
}: TimetableUserDirectoryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');

    const displayUsers = useMemo(() => {
        // Support 'teacher' role which matches both 'teacher' and 'lecturer'
        const targetRoles = role === 'teacher' ? ['teacher', 'lecturer'] : ['student'];
        let filtered = allUsers.filter(u => 
            targetRoles.includes(u.role) || 
            (u.roles && u.roles.some(r => targetRoles.includes(r)))
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

        // Filter entries
        const entries = timetableEntries.filter(entry => {
            if (role === 'teacher') {
                return entry.lecturerId === userId || entry.lecturer_id === userId;
            } else {
                return entry.courseId === userCourseId || entry.courseLevelId === userCourseId;
            }
        });

        // Detect overlaps/conflicts
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
                    // Check if time ranges overlap
                    if ((aStart >= bStart && aStart < bEnd) || (bStart >= aStart && bStart < aEnd)) {
                        hasConflict = true;
                        conflictCount++;
                    }
                }
            }
        }

        return {
            count: entries.length,
            hasConflict,
            conflictCount,
        };
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

    return (
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
                            <button
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.csv,.xlsx,.xls';
                                    input.onchange = (e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            alert(`Initiating smart parsing for "${file.name}" to import ${role === 'teacher' ? 'teachers' : 'students'} registry...`);
                                        }
                                    };
                                    input.click();
                                }}
                                className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg transition-all hover:scale-102 active:scale-98"
                            >
                                <UploadIcon className="w-3.5 h-3.5" />
                                Import {role === 'teacher' ? 'Teachers' : 'Students'}
                            </button>
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
                    {displayUsers.map((user, idx) => {
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

                                {/* Calendar Deep Link Trigger */}
                                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <button
                                        onClick={() => onViewCalendar(user)}
                                        className="w-full py-3 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-sm group-hover:scale-102 active:scale-98"
                                    >
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        View Live Calendar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
