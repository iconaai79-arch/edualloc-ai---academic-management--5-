import React, { useState, useMemo } from 'react';
import {
    CalendarDaysIcon,
    ClockIcon,
    CheckCircleIcon,
    CurrencyIcon,
    AcademicCapIcon,
    TruckIcon,
    StarIcon,
    ChevronRightIcon,
    PhoneIcon,
    SparklesIcon,
    ClipboardListIcon,
    ExclamationTriangleIcon,
    UsersIcon,
    TrendingUpIcon,
} from '../icons';
import { useDrivingSchool } from '../../services/DrivingSchoolContext';
import type { User, Institution } from '../../types';

interface DSStudentPortalProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogout: () => void;
}

const statusColor: Record<string, string> = {
    Scheduled: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'No Show': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export const DSStudentPortal: React.FC<DSStudentPortalProps> = ({
    currentUser,
    currentInstitution,
    onLogout,
}) => {
    const { students, lessons, invoices, mastery, instructors, vehicles, addLesson } = useDrivingSchool();
    const [activeTab, setActiveTab] = useState<'home' | 'lessons' | 'finance' | 'progress' | 'book'>('home');
    const [bookingDate, setBookingDate] = useState('');
    const [bookingType, setBookingType] = useState<'Practical' | 'Theory'>('Practical');
    const [bookingStart, setBookingStart] = useState('08:00');
    const [bookingEnd, setBookingEnd] = useState('10:00');
    const [bookingInstructor, setBookingInstructor] = useState('');
    const [bookingVehicle, setBookingVehicle] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Match student record to logged-in user (by userId or phone/email)
    const studentRecord = useMemo(() => {
        return (students || []).find(s =>
            s.userId === currentUser.id ||
            (s.phone && s.phone === currentUser.phoneNumber) ||
            (s.email && s.email?.toLowerCase() === currentUser.email?.toLowerCase())
        );
    }, [students, currentUser]);

    const myLessons = useMemo(() => {
        if (!studentRecord) return [];
        return (lessons || [])
            .filter(l => l.studentId === studentRecord.id)
            .sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime());
    }, [lessons, studentRecord]);

    const myInvoices = useMemo(() => {
        if (!studentRecord) return [];
        return (invoices || []).filter(inv => inv.studentId === studentRecord.id);
    }, [invoices, studentRecord]);

    const myMastery = useMemo(() => {
        if (!studentRecord) return [];
        return (mastery || []).filter(m => m.studentId === studentRecord.id);
    }, [mastery, studentRecord]);

    const upcomingLessons = myLessons.filter(l => l.status === 'Scheduled' && new Date(l.lessonDate) >= new Date(new Date().toDateString()));
    const completedLessons = myLessons.filter(l => l.status === 'Completed');
    const totalBalance = myInvoices.reduce((s, inv) => s + (Number(inv.balance) || 0), 0);
    const totalPaid = myInvoices.reduce((s, inv) => s + (Number(inv.paidAmount) || 0), 0);

    const activeInstructors = (instructors || []).filter(i => i.status === 'Active');
    const operationalVehicles = (vehicles || []).filter(v => v.status === 'Operational');

    const today = new Date().toISOString().split('T')[0];

    const handleBookLesson = async () => {
        if (!studentRecord || !bookingDate || !bookingInstructor) return;
        setBookingLoading(true);
        try {
            await addLesson({
                id: `lsn_${Date.now()}`,
                institutionId: currentInstitution.id,
                studentId: studentRecord.id,
                instructorId: bookingInstructor,
                vehicleId: bookingType !== 'Theory' ? bookingVehicle : undefined,
                lessonDate: bookingDate,
                startTime: bookingStart,
                endTime: bookingEnd,
                lessonType: bookingType,
                status: 'Scheduled',
                notes: 'Student Self-Booking',
                createdAt: new Date().toISOString(),
            });
            setBookingSuccess(true);
            setBookingDate('');
            setBookingInstructor('');
            setBookingVehicle('');
            setTimeout(() => { setBookingSuccess(false); setActiveTab('lessons'); }, 2000);
        } catch {
            // silently handled
        } finally {
            setBookingLoading(false);
        }
    };

    const getInstructorName = (id?: string) => instructors?.find(i => i.id === id)?.name || 'TBA';
    const getVehiclePlate = (id?: string) => {
        const v = vehicles?.find(v => v.id === id);
        return v ? `${v.make} ${v.model} (${v.plateNumber})` : 'TBA';
    };

    const theoryProgress = studentRecord?.theoryProgressPercent ?? 0;
    const practicalProgress = studentRecord?.practicalProgressPercent ?? 0;
    const overallProgress = Math.round((theoryProgress + practicalProgress) / 2);

    const tabs = [
        { id: 'home', label: 'Home', icon: SparklesIcon },
        { id: 'lessons', label: 'Lessons', icon: CalendarDaysIcon },
        { id: 'finance', label: 'Finance', icon: CurrencyIcon },
        { id: 'progress', label: 'Progress', icon: TrendingUpIcon },
        { id: 'book', label: 'Book', icon: ClipboardListIcon },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Top Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white px-4 pt-10 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full -ml-10 -mb-10" />
                </div>
                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {currentInstitution.logoUrl ? (
                                <img src={currentInstitution.logoUrl} className="w-9 h-9 rounded-xl object-cover" alt="logo" />
                            ) : (
                                <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                    <TruckIcon className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-200">{currentInstitution.name}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-200 hover:text-white transition-colors px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20"
                        >
                            Logout
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-xl font-black uppercase overflow-hidden shrink-0">
                            {studentRecord?.passportPhoto ? (
                                <img src={studentRecord.passportPhoto as string} className="w-full h-full object-cover" alt="Photo" />
                            ) : (
                                (studentRecord?.fullName || currentUser.name)?.charAt(0)
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Student Portal</p>
                            <h1 className="text-2xl font-black tracking-tight">
                                {studentRecord?.fullName || currentUser.name}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                {studentRecord?.admissionNumber && (
                                    <span className="text-[10px] font-bold text-indigo-200">#{studentRecord.admissionNumber}</span>
                                )}
                                {studentRecord?.licenseCategory && (
                                    <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        {studentRecord.licenseCategory}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                    studentRecord?.status === 'Enrolled' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'
                                }`}>
                                    {studentRecord?.status || 'Enrolled'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-6">
                        {[
                            { label: 'Upcoming', value: upcomingLessons.length, icon: CalendarDaysIcon, color: 'bg-white/15' },
                            { label: 'Completed', value: completedLessons.length, icon: CheckCircleIcon, color: 'bg-emerald-400/20' },
                            { label: 'Balance', value: `KES ${(totalBalance || 0).toLocaleString()}`, icon: CurrencyIcon, color: totalBalance > 0 ? 'bg-rose-400/20' : 'bg-emerald-400/20' },
                        ].map((stat) => (
                            <div key={stat.label} className={`${stat.color} backdrop-blur rounded-2xl p-3 text-center`}>
                                <stat.icon className="w-4 h-4 text-white/70 mx-auto mb-1" />
                                <p className="text-base font-black text-white leading-tight">{stat.value}</p>
                                <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Card - overlaps header */}
            <div className="flex-1 -mt-8 rounded-t-[2.5rem] bg-slate-50 dark:bg-slate-950 relative z-10 px-4 pt-6 pb-28 max-w-lg mx-auto w-full">

                {/* HOME TAB */}
                {activeTab === 'home' && (
                    <div className="space-y-5 animate-fade-in">
                        {/* Next Lesson */}
                        {upcomingLessons.length > 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Next Lesson</h3>
                                    <button onClick={() => setActiveTab('lessons')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">View All</button>
                                </div>
                                {(() => {
                                    const next = upcomingLessons[0];
                                    return (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${next.lessonType === 'Theory' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                                                    {next.lessonType === 'Theory'
                                                        ? <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                                                        : <TruckIcon className="w-5 h-5 text-indigo-600" />
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{next.lessonType} Session</p>
                                                    <p className="text-[11px] text-slate-500 font-medium">
                                                        {new Date(next.lessonDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-indigo-600">{next.startTime}</p>
                                                    <p className="text-[10px] text-slate-400">to {next.endTime}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                    <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{getInstructorName(next.instructorId)}</span>
                                                </div>
                                                {next.vehicleId && (
                                                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                        <TruckIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{getVehiclePlate(next.vehicleId)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 text-center">
                                <CalendarDaysIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-500">No upcoming lessons</p>
                                <button onClick={() => setActiveTab('book')} className="mt-3 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                                    Book a Lesson
                                </button>
                            </div>
                        )}

                        {/* Overall Progress */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Training Progress</h3>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-3xl font-black text-slate-900 dark:text-white">{overallProgress}%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">Overall</span>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Theory', value: theoryProgress, color: 'bg-blue-500' },
                                    { label: 'Practical', value: practicalProgress, color: 'bg-indigo-600' },
                                ].map(p => (
                                    <div key={p.label}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.label}</span>
                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{p.value}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${p.color} rounded-full transition-all duration-700`} style={{ width: `${p.value}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fee Summary */}
                        {myInvoices.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Fee Summary</h3>
                                    <button onClick={() => setActiveTab('finance')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Details</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-center">
                                        <p className="text-lg font-black text-emerald-600">KES {(totalPaid || 0).toLocaleString()}</p>
                                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Paid</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-center ${totalBalance > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                        <p className={`text-lg font-black ${totalBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>KES {(totalBalance || 0).toLocaleString()}</p>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Balance</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setActiveTab('book')} className="bg-indigo-600 p-5 rounded-[1.5rem] text-white flex flex-col items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-indigo-600/25 active:scale-95">
                                <CalendarDaysIcon className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Book Lesson</span>
                            </button>
                            <button onClick={() => setActiveTab('progress')} className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] text-slate-700 dark:text-white flex flex-col items-center gap-2 hover:scale-105 transition-all border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95">
                                <StarIcon className="w-6 h-6 text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">My Skills</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* LESSONS TAB */}
                {activeTab === 'lessons' && (
                    <div className="space-y-3 animate-fade-in">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">My Lessons</h2>
                        {myLessons.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-bold">No lessons recorded yet.</p>
                            </div>
                        ) : (
                            myLessons.map(lesson => (
                                <div key={lesson.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lesson.lessonType === 'Theory' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                                        {lesson.lessonType === 'Theory'
                                            ? <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                                            : <TruckIcon className="w-5 h-5 text-indigo-600" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{lesson.lessonType} — {getInstructorName(lesson.instructorId)}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {new Date(lesson.lessonDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} · {lesson.startTime}–{lesson.endTime}
                                        </p>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl whitespace-nowrap ${statusColor[lesson.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {lesson.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* FINANCE TAB */}
                {activeTab === 'finance' && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Fee & Payments</h2>

                        {/* Summary pills */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
                                <p className="text-xl font-black text-emerald-600">KES {(totalPaid || 0).toLocaleString()}</p>
                                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mt-1">Total Paid</p>
                            </div>
                            <div className={`rounded-2xl p-4 text-center ${totalBalance > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                <p className={`text-xl font-black ${totalBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>KES {(totalBalance || 0).toLocaleString()}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Outstanding</p>
                            </div>
                        </div>

                        {totalBalance > 0 && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-black text-amber-900 dark:text-amber-200">Outstanding Balance</p>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                        You have an outstanding balance of <strong>KES {(totalBalance || 0).toLocaleString()}</strong>. Please contact {currentInstitution.name} to make a payment.
                                    </p>
                                    {currentInstitution.phoneNumber && (
                                        <a href={`tel:${currentInstitution.phoneNumber}`} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-amber-700 underline">
                                            <PhoneIcon className="w-3 h-3" /> {currentInstitution.phoneNumber}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Invoice list */}
                        {myInvoices.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <CurrencyIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-bold">No invoices found.</p>
                            </div>
                        ) : (
                            myInvoices.map(inv => (
                                <div key={inv.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">{inv.className || 'Course Fee'}</p>
                                            <p className="text-[10px] text-slate-400">#{inv.invoiceNumber}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl ${
                                            inv.status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-700' :
                                            inv.status === 'Partially Paid' ? 'bg-amber-50 text-amber-700' :
                                            'bg-rose-50 text-rose-700'
                                        }`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {(inv.items || []).slice(0, 3).map((item, i) => (
                                            <div key={i} className="flex justify-between text-[11px]">
                                                <span className="text-slate-500">{item.name}</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">KES {Number(item.amount).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between">
                                            <span className="text-[11px] font-black text-slate-500">Balance</span>
                                            <span className={`text-sm font-black ${Number(inv.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                KES {Number(inv.balance).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* PROGRESS TAB */}
                {activeTab === 'progress' && (
                    <div className="space-y-5 animate-fade-in">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Training Progress</h2>

                        {/* Overall */}
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-[2rem] p-6 text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Overall Completion</p>
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-5xl font-black">{overallProgress}%</span>
                                <span className="text-indigo-200 text-sm mb-1">complete</span>
                            </div>
                            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${overallProgress}%` }} />
                            </div>
                        </div>

                        {/* Theory / Practical breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Theory', value: theoryProgress, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', bar: 'bg-blue-500', icon: AcademicCapIcon },
                                { label: 'Practical', value: practicalProgress, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', bar: 'bg-indigo-600', icon: TruckIcon },
                            ].map(p => (
                                <div key={p.label} className={`${p.bg} rounded-2xl p-4`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <p.icon className={`w-4 h-4 ${p.color}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{p.label}</span>
                                    </div>
                                    <p className={`text-2xl font-black ${p.color}`}>{p.value}%</p>
                                    <div className="h-2 bg-white/60 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full ${p.bar} rounded-full`} style={{ width: `${p.value}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Test Scores */}
                        {(studentRecord?.theoryTestScore || studentRecord?.practicalTestScore) && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Test Scores</h3>
                                <div className="space-y-3">
                                    {studentRecord.theoryTestScore && (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Theory Test</span>
                                            <span className={`text-sm font-black ${studentRecord.theoryTestScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {studentRecord.theoryTestScore}/100
                                            </span>
                                        </div>
                                    )}
                                    {studentRecord.practicalTestScore && (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Practical Test</span>
                                            <span className={`text-sm font-black ${studentRecord.practicalTestScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {studentRecord.practicalTestScore}/100
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* NTSA Status */}
                        {studentRecord?.ntsaBookingStatus && (
                            <div className={`rounded-2xl p-4 flex items-center gap-3 ${
                                studentRecord.ntsaBookingStatus === 'Passed' ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' :
                                studentRecord.ntsaBookingStatus === 'Booked' ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200' :
                                'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800'
                            }`}>
                                <CheckCircleIcon className={`w-5 h-5 ${
                                    studentRecord.ntsaBookingStatus === 'Passed' ? 'text-emerald-600' :
                                    studentRecord.ntsaBookingStatus === 'Booked' ? 'text-indigo-600' :
                                    'text-slate-400'
                                }`} />
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">NTSA Status</p>
                                    <p className="text-[11px] text-slate-500">{studentRecord.ntsaBookingStatus}</p>
                                </div>
                            </div>
                        )}

                        {/* Skill Masteries */}
                        {myMastery.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Skill Assessments</h3>
                                <div className="space-y-3">
                                    {myMastery.slice(0, 8).map(m => (
                                        <div key={m.id} className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex-1 truncate">{m.skillName}</span>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <StarIcon key={star} className={`w-3.5 h-3.5 ${star <= m.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BOOK TAB */}
                {activeTab === 'book' && (
                    <div className="space-y-5 animate-fade-in">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Book a Lesson</h2>

                        {bookingSuccess ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Lesson Booked!</h3>
                                <p className="text-sm text-slate-500 mt-2">Your lesson has been successfully scheduled.</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 space-y-5">
                                {/* Session Type */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Practical', 'Theory'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setBookingType(t)}
                                                className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                    bookingType === t
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {t === 'Theory' ? <AcademicCapIcon className="w-4 h-4" /> : <TruckIcon className="w-4 h-4" />}
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Date</label>
                                    <input
                                        type="date"
                                        min={today}
                                        value={bookingDate}
                                        onChange={e => setBookingDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Time</label>
                                        <input
                                            type="time"
                                            value={bookingStart}
                                            onChange={e => setBookingStart(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Time</label>
                                        <input
                                            type="time"
                                            value={bookingEnd}
                                            onChange={e => setBookingEnd(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Instructor */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Instructor</label>
                                    <select
                                        value={bookingInstructor}
                                        onChange={e => setBookingInstructor(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">-- Select Instructor --</option>
                                        {activeInstructors.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} {i.specialization ? `(${i.specialization})` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Vehicle (Practical only) */}
                                {bookingType === 'Practical' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle (Optional)</label>
                                        <select
                                            value={bookingVehicle}
                                            onChange={e => setBookingVehicle(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">-- Any Available Vehicle --</option>
                                            {operationalVehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    onClick={handleBookLesson}
                                    disabled={!bookingDate || !bookingInstructor || bookingLoading}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                                >
                                    {bookingLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Confirm Booking
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Nav Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-2 py-2 safe-area-bottom">
                <div className="flex items-center justify-around max-w-lg mx-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
                                activeTab === tab.id
                                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
