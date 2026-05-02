import React, { useState, useMemo } from 'react';
import { 
    UsersIcon, 
    TruckIcon, 
    CalendarDaysIcon as CalendarIcon, 
    ClipboardListIcon as ClipboardIcon, 
    SettingsIcon as GearIcon,
    PlusIcon,
    SearchIcon,
    ChevronRightIcon,
    MapPinIcon,
    CheckCircleIcon,
    ClockIcon,
    StarIcon,
    AcademicCapIcon as GraduationCapIcon,
    ExclamationTriangleIcon as AlertTriangleIcon,
    EyeIcon,
    BriefcaseIcon,
    TrendingUpIcon,
    CurrencyIcon
} from '../icons';
import type { 
    User, DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings 
} from '../../types';

interface DrivingSchoolManagerProps {
    currentUser: User;
    currentInstitution: any;
    instructors: DSInstructor[];
    vehicles: DSVehicle[];
    students: DSStudent[];
    lessons: DSLesson[];
    mastery: DSSkillMastery[];
    settings: DSSettings | null;
    onAddInstructor: (data: any) => Promise<void>;
    onAddVehicle: (data: any) => Promise<void>;
    onAddStudent: (data: any) => Promise<void>;
    onAddLesson: (data: any) => Promise<void>;
    onAddMastery: (data: any) => Promise<void>;
    onUpdateSettings: (data: any) => Promise<void>;
    users: User[]; // All users to link students
    onLogAction: (msg: string) => void;
}

