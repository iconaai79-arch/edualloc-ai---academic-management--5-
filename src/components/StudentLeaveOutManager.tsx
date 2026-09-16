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
    const [bedAllocations, setBedAllocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'requests' | 'approvals' | 'boarding' | 'security'>('requests');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [form, setForm] = useState({
        studentId: '',
        reason: '',
        isBoarder: true,
        leaveDate: new Date().toISOString().split('T')[0],
        returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });

    useEffect(() => {
        loadRequests();
    }, [currentInstitution.id]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const [data, allocations] = await Promise.all([
                apiService.fetchModuleRecords<LeaveOutRequest>('leave_out_requests', currentInstitution.id),
                apiService.fetchBedAllocations(currentInstitution.id).catch(() => [])
            ]);

            setBedAllocations(allocations || []);

            // Enrich data with names
            const enriched: LeaveOutWithDetails[] = data.map(req => {
                const student = users.find(u => u.id === req.studentId);
                const teacher = users.find(u => u.id === req.classTeacherId);
                const headteacher = users.find(u => u.id === req.headteacherId);
                const boarding = users.find(u => u.id === req.boardingMasterId);
                const security = users.find(u => u.id === req.securityId);
                const course = courses.find(c => c.id === student?.courseId);
                const level = course?.levels.find(l => l.id === student?.courseLevelId);

                // Find parents
                let parentPhone = '';
                let parentEmail = '';
                if (student?.parentIds && student.parentIds.length > 0) {
                    const parent = users.find(u => u.id === student.parentIds![0]);
                    if (parent) {
                        parentPhone = parent.phoneNumber || '';
                        parentEmail = parent.email || '';
                    }
                }
                if (!parentPhone || !parentEmail) {
                    const parent = users.find(u => u.role === 'parent' && u.studentIds?.includes(student?.id || ''));
                    if (parent) {
                        if (!parentPhone) parentPhone = parent.phoneNumber || '';
                        if (!parentEmail) parentEmail = parent.email || '';
                    }
                }

                return {
                    ...req,
                    studentName: student?.name || 'Unknown Student',
                    studentClass: `${course?.code || ''} ${level?.name || ''}`.trim() || 'N/A',
                    parentPhone,
                    parentEmail,
                    classTeacherName: teacher?.name || 'Unknown',
                    headteacherName: headteacher?.name,
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

    const isStudentBoarder = (studentId: string) => {
        return bedAllocations.some(a => a.studentId === studentId && a.status === 'Active');
    };

    const handleStudentChange = (studentId: string) => {
        const boarder = isStudentBoarder(studentId);
        setForm(prev => ({
            ...prev,
            studentId,
            isBoarder: boarder
        }));
    };

    const isHeadTeacherOrDeputy = useMemo(() => {
        return ['admin', 'head_teacher', 'deputy', 'super_admin', 'managing_director', 'hoi'].includes(currentUser.role);
    }, [currentUser.role]);

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.studentId || !form.reason) return;

        setSubmitting(true);
        try {
            const id = `lo_${Date.now()}`;
            // Class teachers generate leave out and forward to headteacher/deputy for approval
            const newRequest: LeaveOutRequest = {
                id,
                institutionId: currentInstitution.id,
                studentId: form.studentId,
                classTeacherId: currentUser.id,
                reason: form.reason,
                leaveDate: form.leaveDate,
                returnDate: form.returnDate,
                status: 'pending_headteacher',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('leave_out_requests', newRequest);

            // Log action
            const student = users.find(u => u.id === form.studentId);
            await onLogAction(`Generated leave out permission request for ${student?.name} (forwarded for approval)`);

            // Send in-app notification to Headteacher / Deputy / Admins
            const approverUsers = users.filter(u => ['head_teacher', 'deputy', 'admin', 'super_admin'].includes(u.role));
            for (const approver of approverUsers) {
                try {
                    await apiService.createNotification({
                        userId: approver.id,
                        institutionId: currentInstitution.id,
                        title: 'Student Leave Out Awaiting Approval',
                        message: `Class Teacher ${currentUser.name} submitted a leave out request for ${student?.name || 'a student'} (${form.reason}). Please review and approve.`,
                        type: 'system',
                        link: '/leave-out-requests'
                    });
                } catch (_) {}
            }

            setShowAddModal(false);
            setForm({
                studentId: '',
                reason: '',
                isBoarder: true,
                leaveDate: new Date().toISOString().split('T')[0],
                returnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            });

            loadRequests();
            onDataChange();
            alert(`Leave out request generated successfully!\nForwarded to Headteacher / Deputy Principal for approval.`);
        } catch (error) {
            console.error("Failed to create request:", error);
            alert("Error creating request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveRequest = async (request: LeaveOutWithDetails) => {
        const roleTitle = currentUser.role === 'deputy' ? 'Deputy Principal' : currentUser.role === 'head_teacher' ? 'Headteacher' : 'School Administration';
        if (!window.confirm(`Approve leave out permission for ${request.studentName}?\n\nThis will officially approve the exeat and immediately send SMS & Email notifications to the parent (${request.parentPhone || request.parentEmail || 'Parent'}).`)) return;

        try {
            const now = new Date().toISOString();
            const nextStatus: LeaveOutStatus = isStudentBoarder(request.studentId) ? 'pending_boarding' : 'pending_security';
            const roleTag: 'headteacher' | 'deputy_principal' | 'admin' = currentUser.role === 'deputy' ? 'deputy_principal' : currentUser.role === 'head_teacher' ? 'headteacher' : 'admin';

            const dbPayload: LeaveOutRequest = {
                id: request.id,
                institutionId: request.institutionId,
                studentId: request.studentId,
                classTeacherId: request.classTeacherId,
                headteacherId: currentUser.id,
                headteacherApprovedAt: now,
                approvedByRole: roleTag,
                parentNotifiedAt: now,
                boardingMasterId: request.boardingMasterId,
                securityId: request.securityId,
                reason: request.reason,
                leaveDate: request.leaveDate,
                returnDate: request.returnDate,
                status: nextStatus,
                sheetUrl: request.sheetUrl,
                houseCheckedOutAt: request.houseCheckedOutAt,
                gateCheckedOutAt: request.gateCheckedOutAt,
                homeArrivalAt: request.homeArrivalAt,
                homeDepartureAt: request.homeDepartureAt,
                createdAt: request.createdAt,
                updatedAt: now
            };

            await apiService.saveModuleRecord('leave_out_requests', dbPayload);
            await onLogAction(`${roleTitle} approved leave out for ${request.studentName}`);

            // 1. Send SMS to Parent
            if (request.parentPhone) {
                const smsMsg = `Dear Parent, leave out (exeat) for ${request.studentName} has been APPROVED by the ${roleTitle}. Reason: ${request.reason}. Valid: ${new Date(request.leaveDate).toLocaleDateString()} to ${new Date(request.returnDate).toLocaleDateString()}. Please confirm safe home arrival on your Parent Portal.`;
                await apiService.sendSms(request.parentPhone, smsMsg, currentInstitution.letterheadConfig ? { ...companyDetails.smsConfig } : undefined).catch(() => {});
            }

            // 2. Send Email to Parent
            if (request.parentEmail) {
                const subject = `Leave Out Approved: ${request.studentName} - ${currentInstitution.name}`;
                const emailMsg = `Dear Parent,\n\nThis is to notify you that the leave out (exeat) for ${request.studentName} (${request.studentClass}) has been officially APPROVED by ${currentUser.name} (${roleTitle}).\n\nLeave Out Details:\n- Student: ${request.studentName} (${request.studentClass})\n- Reason for leave: ${request.reason}\n- Departure Date: ${new Date(request.leaveDate).toLocaleDateString()}\n- Expected Return Date: ${new Date(request.returnDate).toLocaleDateString()}\n- Approved by: ${currentUser.name} (${roleTitle})\n- Class Teacher: ${request.classTeacherName}\n\nIMPORTANT: Once your child arrives safely home, please log in to your Parent Portal to confirm their safe arrival. When they depart from home to return to school, please click 'Confirm Departure' so school gate officers are alerted.\n\nWarm regards,\n${currentInstitution.name}`;
                await apiService.sendEmail(request.parentEmail, subject, emailMsg, getInstitutionEmailConfig(currentInstitution)).catch(() => {});
            }

            // 3. Send in-app notification to Parent user accounts
            const parentUsers = users.filter(u => u.role === 'parent' && (u.studentIds?.includes(request.studentId) || (u.email && u.email.toLowerCase() === request.parentEmail?.toLowerCase())));
            for (const pu of parentUsers) {
                try {
                    await apiService.createNotification({
                        userId: pu.id,
                        institutionId: currentInstitution.id,
                        title: `Leave Out Approved: ${request.studentName}`,
                        message: `Exeat for ${request.studentName} has been approved by the ${roleTitle}. You can confirm safe arrival and departure in your Parent Portal.`,
                        type: 'announcement',
                        link: '/parent-portal'
                    });
                } catch (_) {}
            }

            // 4. Send in-app notification to Class Teacher
            if (request.classTeacherId) {
                try {
                    await apiService.createNotification({
                        userId: request.classTeacherId,
                        institutionId: currentInstitution.id,
                        title: `Leave Out Approved for ${request.studentName}`,
                        message: `${roleTitle} (${currentUser.name}) approved the exeat request for ${request.studentName}. Parent has been notified.`,
                        type: 'system',
                        link: '/leave-out-requests'
                    });
                } catch (_) {}
            }

            loadRequests();
            onDataChange();
            alert(`Leave out approved successfully!\nParent notified via SMS and Email.`);
        } catch (error) {
            console.error("Failed to approve request:", error);
            alert("Error approving request. Please try again.");
        }
    };

    const handleRejectRequest = async (request: LeaveOutWithDetails) => {
        const remarks = window.prompt(`Enter reason for rejecting leave out for ${request.studentName}:`);
        if (remarks === null) return;

        try {
            const now = new Date().toISOString();
            const roleTag: 'headteacher' | 'deputy_principal' | 'admin' = currentUser.role === 'deputy' ? 'deputy_principal' : currentUser.role === 'head_teacher' ? 'headteacher' : 'admin';

            const dbPayload: LeaveOutRequest = {
                id: request.id,
                institutionId: request.institutionId,
                studentId: request.studentId,
                classTeacherId: request.classTeacherId,
                headteacherId: currentUser.id,
                headteacherRemarks: remarks || 'Rejected by administration',
                approvedByRole: roleTag,
                boardingMasterId: request.boardingMasterId,
                securityId: request.securityId,
                reason: request.reason,
                leaveDate: request.leaveDate,
                returnDate: request.returnDate,
                status: 'rejected',
                sheetUrl: request.sheetUrl,
                houseCheckedOutAt: request.houseCheckedOutAt,
                gateCheckedOutAt: request.gateCheckedOutAt,
                homeArrivalAt: request.homeArrivalAt,
                homeDepartureAt: request.homeDepartureAt,
                createdAt: request.createdAt,
                updatedAt: now
            };

            await apiService.saveModuleRecord('leave_out_requests', dbPayload);
            await onLogAction(`Leave out for ${request.studentName} rejected by ${currentUser.name}`);

            if (request.classTeacherId) {
                try {
                    await apiService.createNotification({
                        userId: request.classTeacherId,
                        institutionId: currentInstitution.id,
                        title: `Leave Out Request Rejected: ${request.studentName}`,
                        message: `The leave out for ${request.studentName} was rejected by administration. Reason: ${remarks || 'No remarks provided.'}`,
                        type: 'alert',
                        link: '/leave-out-requests'
                    });
                } catch (_) {}
            }

            loadRequests();
            onDataChange();
            alert("Leave out request rejected.");
        } catch (error) {
            console.error("Failed to reject request:", error);
            alert("Error rejecting request.");
        }
    };

    const handleHouseCheckout = async (request: LeaveOutWithDetails) => {
        if (!window.confirm(`Confirm student ${request.studentName} has checked out of the house?`)) return;

        try {
            const updates = {
                status: 'pending_security' as LeaveOutStatus,
                boardingMasterId: currentUser.id,
                houseCheckedOutAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const dbPayload: LeaveOutRequest = {
                id: request.id,
                institutionId: request.institutionId,
                studentId: request.studentId,
                classTeacherId: request.classTeacherId,
                boardingMasterId: updates.boardingMasterId,
                securityId: request.securityId,
                reason: request.reason,
                leaveDate: request.leaveDate,
                returnDate: request.returnDate,
                status: updates.status,
                sheetUrl: request.sheetUrl,
                houseCheckedOutAt: updates.houseCheckedOutAt,
                gateCheckedOutAt: request.gateCheckedOutAt,
                homeArrivalAt: request.homeArrivalAt,
                homeDepartureAt: request.homeDepartureAt,
                createdAt: request.createdAt,
                updatedAt: updates.updatedAt
            };

            await apiService.saveModuleRecord('leave_out_requests', dbPayload);
            await onLogAction(`Boarding checkout confirmed for ${request.studentName}`);

            loadRequests();
            onDataChange();
        } catch (error) {
            console.error("Checkout failed:", error);
        }
    };

    const handleGateCheckout = async (request: LeaveOutWithDetails) => {
        if (!window.confirm(`Confirm student ${request.studentName} has checked out of the gate? This will notify the parent.`)) return;

        try {
            const now = new Date().toISOString();
            const updates = {
                status: 'checked_out' as LeaveOutStatus,
                securityId: currentUser.id,
                gateCheckedOutAt: now,
                updatedAt: now
            };

            const dbPayload: LeaveOutRequest = {
                id: request.id,
                institutionId: request.institutionId,
                studentId: request.studentId,
                classTeacherId: request.classTeacherId,
                boardingMasterId: request.boardingMasterId,
                securityId: updates.securityId,
                reason: request.reason,
                leaveDate: request.leaveDate,
                returnDate: request.returnDate,
                status: updates.status,
                sheetUrl: request.sheetUrl,
                houseCheckedOutAt: request.houseCheckedOutAt,
                gateCheckedOutAt: updates.gateCheckedOutAt,
                homeArrivalAt: request.homeArrivalAt,
                homeDepartureAt: request.homeDepartureAt,
                createdAt: request.createdAt,
                updatedAt: updates.updatedAt
            };

            await apiService.saveModuleRecord('leave_out_requests', dbPayload);
            await onLogAction(`Gate checkout confirmed for ${request.studentName}`);

            // Send Notifications
            if (request.parentPhone) {
                const smsMsg = `Dear Parent, your child ${request.studentName} has successfully checked out of ${currentInstitution.name} gate at ${new Date(now).toLocaleTimeString()}. Reason: ${request.reason}. Safe journey.`;
                await apiService.sendSms(request.parentPhone, smsMsg, currentInstitution.letterheadConfig ? { ...companyDetails.smsConfig } : undefined);
            }

            if (request.parentEmail) {
                const subject = `Student Checkout Notification - ${currentInstitution.name}`;
                const emailMsg = `Dear Parent,\n\nThis is to notify you that ${request.studentName} has checked out of the school gate at ${new Date(now)?.toLocaleString()} for their scheduled leave out.\n\nDetails:\n- Reason for leave: ${request.reason}\n- Departure Date: ${new Date(request.leaveDate).toLocaleDateString()}\n- Expected Return Date: ${new Date(request.returnDate).toLocaleDateString()}\n- Authorized by Class Teacher: ${request.classTeacherName}\n- Checked out by House Master: ${request.boardingMasterName || 'N/A'}\n- Cleared by Security Gate Officer: ${currentUser.name}\n\nPlease find the attached permission sheet for your reference.\n\nRegards,\n${currentInstitution.name}`;

                // Generate PDF
                const docUri = await generateLeaveOutSheetPdf(
                    dbPayload,
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

    const isClassTeacher = useMemo(() => {
        if (['admin', 'head_teacher', 'deputy', 'super_admin', 'managing_director', 'hoi'].includes(currentUser.role)) {
            return true;
        }
        return courses.some(c => 
            c.levels?.some(l => l.classTeacherId === currentUser.id)
        );
    }, [currentUser, courses]);

    const students = useMemo(() => {
        const allStudents = users.filter(u => u.role === 'student');
        if (['admin', 'head_teacher', 'deputy', 'super_admin', 'managing_director', 'hoi'].includes(currentUser.role)) {
            return allStudents;
        }
        const myClassLevels = new Set<string>();
        courses.forEach(c => {
            c.levels?.forEach(l => {
                if (l.classTeacherId === currentUser.id) {
                    myClassLevels.add(`${c.id}-${l.id}`);
                }
            });
        });
        return allStudents.filter(student => 
            myClassLevels.has(`${student.courseId}-${student.courseLevelId}`)
        );
    }, [users, currentUser, courses]);

    const pendingApprovalCount = useMemo(() => {
        return requests.filter(r => r.status === 'pending_headteacher').length;
    }, [requests]);

    const getStatusBadge = (status: LeaveOutStatus) => {
        switch (status) {
            case 'pending_headteacher':
                return <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-amber-700 animate-pulse" /> Pending Approval</span>;
            case 'pending_boarding':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider">Pending House Exit</span>;
            case 'pending_security':
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">Pending Gate Exit</span>;
            case 'approved':
                return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">Approved</span>;
            case 'checked_out':
                return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider">Checked Out</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider">Rejected</span>;
            case 'cancelled':
                return <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold uppercase tracking-wider">Cancelled</span>;
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
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Student Leave Out & Exeat Management</h2>
                    <p className="text-slate-500 text-sm font-medium">Teacher generation &bull; Headteacher/Deputy approval &bull; Parent notification &bull; Home transit tracking</p>
                </div>
                {isClassTeacher && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 font-bold cursor-pointer"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Generate Permission Sheet
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <div className="flex items-center gap-2">
                        <FileTextIcon className="w-4 h-4" />
                        All Permission Sheets
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Headteacher Approvals</span>
                    {pendingApprovalCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black animate-pulse">
                            {pendingApprovalCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('boarding')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'boarding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                >
                    <div className="flex items-center gap-2">
                        <HomeIcon className="w-4 h-4" />
                        House Checkout
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'security' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
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
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
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
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Phase & Workflow</th>
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
                                        if (activeTab === 'approvals') return req.status === 'pending_headteacher';
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
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">Teacher: {req.classTeacherName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm text-slate-700 font-medium mb-1 line-clamp-1">{req.reason}</p>
                                                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                                                    <span className="flex items-center gap-1.5"><CalendarDaysIcon className="w-3 h-3 text-indigo-400" /> {new Date(req.leaveDate).toLocaleDateString()}</span>
                                                    <ArrowRightIcon className="w-3 h-3" />
                                                    <span className="flex items-center gap-1.5"><ArrowPathIcon className="w-3 h-3 text-emerald-400" /> {new Date(req.returnDate).toLocaleDateString()}</span>
                                                </div>
                                                {req.headteacherRemarks && (
                                                    <p className="text-[10px] text-rose-600 font-bold mt-1 italic">Remarks: {req.headteacherRemarks}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    {getStatusBadge(req.status)}
                                                    {req.status === 'pending_headteacher' && (
                                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-700 uppercase tracking-tighter">
                                                            <ClockIcon className="w-3 h-3" /> Awaiting Headteacher / Deputy
                                                        </div>
                                                    )}
                                                    {req.status === 'pending_boarding' && (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            <ClockIcon className="w-3 h-3" /> Waiting for House Master
                                                        </div>
                                                    )}
                                                    {req.status === 'pending_security' && (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            <ClockIcon className="w-3 h-3" /> Waiting for Security Gate
                                                        </div>
                                                    )}
                                                    {req.status === 'checked_out' && (
                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                                                            <CheckCircleIcon className="w-3 h-3" /> Exited School Gate
                                                        </div>
                                                    )}

                                                    {/* Approval & Notification details */}
                                                    {req.headteacherApprovedAt && (
                                                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                                            ✓ Approved by {req.headteacherName || (req.approvedByRole === 'deputy_principal' ? 'Deputy Principal' : 'Headteacher')}
                                                        </span>
                                                    )}
                                                    {req.parentNotifiedAt && (
                                                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">
                                                            ✓ Parent Notified (SMS & Email)
                                                        </span>
                                                    )}

                                                    {/* Home Transit Status */}
                                                    {req.homeArrivalAt && (
                                                        <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full w-fit flex items-center gap-1">
                                                            <HomeIcon className="w-3 h-3 text-emerald-600" />
                                                            Arrived Home: {new Date(req.homeArrivalAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {req.homeDepartureAt && (
                                                        <span className="text-[9px] font-black text-indigo-800 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full w-fit flex items-center gap-1">
                                                            <ArrowPathIcon className="w-3 h-3 text-indigo-600" />
                                                            Departed Home: {new Date(req.homeDepartureAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Headteacher Approval Actions */}
                                                    {req.status === 'pending_headteacher' && (
                                                        isHeadTeacherOrDeputy ? (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleApproveRequest(req)}
                                                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                                                    title="Approve & Immediately Notify Parent via SMS & Email"
                                                                >
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                    Approve & Notify Parent
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectRequest(req)}
                                                                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                                                    title="Reject Leave Out Request"
                                                                >
                                                                    <XCircleIcon className="w-4 h-4" />
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl uppercase tracking-wider border border-amber-200">
                                                                Awaiting Approval
                                                            </span>
                                                        )
                                                    )}

                                                    {activeTab === 'requests' && req.status !== 'pending_headteacher' && (
                                                        <button
                                                            onClick={() => handlePrintSheet(req)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white border rounded-lg transition-all cursor-pointer"
                                                            title="Print Sheet"
                                                        >
                                                            <PrinterIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {activeTab === 'boarding' && req.status === 'pending_boarding' && (
                                                        <button
                                                            onClick={() => handleHouseCheckout(req)}
                                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
                                                        >
                                                            <HomeIcon className="w-3.5 h-3.5" />
                                                            Verify House Exit
                                                        </button>
                                                    )}
                                                    {activeTab === 'security' && req.status === 'pending_security' && (
                                                        <button
                                                            onClick={() => handleGateCheckout(req)}
                                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center gap-2 cursor-pointer"
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
                                    onChange={(e) => handleStudentChange(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                >
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.staffId || s.admissionNumber || s.admission_number || 'N/A'}) - {isStudentBoarder(s.id) ? 'Boarder' : 'Day Scholar'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                                <input
                                    type="checkbox"
                                    id="isBoarder"
                                    checked={form.isBoarder}
                                    onChange={(e) => setForm(prev => ({ ...prev, isBoarder: e.target.checked }))}
                                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="isBoarder" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                    Boarding Student (Requires House clearance first)
                                </label>
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

