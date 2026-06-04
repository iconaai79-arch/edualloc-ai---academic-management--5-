import React, { useState, useMemo, useEffect } from 'react';
import type { User, Course, Department } from '../../types';
import { apiService } from '../../services/apiService';
import { SearchIcon as Search } from '../icons/SearchIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { ZapIcon as Zap } from '../icons/ZapIcon';
import { EnvelopeIcon } from '../icons/EnvelopeIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { BuildingOfficeIcon as BuildingIcon } from '../icons/BuildingOfficeIcon';
import { ArrowUpTrayIcon as UploadIcon } from '../icons/ArrowUpTrayIcon';
import { getInitials } from '../../utils/stringUtils';
import { generatePastelColor } from '../../utils/colorUtils';
import { isPrimaryInstitution, isSecondaryInstitution } from '../../utils/roleUtils';

interface RetailUserDirectoryProps {
    institutionId: string;
    role: 'teacher' | 'student';
    onIssueItem: (user: User) => void;
    allUsers?: User[];
    allCourses?: Course[];
    currentInstitution?: any;
}

export function RetailUserDirectory({
    institutionId,
    role,
    onIssueItem,
    allUsers: propUsers,
    allCourses: propCourses,
    currentInstitution,
}: RetailUserDirectoryProps) {
    const [users, setUsers] = useState<User[]>(propUsers || []);
    const [courses, setCourses] = useState<Course[]>(propCourses || []);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(!propUsers);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('all');

    const isPrimaryOrSecondaryStudent = useMemo(() => {
        if (role !== 'student') return false;
        return isPrimaryInstitution(currentInstitution) || isSecondaryInstitution(currentInstitution);
    }, [currentInstitution, role]);

    // Add manual registration states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        idVal: '', // staffId or admissionNumber
        courseId: '',
        departmentId: '',
        role: 'teacher',
    });

    useEffect(() => {
        if (propUsers) {
            setUsers(propUsers);
            // Fetch departments and courses to resolve N/A labels and dropdown choices
            const fetchDeptsAndCourses = async () => {
                try {
                    const deptsData = await apiService.fetchModuleRecords<Department>('departments', institutionId);
                    setDepartments(deptsData || []);
                    if (!propCourses) {
                        const coursesData = await apiService.fetchModuleRecords<Course>('courses', institutionId);
                        setCourses(coursesData || []);
                    }
                } catch (err) {
                    console.error('Failed to fetch departments/courses for directory:', err);
                }
            };
            fetchDeptsAndCourses();
        } else {
            fetchData();
        }
    }, [propUsers, propCourses, institutionId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, coursesData, deptsData] = await Promise.all([
                apiService.fetchModuleRecords<User>('users', institutionId),
                apiService.fetchModuleRecords<Course>('courses', institutionId),
                apiService.fetchModuleRecords<Department>('departments', institutionId),
            ]);
            setUsers(usersData || []);
            setCourses(coursesData || []);
            setDepartments(deptsData || []);
        } catch (err) {
            console.error('Failed to fetch data for directory:', err);
        } finally {
            setLoading(false);
        }
    };

    const displayUsers = useMemo(() => {
        // Filter by role: 'teacher' matches all faculty/lecturer/admin roles for complete support
        const targetRoles = role === 'teacher' 
            ? ['teacher', 'lecturer', 'hod', 'dos', 'deputy', 'head_teacher'] 
            : ['student'];
        let filtered = users.filter(u => 
            targetRoles.includes(u.role) || 
            (Array.isArray(u.roles) && u.roles.some(r => targetRoles.includes(r)))
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
    }, [users, role, selectedCourseId, searchQuery]);

    const getCourseName = (courseId?: string) => {
        if (!courseId) return 'N/A';
        const course = courses.find(c => c.id === courseId);
        return course ? `${course.name} (${course.code})` : 'N/A';
    };

    const getDepartmentName = (deptId?: string) => {
        if (!deptId) return 'N/A';
        const dept = departments.find(d => d.id === deptId);
        return dept ? dept.name : 'N/A';
    };

    const handleRegisterMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Please provide a full name.');
            return;
        }
        if (!formData.idVal.trim()) {
            alert(role === 'teacher' ? 'Please provide a Staff ID.' : 'Please provide an Admission Number.');
            return;
        }
        if (!isPrimaryOrSecondaryStudent && !formData.email.trim()) {
            alert('Please provide an email address.');
            return;
        }

        const idExists = users.some(u => {
            const currentId = role === 'student'
                ? (u.admissionNumber || (u as any).admission_number)
                : u.staffId;
            return currentId && currentId.toLowerCase() === formData.idVal.trim().toLowerCase();
        });

        if (idExists) {
            alert(role === 'teacher' ? 'A teacher with this Staff ID already exists.' : 'A student with this Admission Number already exists.');
            return;
        }

        setIsSubmitting(true);
        try {
            const id = `user_${Date.now()}`;
            const newUser: any = {
                id,
                name: formData.name.trim(),
                email: formData.email.trim() || undefined,
                phoneNumber: formData.phoneNumber.trim() || undefined,
                role: role === 'teacher' ? (formData.role || 'teacher') : 'student',
                roles: role === 'teacher' ? [formData.role || 'teacher'] : ['student'],
                institutionId,
                status: 'active',
                ...(role === 'student' ? {
                    admissionNumber: formData.idVal.trim(),
                    admission_number: formData.idVal.trim(),
                    courseId: formData.courseId || undefined,
                } : {
                    staffId: formData.idVal.trim(),
                    departmentId: formData.departmentId || undefined,
                })
            };

            await apiService.registerUser(newUser);
            setUsers(prev => [newUser as User, ...prev]);
            setIsAddModalOpen(false);
            alert(`${role === 'teacher' ? 'Teacher' : 'Student'} registered successfully!`);
        } catch (err: any) {
            console.error('Failed to manually register user:', err);
            alert('Registration failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const groupedUsers = useMemo(() => {
        if (role !== 'student') return {};
        
        const groups: Record<string, Record<string, User[]>> = {};
        
        displayUsers.forEach(user => {
            const courseName = getCourseName(user.courseId);
            const course = courses.find(c => c.id === user.courseId);
            const level = course?.levels?.find(l => l.id === user.courseLevelId);
            const streamName = level ? level.name : 'No Stream Assigned';
            
            if (!groups[courseName]) groups[courseName] = {};
            if (!groups[courseName][streamName]) groups[courseName][streamName] = [];
            
            groups[courseName][streamName].push(user);
        });
        
        return groups;
    }, [displayUsers, courses, role]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[3rem] border border-white dark:border-slate-800">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading Directory Manifest...</p>
            </div>
        );
    }

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
                            {role === 'teacher' ? 'Teachers Directory' : 'Students Directory'}
                        </h2>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {displayUsers.length} total registered {role === 'teacher' ? 'teachers' : 'students'}
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
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            <button
                                onClick={() => {
                                    setFormData({
                                        name: '',
                                        email: '',
                                        phoneNumber: '',
                                        idVal: '',
                                        courseId: courses[0]?.id || '',
                                        departmentId: departments[0]?.id || '',
                                        role: 'teacher',
                                    });
                                    setIsAddModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg transition-all hover:scale-102 active:scale-98"
                            >
                                <span className="font-bold text-[11px]">+</span> Add {role === 'teacher' ? 'Teacher' : 'Student'}
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
                            placeholder={`Search ${role === 'teacher' ? 'teachers' : 'students'} by name, ID, contact...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                        />
                    </div>

                    {/* Optional Grade Filter for Students */}
                    {role === 'student' && courses.length > 0 && (
                        <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="px-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                        >
                            <option value="all">All Grades</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Directory Cards Grid */}
            {displayUsers.length === 0 ? (
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-16 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        {role === 'teacher' ? <UserIcon className="w-10 h-10 text-slate-300" /> : <UserGroupIcon className="w-10 h-10 text-slate-300" />}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">No Records Found</h3>
                    <p className="text-slate-400 text-xs italic mt-2 font-medium">No {role === 'teacher' ? 'teachers' : 'students'} match your search filters in the registry database.</p>
                </div>
            ) : role === 'student' ? (
                <div className="space-y-10">
                    {Object.entries(groupedUsers).sort(([a], [b]) => a.localeCompare(b)).map(([gradeName, streams]) => (
                        <div key={gradeName} className="space-y-5 bg-white/40 dark:bg-slate-900/40 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white pb-2 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60">
                                <span className="w-10 h-10 rounded-[1rem] bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <BuildingIcon className="w-5 h-5" />
                                </span>
                                {gradeName}
                            </h3>
                            <div className="space-y-8 md:pl-12 pt-2">
                                {Object.entries(streams).sort(([a], [b]) => a.localeCompare(b)).map(([streamName, students]) => (
                                    <div key={streamName} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                                {streamName}
                                            </h4>
                                            <span className="text-[10px] font-black tracking-widest text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                                                {students.length} {students.length === 1 ? 'STUDENT' : 'STUDENTS'}
                                            </span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden">
                                            <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {students.map((user) => {
                                                    const avatarColor = generatePastelColor(user.id);
                                                    const idVal = user.admissionNumber || (user as any).admission_number || 'N/A';
                                                    return (
                                                        <li key={user.id} className="p-3 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4 group">
                                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                                <div 
                                                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-slate-800 text-xs sm:text-sm shadow-sm flex-shrink-0"
                                                                    style={{ backgroundColor: avatarColor }}
                                                                >
                                                                    {getInitials(user.name)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h5 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                                        {user.name}
                                                                    </h5>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                        <span className="font-semibold text-[9px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                            ADM: {idVal}
                                                                        </span>
                                                                        {user.phoneNumber && (
                                                                            <span className="flex items-center gap-1 truncate"><PhoneIcon className="w-3 h-3"/> {user.phoneNumber}</span>
                                                                        )}
                                                                        {user.email && (
                                                                            <span className="hidden sm:flex items-center gap-1 truncate"><EnvelopeIcon className="w-3 h-3"/> {user.email}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => onIssueItem(user)}
                                                                className="flex-shrink-0 px-4 py-2 sm:py-3 bg-slate-100 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                                            >
                                                                <Zap className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">Issue Item</span>
                                                                <span className="sm:hidden">Issue</span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayUsers.map((user, idx) => {
                        const avatarColor = generatePastelColor(user.id);
                        const idVal = user.staffId || 'N/A';

                        return (
                            <div 
                                key={user.id}
                                className="group bg-white dark:bg-slate-850 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    {/* Top Profile Header */}
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
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className="inline-block text-[8px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                                                    STAFF: {idVal}
                                                </span>
                                                <span className="inline-block text-[8px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                                                    ROLE: {user.role?.toUpperCase() || 'TEACHER'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail Fields */}
                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-2.5">
                                        {/* Grade/Department */}
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <BuildingIcon className="w-4 h-4 text-slate-400" />
                                            <span className="font-semibold truncate">
                                                {getDepartmentName(user.departmentId)}
                                            </span>
                                        </div>

                                        {/* Email */}
                                        {user.email && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        )}

                                        {/* Phone */}
                                        {user.phoneNumber && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <PhoneIcon className="w-4 h-4 text-slate-400" />
                                                <span>{user.phoneNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions footer */}
                                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <button
                                        onClick={() => onIssueItem(user)}
                                        className="w-full py-3 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-sm group-hover:scale-102 active:scale-98"
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                        Issue Supply Item
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Manual Registration Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col">
                        
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Add {role === 'teacher' ? 'Teacher' : 'Student'} Manually
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                                Register a new {role === 'teacher' ? 'academic faculty member' : 'enrolled student'} roster record.
                            </p>
                        </div>
                        
                        {/* Form Body */}
                        <form onSubmit={handleRegisterMember} className="p-8 space-y-5 overflow-y-auto flex-1">
                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter full legal name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                />
                            </div>

                            {/* ID Val (Staff ID or Admission Number) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {role === 'teacher' ? 'Staff ID *' : 'Admission Number *'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={role === 'teacher' ? "e.g. STF-204" : "e.g. ADM-9481"}
                                    value={formData.idVal}
                                    onChange={(e) => setFormData({ ...formData, idVal: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                />
                            </div>

                            {/* Email Address */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Email Address {isPrimaryOrSecondaryStudent ? '(Optional)' : '*'}
                                </label>
                                <input
                                    type="email"
                                    required={!isPrimaryOrSecondaryStudent}
                                    placeholder={isPrimaryOrSecondaryStudent ? "e.g. student@institution.edu (optional)" : "e.g. member@institution.edu"}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-105/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. +254 700 000 000"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-105/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                />
                            </div>

                            {/* Course / Department dropdown selector */}
                            {role === 'student' ? (
                                courses.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grade / Course</label>
                                        <select
                                            value={formData.courseId}
                                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-105/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all cursor-pointer"
                                        >
                                            {courses.map(course => (
                                                <option key={course.id} value={course.id}>{course.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            ) : (
                                <>
                                    {departments.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Faculty Department</label>
                                            <select
                                                value={formData.departmentId}
                                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-105/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all cursor-pointer"
                                            >
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Departmental Role / Designation</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-105/50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all cursor-pointer"
                                        >
                                            <option value="teacher">Teacher / Lecturer</option>
                                            <option value="hod">HOD (Head of Department)</option>
                                            <option value="dos">DOS (Director of Studies)</option>
                                            <option value="deputy">Deputy Principal / Headteacher</option>
                                            <option value="head_teacher">Head Teacher / Principal</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Footer Buttons */}
                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        'Register Member'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