export const DrivingSchoolManager: React.FC<DrivingSchoolManagerProps> = ({
    instructors,
    vehicles,
    students,
    lessons,
    mastery,
    settings,
    onAddInstructor,
    onAddVehicle,
    onAddStudent,
    onAddLesson,
    onAddMastery,
    onUpdateSettings,
    users,
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'settings'>('dashboard');
    const [searchTerm, setSearchTerm] = useState('');

    // Stats
    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
        completionRate: students.length > 0 
            ? Math.round((students.filter(s => s.status === 'Graduated').length / students.length) * 100) 
            : 0
    }), [students, instructors, vehicles, lessons]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase())),
    [students, searchTerm]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-20">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Driving School <span className="text-indigo-600">Portal</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase text-[10px] tracking-widest">
                        Manage training, logistics, and student progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => activeTab === 'students' ? onAddStudent({}) : activeTab === 'instructors' ? onAddInstructor({}) : onAddLesson({})}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Quick Action</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-3xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
                {[
                    { id: 'dashboard', label: 'Overview', icon: <TrendingUpIcon className="w-4 h-4" /> },
                    { id: 'students', label: 'Students', icon: <UsersIcon className="w-4 h-4" /> },
                    { id: 'lessons', label: 'Schedule', icon: <CalendarIcon className="w-4 h-4" /> },
                    { id: 'fleet', label: 'Fleet', icon: <TruckIcon className="w-4 h-4" /> },
                    { id: 'instructors', label: 'Instructors', icon: <BriefcaseIcon className="w-4 h-4" /> },
                    { id: 'settings', label: 'Settings', icon: <GearIcon className="w-4 h-4" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl w-fit mb-6">
                            <UsersIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Total Students</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalStudents}</span>
                            <span className="text-emerald-500 font-bold text-xs">+{stats.totalStudents > 0 ? 1 : 0} this week</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl w-fit mb-6">
                            <CalendarIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Pending Lessons</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.pendingLessons}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl w-fit mb-6">
                            <TruckIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Fleet Operational</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.operationalVehicles}</span>
                            <span className="text-slate-400 font-medium text-xs">/ {vehicles.length} total</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-900/30 rounded-2xl w-fit mb-6">
                            <GraduationCapIcon className="w-6 h-6 text-fuchsia-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Graduation Rate</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.completionRate}%</span>
                        </div>
                    </div>

                    {/* Recent Progress Feed */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Activity</h2>
                            <button className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest hover:underline">View All Logs</button>
                        </div>
                        <div className="space-y-6">
                            {lessons.slice(0, 4).map(lesson => (
                                <div key={lesson.id} className="flex items-center gap-4 group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                        lesson.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                                    }`}>
                                        <ClipboardIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                {students.find(s => s.id === lesson.studentId)?.fullName || 'Unknown Student'}
                                            </h4>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{lesson.lessonDate}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 uppercase tracking-tighter">
                                            {lesson.lessonType} Session • {lesson.startTime} - {lesson.endTime}
                                        </p>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-slate-300 transition-transform group-hover:translate-x-2" />
                                </div>
                            ))}
                            {lessons.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CalendarIcon className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No recent lesson activity</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Chart Placeholder */}
                    <div className="md:col-span-2 bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight mb-2">Fleet Utilization</h2>
                                <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest opacity-80">Track vehicle usage and efficiency</p>
                            </div>
                            <div className="flex items-center gap-6 mt-8">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black">78%</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Capacity</span>
                                </div>
                                <div className="h-12 w-px bg-white/20"></div>
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black">4.8</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Avg Rating</span>
                                </div>
                            </div>
                        </div>
                        {/* Abstract Background Design */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search Students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors">< EyeIcon className="w-5 h-5" /></button>
                            <button className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"><ClipboardIcon className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                    <th className="px-8 py-6">Student</th>
                                    <th className="px-8 py-6">Training Type</th>
                                    <th className="px-8 py-6">Theory Progress</th>
                                    <th className="px-8 py-6">Practical Progress</th>
                                    <th className="px-8 py-6">Status</th>
                                    <th className="px-8 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                    {student.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{student.fullName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">{student.phone || 'No Phone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight italic bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                                {student.licenseTypeInterested || 'Class B'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
                                                    <span>Theory</span>
                                                    <span>{student.theoryProgressPercent}%</span>
                                                </div>
                                                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${student.theoryProgressPercent}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
                                                    <span>Practical</span>
                                                    <span>{student.practicalProgressPercent}%</span>
                                                </div>
                                                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${student.practicalProgressPercent}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                student.status === 'Enrolled' ? 'bg-indigo-50 text-indigo-600' :
                                                student.status === 'Graduated' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-slate-50 text-slate-600'
                                            }`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRightIcon className="w-6 h-6" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="w-24 h-24 bg-white dark:bg-slate-700 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                                    <UsersIcon className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">No Students Found</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Add your first student to begin training tracking</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Other tabs placeholders - would be similarly detailed */}
            {activeTab === 'lessons' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Weekly Schedule</h2>
                            <div className="flex gap-2">
                                <button className="p-3 bg-slate-50 rounded-2xl text-slate-400"><CalendarIcon className="w-5 h-5" /></button>
                                <button className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-bold text-xs">New Lesson</button>
                            </div>
                        </div>
                        {/* Weekly Grid Placeholder */}
                        <div className="grid grid-cols-7 gap-4">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                                <div key={day} className="text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{day}</span>
                                    <div className="h-64 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-start p-2 gap-2 overflow-y-auto no-scrollbar">
                                        {/* Mock Lessons for visual */}
                                        {day === 'MON' && (
                                            <div className="w-full p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-xl text-left">
                                                <p className="text-[10px] font-black text-indigo-700 uppercase">09:00 AM</p>
                                                <p className="text-[9px] font-bold text-indigo-500 truncate uppercase mt-1">Manual Drill</p>
                                            </div>
                                        )}
                                        {day === 'WED' && (
                                            <div className="w-full p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-left">
                                                <p className="text-[10px] font-black text-emerald-700 uppercase">11:30 AM</p>
                                                <p className="text-[9px] font-bold text-emerald-500 truncate uppercase mt-1">Highway Pr.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <ClockIcon className="w-12 h-12 text-slate-800" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Upcoming <span className="text-indigo-400">Next</span></h2>
                        <div className="space-y-6 relative z-10">
                            {lessons.filter(l => l.status === 'Scheduled').length === 0 ? (
                                <div className="py-12 text-center opacity-50">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No lessons approaching</p>
                                </div>
                            ) : (
                                lessons.filter(l => l.status === 'Scheduled').map(lesson => (
                                    <div key={lesson.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-3 py-1 bg-indigo-500 text-[10px] font-black uppercase rounded-lg">Today</span>
                                            <span className="text-xs font-medium text-slate-400 italic">{lesson.startTime}</span>
                                        </div>
                                        <h4 className="font-bold text-lg mb-1">{students.find(s => s.id === lesson.studentId)?.fullName}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{lesson.lessonType} • {vehicles.find(v => v.id === lesson.vehicleId)?.plateNumber}</p>
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-3 bg-white text-slate-900 rounded-xl font-bold text-[10px] uppercase">Complete</button>
                                            <button className="p-3 bg-slate-800 rounded-xl text-slate-400"><EyeIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'fleet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
                            <div className="h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                                <TruckIcon className="w-20 h-20 text-slate-300 transition-transform group-hover:scale-110" />
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <span className="px-4 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                                        {vehicle.transmission}
                                    </span>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                                        vehicle.status === 'Operational' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                        {vehicle.status}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{vehicle.make} {vehicle.model}</h3>
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase">{vehicle.plateNumber}</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Next Service</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white italic">{vehicle.nextServiceDate || 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Total Lessons</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">42</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Schedule Maintenance</button>
                                    <button className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">< EyeIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => onAddVehicle({})}
                        className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-12 group hover:border-indigo-500 transition-all min-h-[400px]"
                    >
                        <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <PlusIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-tight">Add New Vehicle</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Expand your training fleet</p>
                    </button>
                </div>
            )}

            {activeTab === 'instructors' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    {instructors.map(instructor => (
                        <div key={instructor.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex gap-8 group">
                            <div className="w-32 h-32 rounded-[2rem] bg-indigo-50/50 flex items-center justify-center relative shrink-0 overflow-hidden">
                                <UsersIcon className="w-16 h-16 text-indigo-200" />
                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent"></div>
                                <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{instructor.name}</h3>
                                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{instructor.specialization || 'Manual Specialist'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-lg">
                                            <StarIcon className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            <span className="text-[10px] font-black text-amber-700">{instructor.rating || '5.0'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 mt-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Lessons</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white">12</span>
                                        </div>
                                        <div className="h-10 w-px bg-slate-100 dark:bg-slate-800"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white">4y+</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-[10px] uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all">Profile</button>
                                    <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-[10px] uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all">Schedule</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => onAddInstructor({})}
                        className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-dashed border-slate-100 flex items-center justify-center gap-6 group hover:border-indigo-500 transition-all min-h-[160px]"
                    >
                        <PlusIcon className="w-8 h-8 text-slate-300 group-hover:text-indigo-600" />
                        <div className="text-left">
                            <h3 className="text-xl font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-tight leading-none mb-1">Onboard Instructor</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add a new professional driver</p>
                        </div>
                    </button>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-4xl bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Platform <span className="text-indigo-600">Settings</span></h2>
                    <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest mb-12">Configure pricing, policies and working hours</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-3">
                                    <CurrencyIcon className="w-5 h-5 text-indigo-600" />
                                    Lesson Pricing (KSH)
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Practical Session (per hour)</label>
                                        <input 
                                            type="number" 
                                            value={settings?.lessonPricePractical || 0}
                                            onChange={(e) => onUpdateSettings({ ...settings, lessonPricePractical: Number(e.target.value) })}
                                            className="p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-lg" 
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theory Session (per session)</label>
                                        <input 
                                            type="number" 
                                            value={settings?.lessonPriceTheory || 0}
                                            onChange={(e) => onUpdateSettings({ ...settings, lessonPriceTheory: Number(e.target.value) })}
                                            className="p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-lg" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-3">
                                    <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                                    Operating Policies
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancellation Policy</label>
                                        <textarea 
                                            value={settings?.cancellationPolicy || ''}
                                            onChange={(e) => onUpdateSettings({ ...settings, cancellationPolicy: e.target.value })}
                                            rows={4}
                                            placeholder="Specify your rules for lesson cancellation..."
                                            className="p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-8 border-t border-slate-50 dark:border-slate-800">
                            <button 
                                onClick={() => { onLogAction("Updated DS Settings"); alert("Settings saved successfully."); }}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

