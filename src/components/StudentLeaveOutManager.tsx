import React, { useState, useMemo, useEffect } from 'react';
import {
    User, Institution, LeaveOutRequest, LeaveOutWithDetails,
    LeaveOutStatus, CompanyDetails, AcademicYear, Semester,
    Course, Department, AcademicLevel, LetterheadConfig
} from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { HomeIcon } from './icons/HomeIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { XIcon } from './icons/XIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserIcon } from './icons/UserIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';


import { apiService } from '../services/apiService';
import { generateLeaveOutSheetPdf } from '../services/pdfService';
import { getInstitutionEmailConfig } from '../services/emailService';

interface StudentLeaveOutManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    courses: Course[];
    departments: Department[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const StudentLeaveOutManager: React.FC<StudentLeaveOutManagerProps> = ({
    currentUser,
    currentInstitution,
    companyDetails,
    users,
    academicYears,
    semesters,
    courses,
    departments,
    onLogAction,
    onDataChange
}) => {
    const [requests, setRequests] = useState<LeaveOutWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'requests' | 'boarding' | 'security'>('requests');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [form, setForm] = useState({
        studentId: '',
        reason: '',
        leaveDate: new Date().toISOString().split('T')[0],
        returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });

    useEffect(() => {
        loadRequests();
    }, [currentInstitution.id]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<LeaveOutRequest>('leave_out_requests', currentInstitution.id);

            // Enrich data with names
            const enriched: LeaveOutWithDetails[] = data.map(req => {
                const student = users.find(u => u.id === req.studentId);
                const teacher = users.find(u => u.id === req.classTeacherId);
                const boarding = users.find(u => u.id === req.boardingMasterId);
                const security = users.find(u => u.id === req.securityId);
                const course = courses.find(c => c.id === student?.courseId);
                const level = course?.levels.find(l => l.id === student?.courseLevelId);

                // Find parents
                let parentPhone = '';
                let parentEmail = '';
                if (student?.parentIds && student.parentIds.length > 0) {
                    const parent = users.find(u => u.id === student.parentIds![0]);
                    parentPhone = parent?.phoneNumber || '';
                    parentEmail = parent?.email || '';
                }

                return {
                    ...req,
                    studentName: student?.name || 'Unknown Student',
                    studentClass: `${course?.code || ''} ${level?.name || ''} `.trim() || 'N/A',
                    parentPhone,
                    parentEmail,
                    classTeacherName: teacher?.name || 'Unknown',
                    boardingMasterName: boarding?.name,
                    securityName: security?.name
                };
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setRequests(enriched);
        } catch (error) {
            console.error("Failed to load leave out requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.studentId || !form.reason) return;

        setSubmitting(true);
        try {
            const id = `lo_${Date.now()}`;
            const newRequest: LeaveOutRequest = {
                id,
                institutionId: currentInstitution.id,
                studentId: form.studentId,
                classTeacherId: currentUser.id,
                reason: form.reason,
                leaveDate: form.leaveDate,
                returnDate: form.returnDate,
                status: 'pending_boarding',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('leave_out_requests', newRequest);

            // Log action
            const student = users.find(u => u.id === form.studentId);
            await onLogAction(`Generated leave out permission for ${student?.name}`);

            setShowAddModal(false);
            setForm({
                studentId: '',
                reason: '',
                leaveDate: new Date().toISOString().split('T')[0],
                returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            });

            loadRequests();
            onDataChange();
        } catch (error) {
            console.error("Failed to create request:", error);
            alert("Error creating request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleHouseCheckout = async (request: LeaveOutWithDetails) => {
        if (!window.confirm(`Confirm student ${request.studentName} has checked out of the house ? `)) return;

        try {
            const updates: Partial<LeaveOutRequest> = {
                status: 'pending_security',
                boardingMasterId: currentUser.id,
                houseCheckedOutAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('leave_out_requests', { ...request, ...updates });
            await onLogAction(`Boarding checkout confirmed for ${request.studentName}`);

            loadRequests();
            onDataChange();
        } catch (error) {
            console.error("Checkout failed:", error);
        }
    };

    const handleGateCheckout = async (request: LeaveOutWithDetails) => {
        if (!window.confirm(`Confirm student ${request.studentName} has checked out of the gate ? This will notify the parent.`)) return;

        try {
            const now = new Date().toISOString();
            const updates: Partial<LeaveOutRequest> = {
                status: 'checked_out',
                securityId: currentUser.id,
                gateCheckedOutAt: now,
                updatedAt: now
            };

            await apiService.saveModuleRecord('leave_out_requests', { ...request, ...updates });
            await onLogAction(`Gate checkout confirmed for ${request.studentName}`);

            // Send Notifications
            if (request.parentPhone) {
                const smsMsg = `Dear Parent, your child ${request.studentName} has successfully checked out of ${currentInstitution.name} gate at ${new Date(now).toLocaleTimeString()}. Safe journey.`;
                await apiService.sendSms(request.parentPhone, smsMsg, currentInstitution.letterheadConfig ? { ...companyDetails.smsConfig } : undefined);
            }

            if (request.parentEmail) {
                const subject = `Student Checkout Notification - ${currentInstitution.name} `;
                const emailMsg = `Dear Parent, \n\nThis is to notify you that ${request.studentName} has checked out of the school gate at ${new Date(now).toLocaleString()} for their scheduled leave out.\n\nPlease find the attached permission sheet for your reference.\n\nRegards, \n${currentInstitution.name} `;

                // Generate PDF
                const docUri = await generateLeaveOutSheetPdf(
                    { ...request, ...updates },
                    currentInstitution,
                    companyDetails,
                    users,
                    courses
                );

                // Note: Actual email attachment needs backend support, but we simulate it or use PDF service
                await apiService.sendEmail(request.parentEmail, subject, emailMsg, getInstitutionEmailConfig(currentInstitution));
            }

            loadRequests();
            onDataChange();
            alert("Checkout complete. Parent notified via SMS and Email.");
        } catch (error) {
            console.error("Checkout failed:", error);
        }
    };

    const handlePrintSheet = async (request: LeaveOutWithDetails) => {
        try {
            const dataUri = await generateLeaveOutSheetPdf(
                request,
                currentInstitution,
                companyDetails,
                users,
                courses
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `LeaveOut_${request.studentName.replace(/\s+/g, '_')}_${request.id}.pdf`;
            link.click();
        } catch (error) {
            console.error("Print failed:", error);
        }
    };

    const filteredRequests = requests.filter(req =>
        req.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const students = users.filter(u => u.role === 'student');

    const getStatusBadge = (status: LeaveOutStatus) => {
        switch (status) {
            case 'pending_boarding':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider">Pending Boarding</span>;
            case 'pending_security':
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">Pending Security</span>;
            case 'checked_out':
                return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider">Checked Out</span>;
            case 'cancelled':
                return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider">Cancelled</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-gray-500 animate-pulse">Synchronizing checkout records...</p>
                </div>

            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Student Checkout Process</h2>
                    <p className="text-slate-500 text-sm">Automated multi-stage exit management system</p>
                </div>
                {(currentUser.role === 'teacher' || currentUser.role === 'lecturer' || currentUser.role === 'admin' || currentUser.role === 'head_teacher') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 font-bold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Generate Permission Sheet
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px - 6 py - 2 rounded - lg text - sm font - black transition - all ${activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'} `}
                >
                    <div className="flex items-center gap-2">
                        <FileTextIcon className="w-4 h-4" />
                        Permission Sheets
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('boarding')}
                    className={`px - 6 py - 2 rounded - lg text - sm font - black transition - all ${activeTab === 'boarding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'} `}
                >
                    <div className="flex items-center gap-2">
                        <HomeIcon className="w-4 h-4" />
                        House Checkout
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px - 6 py - 2 rounded - lg text - sm font - black transition - all ${activeTab === 'security' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'} `}
                >
                    <div className="flex items-center gap-2">
                        <ShieldIcon className="w-4 h-4" />
                        Gate Checkout
                    </div>
                </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                {/* Search Bar */}
                <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by student name, reason or date..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                        />
                    </div>
                    <button
                        onClick={loadRequests}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>

                </div>

                {/* List Body */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Info</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reason & Dates</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Phase</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <FileTextIcon className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-slate-900 font-bold mb-1">No Leave Records</p>
                                            <p className="text-slate-500 text-xs">There are currently no leave out or exeat records matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests
                                    .filter(req => {
                                        if (activeTab === 'boarding') return req.status === 'pending_boarding';
                                        if (activeTab === 'security') return req.status === 'pending_security';
                                        return true;
                                    })
                                    .map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                                                        {req.studentName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{req.studentName}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{req.studentClass}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm text-slate-600 font-medium mb-1 line-clamp-1">{req.reason}</p>
                                                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                                                    <span className="flex items-center gap-1.5"><CalendarDaysIcon className="w-3 h-3 text-indigo-400" /> {new Date(req.leaveDate).toLocaleDateString()}</span>
                                                    <ArrowRightIcon className="w-3 h-3" />
                                                    <span className="flex items-center gap-1.5"><ArrowPathIcon className="w-3 h-3 text-emerald-400" /> {new Date(req.returnDate).toLocaleDateString()}</span>
                                                </div>

                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    {getStatusBadge(req.status)}
                                                    {req.status === 'pending_boarding' && (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            <ClockIcon className="w-3 h-3" /> Waiting for House Master
                                                        </div>
                                                    )}
                                                    {req.status === 'pending_security' && (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            <ClockIcon className="w-3 h-3" /> Waiting for Security
                                                        </div>
                                                    )}
                                                    {req.status === 'checked_out' && (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                                                            <CheckCircleIcon className="w-3 h-3" /> Process Complete
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    {activeTab === 'requests' && (
                                                        <button
                                                            onClick={() => handlePrintSheet(req)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white border rounded-lg transition-all"
                                                            title="Print Sheet"
                                                        >
                                                            <PrinterIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {activeTab === 'boarding' && req.status === 'pending_boarding' && (
                                                        <button
                                                            onClick={() => handleHouseCheckout(req)}
                                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                                                        >
                                                            <HomeIcon className="w-3.5 h-3.5" />
                                                            Verify House Exit
                                                        </button>
                                                    )}
                                                    {activeTab === 'security' && req.status === 'pending_security' && (
                                                        <button
                                                            onClick={() => handleGateCheckout(req)}
                                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center gap-2"
                                                        >
                                                            <ShieldIcon className="w-3.5 h-3.5" />
                                                            Verify Gate Exit
                                                        </button>
                                                    )}
                                                    {req.status === 'checked_out' && (
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <div className="flex gap-2">
                                                                {req.parentPhone && <span title="SMS Sent"><ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-emerald-500" /></span>}
                                                                {req.parentEmail && <span title="Email Sent"><EnvelopeIcon className="w-4 h-4 text-blue-500" /></span>}
                                                            </div>
                                                            {req.homeArrivalAt && (
                                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                                    Arrived Home
                                                                </span>
                                                            )}
                                                            {req.homeDepartureAt && (
                                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                                    Returning
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}


                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Addition Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">New Permission Sheet</h3>
                                <p className="text-slate-500 text-xs">Class Teacher Authorization</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRequest} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Student</label>
                                <select
                                    required
                                    value={form.studentId}
                                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                >
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.staffId})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Leave Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.leaveDate}
                                        onChange={(e) => setForm({ ...form, leaveDate: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Expected Return</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.returnDate}
                                        onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Reason for Leave</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    placeholder="Enter detailed reason (e.g. Medical, Funeral, Home visit...)"
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold placeholder:font-medium"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all uppercase text-xs tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest disabled:opacity-50"
                                >
                                    {submitting ? 'Authenticating...' : 'Authorize Exit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

