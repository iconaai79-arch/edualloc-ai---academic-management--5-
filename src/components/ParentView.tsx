import React, { useState } from 'react';
import type {
    User, Course, StudentAttendance, TimetableEntry,
    Subject, Room, Building, TimetableSettings, LeaveOutRequest, TransportOnboarding, TransportVehicle,
    Assessment, AssessmentMark
} from '../types';
import { UserIcon } from './icons/UserIcon';
import { SynergyHub } from './SynergyHub';
import { Sparkles, Home, Receipt, BadgeCheck, Clock, AlertCircle, Truck } from 'lucide-react';
import { TransportDisruptionAlert } from './TransportDisruptionAlert';
import type { TransportDisruption } from './TransportDisruptionAlert';
import type { TransportFeeInvoice } from './TransportBillingManager';


interface ParentViewProps {
    user?: User;
    users?: User[];
    courses?: Course[];
    studentAttendances?: StudentAttendance[];
    generatedTimetable?: TimetableEntry[];
    subjects?: Subject[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    timetableSettings?: TimetableSettings;
    buildings?: Building[];
    studentCheckIns?: Record<string, string>;
    leaveOutRequests?: LeaveOutRequest[];
    onUpdateLeaveOut?: (id: string, data: Partial<LeaveOutRequest>) => Promise<void>;
    transportOnboarding?: TransportOnboarding[];
    vehicles?: TransportVehicle[];
    onConfirmTransport?: (recordId: string) => Promise<void>;
    assessments?: Assessment[];
    assessmentMarks?: AssessmentMark[];
    onAddAssessment?: (data: any) => Promise<void>;
    onDeleteAssessment?: (id: string) => Promise<void>;
    onAccessAlumnaPortal?: (school: any) => void;
    transportAlerts?: TransportDisruption[];
    onAcknowledgeAlert?: (id: string, parentId: string) => void;
    transportInvoices?: TransportFeeInvoice[];
    isSimulatorMode?: boolean;
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
    const { 
        user, 
        users = [], 
        courses = [], 
        studentAttendances = [], 
        generatedTimetable = [], 
        subjects = [],
        getSubjectById = () => undefined,
        getLecturerById = () => undefined,
        getRoomById = () => undefined,
        timetableSettings = {} as any,
        buildings = [],
        studentCheckIns = {},
        leaveOutRequests = [],
        onAccessAlumnaPortal = () => {}
    } = props;
    const isSimulator = props.isSimulatorMode || user?.id?.startsWith('demo_') || user?.id?.startsWith('temp_admin_') || user?.institutionId?.startsWith('demo_') || user?.role === 'super_admin';

    const demoChildUser: User = {
        id: 'demo_student_1',
        name: 'Alex Mwangi',
        role: 'student',
        institutionId: user?.institutionId || 'demo_inst',
        email: 'alex@demo.edu',
        studentIds: [],
        enrolledSubjectIds: ['sub_1', 'sub_2'],
        courseId: 'course_1',
        admissionNumber: 'ADM-001',
    };

    const children = users.filter(u => u && user?.studentIds?.includes(u.id));
    const effectiveChildren = children.length > 0 
        ? children 
        : (isSimulator ? [demoChildUser] : []);

    const [activePanel, setActivePanel] = useState<'dashboard' | 'synergy' | 'transport'>('dashboard');

    // ── Simulator / demo fallback data ────────────────────────────────────────
    // When no real transport data is present (e.g. parent_portal simulator),
    // synthesize demo records so all transport sections render visibly.
    const demoChild = effectiveChildren[0];

    const effectiveTransportOnboarding: TransportOnboarding[] = (props.transportOnboarding && props.transportOnboarding.length > 0)
        ? props.transportOnboarding
        : (isSimulator && demoChild ? [{
            id: `sim_ton_${demoChild.id}`,
            studentId: demoChild.id,
            studentName: demoChild.name,
            vehicleId: 'sim_vehicle_1',
            routeId: 'sim_route_1',
            routeName: 'Nairobi CBD – School Gate',
            preference: 'round_trip',
            status: 'boarded',
            boardedAt: new Date(Date.now() - 30 * 60000).toISOString(),
            institutionId: user?.institutionId || '',
            createdAt: new Date().toISOString(),
        }] : []);

    const effectiveVehicles: TransportVehicle[] = (props.vehicles && props.vehicles.length > 0)
        ? props.vehicles
        : (isSimulator ? [{
            id: 'sim_vehicle_1',
            plateNumber: 'KBZ 001T',
            capacity: 45,
            model: 'Toyota Coaster',
            institutionId: user?.institutionId || '',
            driverId: 'sim_driver_1',
            assistantId: undefined,
            status: 'active',
        }] : []);

    const effectiveDrivers: User[] = isSimulator
        ? [{ id: 'sim_driver_1', name: 'John Mwangi', role: 'driver', institutionId: user?.institutionId || '', phoneNumber: '0712 345 678', email: 'driver@sim.co.ke' }]
        : [];

    const effectiveTransportAlerts = (props.transportAlerts && props.transportAlerts.length > 0)
        ? props.transportAlerts
        : (isSimulator ? [{
            id: 'sim_alert_1',
            institutionId: user?.institutionId || '',
            title: 'Route Change – Route 3 (CBD–Westlands)',
            message: 'Bus KBZ 001T has been reassigned to cover Route 5 due to a mechanical issue. Students on Route 3 will board Bus KBZ 022Y at the usual stops from 4:00 PM today. Alternative arrangements are in place. Please confirm pickup with the school gate.',
            reason: 'reassigned' as const,
            incidentType: 'route_change' as any,
            affectedRoutes: ['Route 3 – CBD to Westlands'],
            status: 'active' as const,
            createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
            createdBy: 'transport_admin',
            acknowledgedBy: [],
        }] : []);

    const effectiveTransportInvoices = (props.transportInvoices && props.transportInvoices.length > 0)
        ? props.transportInvoices
        : (isSimulator && demoChild ? [{
            id: 'sim_inv_1',
            studentId: demoChild.id,
            studentName: demoChild.name,
            admissionNumber: demoChild.admissionNumber || 'ADM-001',
            routeId: 'sim_route_1',
            routeName: 'Nairobi CBD – School Gate',
            preference: 'round_trip' as const,
            billingCycle: 'term' as const,
            period: 'Term 1 2025',
            baseAmount: 12000,
            finalAmount: 12000,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
            status: 'pending' as const,
            institutionId: user?.institutionId || '',
            createdAt: new Date().toISOString(),
        }] : []);


    return (
        <div className="space-y-10 py-6">
            {/* Contextual Navigation Bar */}
            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2 flex justify-between items-center">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActivePanel('dashboard')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'dashboard' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Home className="w-4 h-4 text-indigo-500" />
                        Family Dashboard
                    </button>
                    <button
                        onClick={() => setActivePanel('transport')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'transport' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Truck className="w-4 h-4 text-orange-500" />
                        Transport Tracker
                    </button>
                    <button
                        onClick={() => setActivePanel('synergy')}
                        className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                            activePanel === 'synergy' ? 'border-indigo-650 text-indigo-650' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        EduAI Synergy Hub
                    </button>
                </nav>
            </div>

            {activePanel === 'dashboard' ? (
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Family Dashboard</h2>
                            <p className="text-slate-500 font-medium">Monitoring academic progress and safety for your children.</p>
                        </div>
                    </div>

            <div className="space-y-8">

                {/* Transport Disruption Alert Banner */}
                {effectiveTransportAlerts.filter(a => a.status === 'active').length > 0 && (
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Transport Alert — Action Required</p>
                        </div>
                        <TransportDisruptionAlert
                            mode="parent"
                            alerts={effectiveTransportAlerts}
                            onAcknowledge={props.onAcknowledgeAlert}
                            parentId={user?.id || 'parent_user'}
                            parentChildRoutes={[]}
                        />
                    </div>
                )}

                {/* Transport Fee Invoice Status */}
                {effectiveTransportInvoices.length > 0 && (() => {
                    const childIds = effectiveChildren.map(c => c.id);
                    const myInvoices = effectiveTransportInvoices.filter(i => childIds.includes(i.studentId) || isSimulator);
                    if (myInvoices.length === 0) return null;
                    return (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-center gap-3">
                                <Receipt className="w-5 h-5 text-indigo-500" />
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Transport Fee Invoices</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{myInvoices.length} invoice{myInvoices.length !== 1 ? 's' : ''} for your children</p>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                {myInvoices.map(inv => {
                                    const isPaid = inv.status === 'paid';
                                    const isOverdue = inv.status === 'overdue';
                                    return (
                                        <div key={inv.id} className="p-5 flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                isPaid ? 'bg-emerald-50 dark:bg-emerald-950/30' : isOverdue ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                                            }`}>
                                                {isPaid ? <BadgeCheck className="w-5 h-5 text-emerald-600" /> : isOverdue ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inv.routeName.split('–')[0]?.trim()}</span>
                                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{inv.period}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">KES {inv.finalAmount.toLocaleString()}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-amber-600'
                                                }`}>{inv.status}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {myInvoices.some(i => i.status === 'pending' || i.status === 'overdue') && (
                                <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 border-t border-indigo-100 dark:border-indigo-900">
                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Please make payment at the school finance office or via M-Pesa Paybill. Contact the bursar for queries.</p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-indigo-500" />
                    My Children ({effectiveChildren.length})
                </h3>

                {effectiveChildren.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {effectiveChildren.map(child => {
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
                                            studentCheckIns={props.studentCheckIns ?? {}}
                                            users={users}
                                            subjects={subjects}
                                            institutionId={user?.institutionId ?? ''}
                                            studentId={child.id}
                                        />
                                    </div>

                                    {effectiveTransportOnboarding.length > 0 && (
                                        <div className="mt-6">
                                            {(() => {
                                                const activeRecord = effectiveTransportOnboarding.find(r => r.studentId === child.id && r.status !== 'received');
                                                const vehicle = effectiveVehicles.find(v => v.id === activeRecord?.vehicleId);
                                                const driver = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.driverId);
                                                const assistant = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.assistantId);

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
            </>
            ) : activePanel === 'transport' ? (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Transport Tracker</h2>
                            <p className="text-slate-500 font-medium">Real-time school bus tracking, route alerts, and billing statements.</p>
                        </div>
                    </div>

                    {/* Transport Disruption Alert Banner */}
                    {effectiveTransportAlerts.filter(a => a.status === 'active').length > 0 && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                </span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Transport Alert — Action Required</p>
                            </div>
                            <TransportDisruptionAlert
                                mode="parent"
                                alerts={effectiveTransportAlerts}
                                onAcknowledge={props.onAcknowledgeAlert}
                                parentId={user?.id || 'parent_user'}
                                parentChildRoutes={[]}
                            />
                        </div>
                    )}

                    {/* Transport Fee Invoice Status */}
                    {effectiveTransportInvoices.length > 0 && (() => {
                        const childIds = effectiveChildren.map(c => c.id);
                        const myInvoices = effectiveTransportInvoices.filter(i => childIds.includes(i.studentId) || isSimulator);
                        if (myInvoices.length === 0) return null;
                        return (
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-center gap-3">
                                    <Receipt className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Transport Fee Invoices</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{myInvoices.length} invoice{myInvoices.length !== 1 ? 's' : ''} for your children</p>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {myInvoices.map(inv => {
                                        const isPaid = inv.status === 'paid';
                                        const isOverdue = inv.status === 'overdue';
                                        return (
                                            <div key={inv.id} className="p-5 flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                    isPaid ? 'bg-emerald-50 dark:bg-emerald-950/30' : isOverdue ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                                                }`}>
                                                    {isPaid ? <BadgeCheck className="w-5 h-5 text-emerald-600" /> : isOverdue ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inv.routeName.split('–')[0]?.trim()}</span>
                                                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{inv.period}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">KES {inv.finalAmount.toLocaleString()}</p>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                        isPaid ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-amber-600'
                                                    }`}>{inv.status}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {myInvoices.some(i => i.status === 'pending' || i.status === 'overdue') && (
                                    <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 border-t border-indigo-100 dark:border-indigo-900">
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Please make payment at the school finance office or via M-Pesa Paybill. Contact the bursar for queries.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Tracker details per child */}
                    {effectiveChildren.length > 0 ? (
                        <div className="grid grid-cols-1 gap-8">
                            {effectiveChildren.map(child => {
                                const activeRecord = effectiveTransportOnboarding.find(r => r.studentId === child.id && r.status !== 'received');
                                const vehicle = effectiveVehicles.find(v => v.id === activeRecord?.vehicleId);
                                const driver = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.driverId);
                                const assistant = [...users, ...effectiveDrivers].find(u => u.id === vehicle?.assistantId);

                                return (
                                    <div key={child.id} className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-orange-500 rounded-full"></div>
                                            <h4 className="font-black text-md text-slate-800 dark:text-white uppercase tracking-wider">{child.name}'s Status</h4>
                                        </div>
                                        <StudentTransportTracker
                                            student={child}
                                            activeOnboarding={activeRecord}
                                            assignedVehicle={vehicle}
                                            driver={driver}
                                            assistant={assistant}
                                            onConfirmReceipt={props.onConfirmTransport!}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-400 text-xs font-medium">No children linked to retrieve transport tracking details.</p>
                        </div>
                    )}
                </div>
            ) : (
                <SynergyHub
                    role="parent"
                    currentUser={user!}
                    users={users}
                    subjects={subjects}
                    courses={courses}
                    studentAttendances={studentAttendances}
                    assessments={props.assessments || []}
                    assessmentMarks={props.assessmentMarks || []}
                />
            )}
        </div>
    );
};

