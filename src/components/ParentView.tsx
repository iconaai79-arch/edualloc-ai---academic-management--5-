import React from 'react';
import type {
    User, Course, StudentAttendance, TimetableEntry,
    Subject, Room, Building, TimetableSettings, LeaveOutRequest, TransportOnboarding, Vehicle
} from '../types';
import { UserIcon } from './icons';

interface ParentViewProps {
    user: User;
    users: User[];
    courses: Course[];
    studentAttendances: StudentAttendance[];
    generatedTimetable: TimetableEntry[];
    subjects: Subject[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    timetableSettings: TimetableSettings;
    buildings: Building[];
    studentCheckIns: Record<string, string>;
    leaveOutRequests: LeaveOutRequest[];
    onUpdateLeaveOut?: (id: string, data: Partial<LeaveOutRequest>) => Promise<void>;
    transportOnboarding?: TransportOnboarding[];
    vehicles?: Vehicle[];
    onConfirmTransport?: (recordId: string) => Promise<void>;
}

import { AttendanceAnalytics } from './AttendanceAnalytics';
import { StudentTransportTracker } from './StudentTransportTracker';

const ChildCard: React.FC<{ child: User, course?: Course, attendances: StudentAttendance[], timetable: TimetableEntry[], subjects: Subject[] }> = ({ child, course, attendances, timetable, subjects }) => {
    const childAttendances = attendances.filter(a => a.studentId === child.id);
    const totalLessons = timetable.filter(t => child.enrolledSubjectIds?.includes(t.subjectId)).length;
    const presentCount = childAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalLessons > 0 ? (presentCount / totalLessons) * 100 : 100;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                    <h4 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">{child.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{course?.name || 'N/A'}</p>
                </div>
            </div>
            <div className="mt-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Academic Summary</h5>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enrolled Subjects</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{child.enrolledSubjectIds?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance Rate</p>
                        <p className={`text-2xl font-black ${attendanceRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{attendanceRate.toFixed(0)}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeaveOutManager: React.FC<{
    child: User,
    requests: LeaveOutRequest[],
    onUpdate?: (id: string, data: Partial<LeaveOutRequest>) => Promise<void>
}> = ({ child, requests, onUpdate }) => {
    const childRequests = requests.filter(r => r.studentId === child.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (childRequests.length === 0) return null;

    const activeRequest = childRequests.find(r => r.status !== 'cancelled' && r.status !== 'pending_boarding');
    if (!activeRequest) return null;

    return (
        <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                Leave Out / Exeat Management
            </h5>

            <div className={`p-6 rounded-[2rem] border transition-all ${activeRequest.status === 'checked_out' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeRequest.reason}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(activeRequest.leaveDate).toLocaleDateString()} - {new Date(activeRequest.returnDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${activeRequest.status === 'checked_out' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-100'
                        }`}>
                        {activeRequest.status.replace('_', ' ')}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Home Arrival */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Safe Arrival Alert</p>
                        {activeRequest.homeArrivalAt ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black uppercase tracking-tight text-emerald-600 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    Confirmed At Home
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged: {new Date(activeRequest.homeArrivalAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onUpdate?.(activeRequest.id, { homeArrivalAt: new Date().toISOString() })}
                                disabled={activeRequest.status !== 'checked_out'}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                                Confirm Arrival
                            </button>
                        )}
                    </div>

                    {/* Home Departure */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Return To School Alert</p>
                        {activeRequest.homeDepartureAt ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black uppercase tracking-tight text-indigo-600 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                    Departure Confirmed
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged: {new Date(activeRequest.homeDepartureAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onUpdate?.(activeRequest.id, { homeDepartureAt: new Date().toISOString() })}
                                disabled={!activeRequest.homeArrivalAt}
                                className="w-full h-12 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 transition-all active:scale-95"
                            >
                                Confirm Departure
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ParentView: React.FC<ParentViewProps> = (props) => {
    const { user, users, courses, studentAttendances, generatedTimetable, subjects } = props;
    const children = users.filter(u => user.studentIds?.includes(u.id));

    return (
        <div className="space-y-10 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Family Dashboard</h2>
                    <p className="text-slate-500 font-medium">Monitoring academic progress and safety for your children.</p>
                </div>
            </div>

            <div className="space-y-8">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-indigo-500" />
                    My Children ({children.length})
                </h3>

                {children.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {children.map(child => {
                            const course = courses.find(c => c.id === child.courseId);
                            return (
                                <div key={child.id} className="space-y-6">
                                    <ChildCard
                                        child={child}
                                        course={course}
                                        attendances={studentAttendances}
                                        timetable={generatedTimetable}
                                        subjects={subjects}
                                    />
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <AttendanceAnalytics
                                            timetable={generatedTimetable}
                                            studentAttendances={studentAttendances}
                                            studentCheckIns={props.studentCheckIns}
                                            users={users}
                                            subjects={subjects}
                                            institutionId={user.institutionId}
                                            studentId={child.id}
                                        />
                                    </div>

                                    {props.transportOnboarding && (
                                        <div className="mt-6">
                                            {(() => {
                                                const activeRecord = props.transportOnboarding.find(r => r.studentId === child.id && r.status !== 'received');
                                                const vehicle = props.vehicles?.find(v => v.id === activeRecord?.vehicleId);
                                                const driver = props.users?.find(u => u.id === vehicle?.driverId);
                                                const assistant = props.users?.find(u => u.id === vehicle?.assistantId);

                                                return (
                                                    <StudentTransportTracker
                                                        student={child}
                                                        activeOnboarding={activeRecord}
                                                        assignedVehicle={vehicle}
                                                        driver={driver}
                                                        assistant={assistant}
                                                        onConfirmReceipt={props.onConfirmTransport!}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    )}
                                    <LeaveOutManager
                                        child={child}
                                        requests={props.leaveOutRequests || []}
                                        onUpdate={props.onUpdateLeaveOut}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <UserIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm">No linked accounts found</p>
                        <p className="text-slate-400 text-xs mt-2">Please contact the administration to link your children to this portal.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
