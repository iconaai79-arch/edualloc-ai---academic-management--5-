import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, MpesaTransaction, BankTransaction, DSLead } from '../types';
import { apiService } from './apiService';
import { useToast } from './ToastContext';
import { generateDSPDF } from '../utils/dsPdfGenerator';

interface DrivingSchoolContextType {
    instructors: DSInstructor[];
    vehicles: DSVehicle[];
    students: DSStudent[];
    lessons: DSLesson[];
    mastery: DSSkillMastery[];
    settings: DSSettings | null;
    invoices: DSInvoice[];
    payments: DSPayment[];
    mpesaTransactions: MpesaTransaction[];
    bankTransactions: BankTransaction[];
    leads: DSLead[];
    
    // Setters (used for hydration from main loadData)
    setInstructors: React.Dispatch<React.SetStateAction<DSInstructor[]>>;
    setVehicles: React.Dispatch<React.SetStateAction<DSVehicle[]>>;
    setStudents: React.Dispatch<React.SetStateAction<DSStudent[]>>;
    setLessons: React.Dispatch<React.SetStateAction<DSLesson[]>>;
    setMastery: React.Dispatch<React.SetStateAction<DSSkillMastery[]>>;
    setSettings: React.Dispatch<React.SetStateAction<DSSettings | null>>;
    setInvoices: React.Dispatch<React.SetStateAction<DSInvoice[]>>;
    setPayments: React.Dispatch<React.SetStateAction<DSPayment[]>>;
    setLeads: React.Dispatch<React.SetStateAction<DSLead[]>>;

    // Operations
    addInstructor: (data: any) => Promise<void>;
    addVehicle: (data: any) => Promise<void>;
    updateVehicle: (data: any) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
    addStudent: (data: any) => Promise<void>;
    updateStudent: (data: any) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    addLesson: (data: any) => Promise<void>;
    addMastery: (data: any) => Promise<void>;
    updateSettings: (data: any) => Promise<void>;
    addInvoice: (data: any) => Promise<void>;
    updateInvoice: (data: any) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    addPayment: (data: any) => Promise<void>;
    updatePayment: (data: any) => Promise<void>;
    deletePayment: (id: string) => Promise<void>;
    updateLesson: (data: any) => Promise<void>;
    deleteLesson: (id: string) => Promise<void>;
    addLead: (data: Partial<DSLead>) => Promise<void>;
    updateLead: (data: Partial<DSLead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    deleteLeads: (ids: string[]) => Promise<void>;
    sendLessonNotification?: (lesson: DSLesson, isReminder?: boolean) => Promise<void>;
    refreshData: () => Promise<void>;
    stats: {
        totalStudents: number;
        activeInstructors: number;
        operationalVehicles: number;
        pendingLessons: number;
    };
}

export const DrivingSchoolContext = createContext<DrivingSchoolContextType | undefined>(undefined);

export const useDrivingSchool = () => {
    const context = useContext(DrivingSchoolContext);
    if (!context) throw new Error('useDrivingSchool must be used within a DrivingSchoolProvider');
    return context;
};

export const DrivingSchoolProvider: React.FC<{ children: ReactNode, institutionId: string | undefined }> = ({ children, institutionId }) => {
    const { success, error } = useToast();
    
    const [instructors, setInstructors] = useState<DSInstructor[]>([]);
    const [vehicles, setVehicles] = useState<DSVehicle[]>([]);
    const [students, setStudents] = useState<DSStudent[]>([]);
    const [lessons, setLessons] = useState<DSLesson[]>([]);
    const [mastery, setMastery] = useState<DSSkillMastery[]>([]);
    const [settings, setSettings] = useState<DSSettings | null>(null);
    const [invoices, setInvoices] = useState<DSInvoice[]>([]);
    const [payments, setPayments] = useState<DSPayment[]>([]);
    const [mpesaTransactions, setMpesaTransactions] = useState<MpesaTransaction[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [leads, setLeads] = useState<DSLead[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadDSData = useCallback(async () => {
        if (!institutionId) {
            console.log("[DSContext] loadDSData: No institutionId provided, skipping fetch.");
            return;
        }
        setIsLoading(true);
        console.log(`[DSContext] loadDSData: Starting fetch for institutionId=${institutionId}`);
        try {
            const [dsInst, dsVeh, dsStud, dsLess, dsMast, dsSet, dsInvs, dsPay, dsMpe, dsBnk, dsVotesStandalone, dsCatsStandalone, dsLeadsStandalone] = await Promise.all([
                apiService.fetchModuleRecords<DSInstructor>('ds_instructors', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSVehicle>('ds_vehicles', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSStudent>('ds_students', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<DSLesson>('ds_lessons', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<DSSkillMastery>('ds_skill_mastery', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<DSSettings>('ds_settings', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<DSPayment>('ds_payments', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<MpesaTransaction>('mpesa_transactions', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<BankTransaction>('bank_transactions', institutionId, undefined, { limit: 100000 }).catch(() => []),
                apiService.fetchModuleRecords<any>('ds_votes', institutionId).catch(() => []),
                apiService.fetchModuleRecords<any>('ds_license_categories', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSLead>('ds_leads', institutionId, undefined, { limit: 100000 }).catch(() => []),
            ]);

            console.log(`[DSContext] loadDSData: Fetched ${dsInst.length} instructors, ${dsVeh.length} vehicles, ${dsStud.length} students, ${dsLess.length} lessons, ${dsLeadsStandalone.length} leads`);

            setInstructors(dsInst || []);
            setVehicles(dsVeh || []);
            setStudents(dsStud || []);
            setLessons(dsLess || []);
            setMastery(dsMast || []);

            // Safely consolidate embedded cache columns with standalone DB rows and preserve local state if backend strips newly added columns
            setSettings(prev => {
                let baseSettings: any = dsSet && dsSet.length > 0 ? dsSet[0] : null;

                // Smart consolidation of standalone SQL rows and embedded blob arrays for Fee Votes
                const votesMap = new Map();
                const addVoteToMap = (v: any) => {
                    const vName = v?.voteName || v?.vote_name;
                    if (vName) {
                        votesMap.set(vName.toLowerCase().trim(), {
                            ...v,
                            voteName: vName,
                            defaultAmount: v?.defaultAmount ?? v?.default_amount ?? 0,
                            isMandatory: v?.isMandatory ?? v?.is_mandatory ?? false
                        });
                    }
                };
                let backupVotes: any[] = [];
                let backupCats: any[] = [];
                let backupGroups: string[] = [];
                try {
                    const bv = localStorage.getItem(`ds_votes_backup_${institutionId}`);
                    if (bv) backupVotes = JSON.parse(bv);
                    const bc = localStorage.getItem(`ds_cats_backup_${institutionId}`);
                    if (bc) backupCats = JSON.parse(bc);
                    const bg = localStorage.getItem(`ds_groups_backup_${institutionId}`);
                    if (bg) backupGroups = JSON.parse(bg);
                } catch (storageErr) {}

                if (prev?.votes && Array.isArray(prev.votes)) prev.votes.forEach(addVoteToMap);
                if (backupVotes && Array.isArray(backupVotes)) backupVotes.forEach(addVoteToMap);
                if (baseSettings?.votes && Array.isArray(baseSettings.votes)) baseSettings.votes.forEach(addVoteToMap);
                if (dsVotesStandalone && Array.isArray(dsVotesStandalone)) dsVotesStandalone.forEach(addVoteToMap);
                const finalVotes = Array.from(votesMap.values());

                // Smart consolidation for License Categories
                // NOTE: merge order matters — standalone table rows first, then JSONB blob wins last
                // so that parentCategory (which may be missing from older standalone rows) is preserved
                const catsMap = new Map();
                const addCatToMap = (c: any) => {
                    const cCode = c?.code;
                    if (cCode) {
                        const existing = catsMap.get(cCode.toLowerCase().trim()) || {};
                        catsMap.set(cCode.toLowerCase().trim(), {
                            ...existing,
                            ...c,
                            code: cCode,
                            name: c?.name || existing?.name || '',
                            description: c?.description ?? existing?.description ?? '',
                            baseFee: c?.baseFee ?? c?.base_fee ?? existing?.baseFee ?? 0,
                            isActive: c?.isActive ?? c?.is_active ?? existing?.isActive ?? true,
                            parentCategory: c?.parentCategory ?? c?.parent_category ?? existing?.parentCategory ?? 'Driving'
                        });
                    }
                };
                // Apply in ascending priority: standalone rows first, JSONB blob last (wins)
                if (dsCatsStandalone && Array.isArray(dsCatsStandalone)) dsCatsStandalone.forEach(addCatToMap);
                if (prev?.licenseCategories && Array.isArray(prev.licenseCategories)) prev.licenseCategories.forEach(addCatToMap);
                if (backupCats && Array.isArray(backupCats)) backupCats.forEach(addCatToMap);
                if (baseSettings?.licenseCategories && Array.isArray(baseSettings.licenseCategories)) baseSettings.licenseCategories.forEach(addCatToMap);
                const finalCats = Array.from(catsMap.values());

                // Consolidate groups
                const groupsSet = new Set<string>();
                const addGroup = (g: string) => {
                    if (g && typeof g === 'string' && g.trim()) {
                        groupsSet.add(g.trim());
                    }
                };
                ['Driving', 'Computer Classes', 'IELTS'].forEach(addGroup);
                if (prev?.licenseGroups && Array.isArray(prev.licenseGroups)) prev.licenseGroups.forEach(addGroup);
                if (backupGroups && Array.isArray(backupGroups)) backupGroups.forEach(addGroup);
                if (baseSettings?.licenseGroups && Array.isArray(baseSettings.licenseGroups)) baseSettings.licenseGroups.forEach(addGroup);
                const finalGroups = Array.from(groupsSet);

                if (baseSettings) {
                    return {
                        ...baseSettings,
                        votes: finalVotes,
                        licenseCategories: finalCats,
                        licenseGroups: finalGroups
                    };
                } else {
                    return {
                        id: `ds_settings_${institutionId}`,
                        institutionId,
                        ...prev,
                        votes: finalVotes,
                        licenseCategories: finalCats,
                        licenseGroups: finalGroups
                    };
                }
            });
            setInvoices(dsInvs || []);
            setPayments(dsPay || []);
            setMpesaTransactions(dsMpe || []);
            setBankTransactions(dsBnk || []);
            setLeads(dsLeadsStandalone || []);
        } catch (err) {
            console.error("[DSContext] loadDSData: Failed to load DS data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadDSData();
    }, [loadDSData]);

    const refreshData = loadDSData;
    const onRefresh = refreshData;

    const addInstructor = useCallback(async (data: any) => {
        try {
            const userId = `u_${Date.now()}`;
            const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
            const userEmail = data.email || `${userId}@ds.local`;

            // 1. Register central user account for portal login
            try {
                await apiService.registerUser({
                    id: userId,
                    name: data.name,
                    email: userEmail,
                    password: generatedPassword,
                    role: 'driving_instructor',
                    institutionId,
                    status: 'active'
                } as any);

                // Persist phone number directly to bypass generic SMS dispatchers
                await apiService.saveUser({
                    id: userId,
                    name: data.name,
                    email: userEmail,
                    phoneNumber: data.phone,
                    password: generatedPassword,
                    role: 'driving_instructor',
                    institutionId,
                    status: 'active'
                } as any);
            } catch (e) {
                console.warn("Platform instructor registration warning:", e);
            }

            const instId = `inst_${Date.now()}`;
            await apiService.saveModuleRecord('ds_instructors', { ...data, id: instId, userId, institutionId });
            success("Instructor added successfully");

            // Automated Welcome Credentials via SMS
            if (data.phone && data.phone.trim().length >= 9) {
                try {
                    const insts = await apiService.fetchModuleRecords('institutions', institutionId);
                    const inst = insts?.[0] || { name: 'Driving School' };
                    const companySettings = await apiService.fetchCompanySettings().catch(() => null);
                    const portalTitle = inst.name || 'Driving School';
                    const activeSmsConfig = inst.smsConfig || companySettings?.smsConfig;

                    const portalUrl = window.location.origin;
                    const smsMsg = `Welcome to ${portalTitle}! Your Driving Instructor account is ready.\nPortal: ${portalUrl}\nUser ID: ${data.phone}\nTemp Password: ${generatedPassword}`;
                    
                    await apiService.sendSms(data.phone, smsMsg, activeSmsConfig, 1, institutionId);
                    console.log("[DS Automation] Welcome credentials SMS dispatched to instructor:", data.phone);
                } catch (smsErr) {
                    console.error("[DS Automation] Failed to dispatch instructor welcome SMS:", smsErr);
                }
            }

            await onRefresh();
        } catch (err) {
            error("Failed to add instructor");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addVehicle = useCallback(async (data: any) => {
        try {
            const isUpdate = !!data.id;
            await apiService.saveModuleRecord('ds_vehicles', { 
                ...data, 
                id: data.id || `vh_${Date.now()}`, 
                institutionId 
            });
            success(isUpdate ? "Vehicle updated successfully" : "Vehicle registered successfully");
            await onRefresh();
        } catch (err) {
            error(data.id ? "Failed to update vehicle" : "Failed to register vehicle");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const updateVehicle = addVehicle;

    const deleteVehicle = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to remove this vehicle from the fleet?")) return;
        try {
            await apiService.deleteModuleRecord('ds_vehicles', id);
            success("Vehicle removed from fleet");
            await onRefresh();
        } catch (err) {
            error("Failed to remove vehicle");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addStudent = useCallback(async (data: any) => {
        if (!institutionId) return;
        
        let admNumber = data.admissionNumber;
        if (!admNumber) {
            const prefixStr = (settings?.studentIdPrefix || 'ADM-').trim();
            const asNum = Number(prefixStr);
            if (!isNaN(asNum) && prefixStr !== '') {
                let maxVal = asNum;
                students.forEach(s => {
                    if (s.admissionNumber) {
                        const sNum = Number(s.admissionNumber.trim());
                        if (!isNaN(sNum) && sNum >= asNum && sNum > maxVal) {
                            maxVal = sNum;
                        }
                    }
                });
                admNumber = String(maxVal + 1);
            } else {
                let maxNum = 0;
                students.forEach(s => {
                    if (s.admissionNumber && s.admissionNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                        const remainder = s.admissionNumber.slice(prefixStr.length).trim();
                        const match = remainder.match(/\d+/);
                        if (match) {
                            const num = parseInt(match[0], 10);
                            if (!isNaN(num) && num > maxNum) {
                                maxNum = num;
                            }
                        }
                    }
                });
                admNumber = `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
            }
        } else {
            // 0. Validate Admission Number Uniqueness
            const isDuplicate = students.some(s => 
                s.admissionNumber?.toLowerCase().trim() === admNumber.toLowerCase().trim()
            );
            if (isDuplicate) {
                error(`Admission number "${admNumber}" is already assigned to another student.`);
                throw new Error("Duplicate admission number");
            }
        }

        try {
            const userId = data.userId || `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
            const userEmail = data.email || `${userId}@ds.local`;
            
            // 1. Create platform user account so they appear in global student views
            try {
                await apiService.registerUser({
                    id: userId,
                    name: data.fullName,
                    email: userEmail,
                    password: generatedPassword,
                    role: 'student',
                    institutionId,
                    status: 'active'
                } as any);

                // Ensure the phone number is correctly persisted on the user record directly
                await apiService.saveUser({
                    id: userId,
                    name: data.fullName,
                    email: userEmail,
                    phoneNumber: data.phone,
                    password: generatedPassword,
                    role: 'student',
                    institutionId,
                    status: 'active'
                } as any);
            } catch (e) {
                console.warn("Platform user registration skipped or failed:", e);
            }

            // 2. Create Driving School specific record
            const newId = data.id || `dss_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const duration = data.courseDurationDays || settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 0;
            const newStudent = { 
                ...data, 
                admissionNumber: admNumber,
                id: newId, 
                userId,
                institutionId,
                status: 'Enrolled',
                courseDurationDays: duration,
                remainingDays: duration,
                createdAt: new Date().toISOString()
            };
            
            await apiService.saveModuleRecord('ds_students', newStudent);
            success("Student enrolled successfully");

            // Automated Welcome Credentials via SMS
            if (data.phone && data.phone.trim().length >= 9) {
                try {
                    const insts = await apiService.fetchModuleRecords('institutions', institutionId);
                    const inst = insts?.[0] || { name: 'Driving School' };
                    const companySettings = await apiService.fetchCompanySettings().catch(() => null);
                    const portalTitle = inst.name || 'Driving School';
                    const activeSmsConfig = inst.smsConfig || companySettings?.smsConfig;

                    const portalUrl = window.location.origin;
                    const smsMsg = `Welcome to ${portalTitle}! Your Driving School account is ready.\nPortal: ${portalUrl}\nUser ID: ${data.phone}\nTemp Password: ${generatedPassword}`;
                    
                    await apiService.sendSms(data.phone, smsMsg, activeSmsConfig, 1, institutionId);
                    console.log("[DS Automation] Welcome credentials SMS dispatched to student:", data.phone);
                } catch (smsErr) {
                    console.error("[DS Automation] Failed to dispatch student welcome SMS:", smsErr);
                }
            }

            await onRefresh();
        } catch (err) {
            error("Failed to enroll student");
            throw err;
        }
    }, [institutionId, students, settings, onRefresh, success, error]);

    const updateStudent = useCallback(async (data: any) => {
        if (!institutionId) return;

        // 0. Validate Admission Number Uniqueness (if changed)
        if (data.admissionNumber) {
            const isDuplicate = students.some(s => 
                s.id !== data.id && 
                s.admissionNumber?.toLowerCase().trim() === data.admissionNumber.toLowerCase().trim()
            );
            if (isDuplicate) {
                error(`Admission number "${data.admissionNumber}" is already assigned to another student.`);
                throw new Error("Duplicate admission number");
            }
        }

        try {
            await apiService.saveModuleRecord('ds_students', { 
                ...data, 
                institutionId,
                updatedAt: new Date().toISOString()
            });
            success("Student updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update student");
            throw err;
        }
    }, [institutionId, students, onRefresh, success, error]);

    const deleteStudent = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to remove this student? This action cannot be undone.")) return;
        
        try {
            await apiService.deleteModuleRecord('ds_students', id);
            success("Student removed successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to remove student");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const sendLessonNotification = useCallback(async (lesson: DSLesson, isReminder = false) => {
        const student = students.find(s => s.id === lesson.studentId);
        const instructor = instructors.find(i => i.id === lesson.instructorId);
        const vehicle = vehicles.find(v => v.id === lesson.vehicleId);

        if (!student || !instructor) {
            console.warn("[DS Automation] Missing student or instructor for lesson notification", lesson.id);
            return;
        }

        try {
            const insts = await apiService.fetchModuleRecords('institutions', institutionId);
            const inst = insts?.[0] || { name: 'Driving School' };
            const companySettings = await apiService.fetchCompanySettings().catch(() => null);
            const portalTitle = inst.name || 'Driving School';
            const activeSmsConfig = companySettings?.smsConfig || inst.smsConfig;

            // 1. Notification for Student
            const actionLink = `${window.location.origin}/ds/lesson/${lesson.id}/manage`;
            
            if (student.email) {
                const subject = isReminder ? `Reminder: Lesson Starting Soon - ${lesson.startTime}` : `New Lesson Scheduled: ${lesson.lessonDate || (lesson as any).date}`;
                const body = `Dear ${student.fullName},\n\n` +
                             (isReminder ? `This is a reminder for your upcoming lesson starting at ${lesson.startTime}.\n\n` : `A new driving lesson has been scheduled for you.\n\n`) +
                             `Details:\n` +
                             `- Date: ${lesson.lessonDate || (lesson as any).date}\n` +
                             `- Time: ${lesson.startTime} - ${lesson.endTime || (lesson as any).endTime}\n` +
                             `- Instructor: ${instructor.name}\n` +
                             `- Vehicle: ${vehicle?.plateNumber || 'N/A'}\n\n` +
                             `Please confirm your attendance or request a reschedule here: ${actionLink}\n\n` +
                             `Please ensure you are at the designated training area at least 5 minutes early.\n\n` +
                             `Happy Learning,\n${portalTitle}`;
                
                await apiService.sendEmail(student.email, subject, body).catch(e => console.error("Email to student failed", e));
            }
 
            if (student.phone) {
                let sms = '';
                if (isReminder) {
                    const customTemplate = settings?.schedulingRules?.smsReminderTemplate;
                    if (settings?.schedulingRules?.enableSmsReminders && customTemplate) {
                        sms = customTemplate
                            .replace(/{student}/g, student.fullName)
                            .replace(/{school}/g, portalTitle)
                            .replace(/{instructor}/g, instructor.name)
                            .replace(/{time}/g, lesson.startTime)
                            .replace(/{date}/g, lesson.lessonDate || (lesson as any).date || '');
                    } else {
                        sms = `Reminder: Your ${portalTitle} lesson with ${instructor.name} starts at ${lesson.startTime}. Be ready!`;
                    }
                } else {
                    sms = `Hello ${student.fullName}, your ${portalTitle} lesson is scheduled for ${lesson.lessonDate || (lesson as any).date} at ${lesson.startTime}. Manage here: ${actionLink}`;
                }
                
                await apiService.sendSms(student.phone, sms, activeSmsConfig, 1, institutionId).catch(e => console.error("SMS to student failed", e));
            }

            // 2. Notification for Instructor
            if (instructor.email) {
                const subject = isReminder ? `Reminder: Lesson Starting Soon - ${lesson.startTime}` : `New Lesson Assigned: ${lesson.lessonDate || (lesson as any).date}`;
                const body = `Dear ${instructor.name},\n\n` +
                             (isReminder ? `Your lesson with ${student.fullName} is starting at ${lesson.startTime}.\n\n` : `You have been assigned a new lesson.\n\n`) +
                             `Details:\n` +
                             `- Student: ${student.fullName}\n` +
                             `- Date: ${lesson.lessonDate || (lesson as any).date}\n` +
                             `- Time: ${lesson.startTime} - ${lesson.endTime || (lesson as any).endTime}\n` +
                             `- Vehicle: ${vehicle?.plateNumber || 'N/A'}\n\n` +
                             `Safe driving,\n${portalTitle}`;
                
                await apiService.sendEmail(instructor.email, subject, body).catch(e => console.error("Email to instructor failed", e));
            }

            if (instructor.phone) {
                const sms = isReminder
                    ? `Reminder: Your lesson with ${student.fullName} starts at ${lesson.startTime}. Vehicle: ${vehicle?.plateNumber || 'N/A'}.`
                    : `Hello ${instructor.name}, a new lesson with ${student.fullName} has been scheduled for ${lesson.lessonDate || (lesson as any).date} at ${lesson.startTime}.`;
                
                await apiService.sendSms(instructor.phone, sms, activeSmsConfig, 1, institutionId).catch(e => console.error("SMS to instructor failed", e));
            }

            console.log(`[DS Automation] ${isReminder ? 'Reminder' : 'Initial'} notifications sent for lesson ${lesson.id}`);
        } catch (err) {
            console.error("[DS Automation] Lesson notification critical failure:", err);
        }
    }, [institutionId, students, instructors, vehicles, settings]);

    const checkUpcomingLessons = useCallback(async () => {
        if (!lessons.length) return;
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Find lessons for today that are starting within the next 60 minutes
        const upcoming = lessons.filter(l => {
            if (l.status !== 'Scheduled' || (l as any).reminderSent) return false;
            
            const lessonDate = l.lessonDate;
            if (lessonDate !== today) return false;
            if (!l.startTime || typeof l.startTime !== 'string' || !l.startTime.includes(':')) return false;
            
            try {
                const [hours, minutes] = l.startTime.split(':').map(Number);
                const lessonTime = new Date(now);
                lessonTime.setHours(hours, minutes, 0, 0);
                
                const diffMinutes = (lessonTime.getTime() - now.getTime()) / (1000 * 60);
                return diffMinutes > 0 && diffMinutes <= 60;
            } catch (e) {
                return false;
            }
        });

        if (upcoming.length > 0) {
            console.log(`[DS Automation] Found ${upcoming.length} lessons starting soon. Sending reminders...`);
            for (const lesson of upcoming) {
                await sendLessonNotification(lesson, true);
                // Mark as reminder sent in local state and DB if possible
                // For simplicity here, we'll just track it in a local set for this session to avoid spam
                (lesson as any).reminderSent = true;
                await apiService.saveModuleRecord('ds_lessons', { ...lesson, reminderSent: true } as any);
            }
        }
    }, [lessons, sendLessonNotification]);

    // Periodical background check for upcoming lessons
    useEffect(() => {
        const interval = setInterval(checkUpcomingLessons, 5 * 60 * 1000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, [checkUpcomingLessons]);

    const addLesson = useCallback(async (data: any) => {
        try {
            const lesson = { ...data, id: `less_${Date.now()}`, institutionId, status: 'Scheduled' };
            await apiService.saveModuleRecord('ds_lessons', lesson);
            success("Lesson scheduled successfully");
            
            // Trigger Instant Notification
            sendLessonNotification(lesson, false);
            
            await onRefresh();
        } catch (err) {
            error("Failed to schedule lesson");
            throw err;
        }
    }, [institutionId, onRefresh, success, error, sendLessonNotification]);

    const updateLesson = useCallback(async (data: any) => {
        try {
            const oldLesson = lessons.find(l => l.id === data.id);
            await apiService.saveModuleRecord('ds_lessons', { ...data, institutionId });
            
            if (data.status === 'Completed' && oldLesson?.status !== 'Completed') {
                const student = students.find(s => s.id === data.studentId);
                if (student) {
                    const currentRemaining = student.remainingDays ?? student.courseDurationDays ?? 0;
                    const durationDays = student.courseDurationDays || 21;
                    const increment = Math.max(5, Math.round(100 / durationDays));
                    const isTheory = data.lessonType === 'Theory';
                    
                    const nextTheory = isTheory ? Math.min(100, (student.theoryProgressPercent || 0) + increment) : (student.theoryProgressPercent || 0);
                    const nextPractical = !isTheory ? Math.min(100, (student.practicalProgressPercent || 0) + increment) : (student.practicalProgressPercent || 0);

                    await apiService.saveModuleRecord('ds_students', {
                        ...student,
                        remainingDays: Math.max(0, currentRemaining - 1),
                        theoryProgressPercent: nextTheory,
                        practicalProgressPercent: nextPractical
                    });
                }
            }
            
            success("Lesson updated");
            await onRefresh();
        } catch (err) {
            error("Failed to update lesson");
            throw err;
        }
    }, [institutionId, lessons, students, onRefresh, success, error]);

    const deleteLesson = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to delete this lesson?")) return;
        try {
            await apiService.deleteModuleRecord('ds_lessons', id);
            success("Lesson deleted successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to delete lesson");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addMastery = useCallback(async (data: any) => {
        try {
            await apiService.saveModuleRecord('ds_skill_mastery', { ...data, id: `mast_${Date.now()}`, institutionId });
            await onRefresh();
        } catch (err) {
            error("Failed to save mastery progress");
            throw err;
        }
    }, [institutionId, onRefresh, error]);

    const addLead = useCallback(async (data: Partial<DSLead>) => {
        if (!institutionId) return;
        try {
            const payload: DSLead = {
                id: `lead_${Date.now()}`,
                institutionId,
                fullName: data.fullName || 'Walk-in Client',
                phone: data.phone || '',
                email: data.email || '',
                licenseTypeInterested: data.licenseTypeInterested || '',
                licenseCategory: data.licenseCategory || '',
                broadcastId: data.broadcastId || '',
                source: data.source || 'Walk-in',
                status: data.status || 'New Enquiry',
                quotedAmount: data.quotedAmount || 0,
                feeStructureId: data.feeStructureId || '',
                notes: data.notes || '',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_leads', payload);
            setLeads(prev => [...prev, payload]);
            success("Enquiry lead recorded successfully.");
            await onRefresh();
        } catch (err) {
            console.error("[DSContext] Failed to add lead:", err);
            error("Failed to record walk-in enquiry lead.");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const updateLead = useCallback(async (data: Partial<DSLead>) => {
        if (!institutionId || !data.id) return;
        try {
            const payload = {
                ...data,
                institutionId,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_leads', payload);
            setLeads(prev => prev.map(l => l.id === data.id ? { ...l, ...payload } as DSLead : l));
            success("Enquiry lead updated successfully.");
            await onRefresh();
        } catch (err) {
            console.error("[DSContext] Failed to update lead:", err);
            error("Failed to update walk-in enquiry lead.");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const deleteLead = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to remove this enquiry lead?")) return;
        try {
            await apiService.deleteModuleRecord('ds_leads', id);
            setLeads(prev => prev.filter(l => l.id !== id));
            success("Enquiry lead removed successfully.");
            await onRefresh();
        } catch (err) {
            console.error("[DSContext] Failed to delete lead:", err);
            error("Failed to delete walk-in enquiry lead.");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const deleteLeads = useCallback(async (ids: string[]) => {
        if (!institutionId || ids.length === 0) return;
        if (!window.confirm(`Are you sure you want to remove these ${ids.length} enquiry leads?`)) return;
        try {
            await apiService.deleteModuleRecord('ds_leads', ids.join(','));
            const idsSet = new Set(ids);
            setLeads(prev => prev.filter(l => !idsSet.has(l.id)));
            success(`${ids.length} enquiry leads removed successfully.`);
            await onRefresh();
        } catch (err) {
            console.error("[DSContext] Failed to delete leads:", err);
            error("Failed to delete enquiry leads.");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const updateSettings = useCallback(async (data: any) => {
        if (!institutionId) return;
        try {
            // Hardened ID resolution to prevent UNIQUE constraint violations on institution_id
            let finalId = data.id || settings?.id;
            
            if (!finalId) {
                const existing = await apiService.fetchModuleRecords('ds_settings', institutionId);
                if (existing && existing.length > 0) {
                    finalId = (existing[0] as any).id;
                }
            }

            const payload = {
                ...data,
                id: finalId || `ds_settings_${institutionId}`,
                institutionId,
                updatedAt: new Date().toISOString()
            };
            
            console.log("[DS Context] updateSettings persistence flow triggered. Payload structure:", payload);
            const result = await apiService.saveModuleRecord('ds_settings', payload);
            console.log("[DS Context] Primary ds_settings blob saved successfully. Response:", result);
            
            // Instantly update local React state to guarantee stability even if backend schema caches lag behind
            const finalVotesArray = payload.votes || settings?.votes || [];
            const finalCatsArray = payload.licenseCategories || settings?.licenseCategories || [];
            const finalGroupsArray = payload.licenseGroups || settings?.licenseGroups || [];
            
            try {
                localStorage.setItem(`ds_votes_backup_${institutionId}`, JSON.stringify(finalVotesArray));
                localStorage.setItem(`ds_cats_backup_${institutionId}`, JSON.stringify(finalCatsArray));
                localStorage.setItem(`ds_groups_backup_${institutionId}`, JSON.stringify(finalGroupsArray));
            } catch (storageErr) {
                console.warn("[DS Context] Local backup cache unavailable:", storageErr);
            }

            setSettings(prev => ({
                ...prev,
                ...payload,
                votes: finalVotesArray,
                licenseCategories: finalCatsArray,
                licenseGroups: finalGroupsArray
            }));
            
            // Helper for smart upsert mirroring to bypass duplicate key conflicts gracefully
            const mirrorSubCollection = async (moduleName: string, items: any[]) => {
                if (!items || !Array.isArray(items)) return;
                console.log(`[DS Context] Mirroring ${items.length} records to ${moduleName} table...`);
                for (const item of items) {
                    if (!item || !item.id) continue;
                    const payload = { ...item, institutionId };
                    try {
                        await apiService.saveModuleRecord(moduleName, payload);
                    } catch (err: any) {
                        const errMsg = err?.message || '';
                        // If duplicate key conflict occurs, automatically attempt graceful PATCH update
                        if (errMsg.includes('23505') || errMsg.toLowerCase().includes('conflict') || errMsg.toLowerCase().includes('already registered')) {
                            try {
                                await apiService.updateModuleRecord(moduleName, item.id, payload);
                            } catch (patchErr) {
                                console.warn(`[DS Context] Graceful PATCH update for pre-existing ${moduleName} record ${item.id} skipped/failed.`);
                            }
                        } else {
                            console.error(`[DS Context] Failed to sync ${moduleName} record:`, item.id, err);
                        }
                    }
                }
            };

            await mirrorSubCollection('ds_fee_structures', data.feeStructures);
            await mirrorSubCollection('ds_votes', data.votes);
            await mirrorSubCollection('ds_license_categories', data.licenseCategories);

            success(`Driving School settings and sub-collections synchronized successfully.`);
            await onRefresh();
        } catch (err) {
            console.error("[DS Context] Save Error during settings persistence flow:", err);
            error("Persistence Failure: Settings could not be saved to database.");
            throw err;
        }
    }, [institutionId, settings, onRefresh, success, error]);

    const sendDocumentNotification = useCallback(async (type: 'invoice' | 'receipt', data: any, studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) {
            console.warn(`[DS Automation] Student not found for ID: ${studentId}`);
            return;
        }

        try {
            console.log(`[DS Automation] Preparing notifications for ${type} #${data.invoiceNumber || data.receiptNumber}`);
            
            // Fetch institution details
            const insts = await apiService.fetchModuleRecords('institutions', institutionId);
            const inst = insts?.[0] || { name: 'Driving School' };
            const companySettings = await apiService.fetchCompanySettings().catch(() => null);
            const activeSmsConfig = inst.smsConfig || companySettings?.smsConfig;

            const docTypeName = type === 'invoice' ? 'Invoice' : 'Payment Receipt';
            const docNumber = type === 'invoice' ? data.invoiceNumber : data.receiptNumber;
            const amountStr = `KES ${(data.totalAmount || (data.amount || 0))?.toLocaleString()}`;

            // Attempt PDF generation & Storage Upload gracefully
            let publicUrl = '';
            let pdfBase64 = '';
            const fileName = `${docNumber}.pdf`;

            try {
                const doc = await generateDSPDF(type, data, student as any, settings, inst);
                const pdfBlob = doc.output('blob');
                pdfBase64 = doc.output('datauristring').split(',')[1];
                const storagePath = `driving_school/${type}s/${fileName}`;
                publicUrl = await apiService.uploadBlob(storagePath, pdfBlob, 'application/pdf');
            } catch (pdfErr) {
                console.warn("[DS Automation] PDF Generation/Upload warning (continuing with plain notification):", pdfErr);
            }

            // 1. Send Email Notification
            if (student.email) {
                try {
                    const subject = `${inst.name} - ${docTypeName} #${docNumber}`;
                    const balanceLine = type === 'invoice' ? `Balance Due: KES ${(data.balance || 0)?.toLocaleString()}\n` : '';
                    const body = `Dear ${student.fullName},\n\n` +
                                 `Your ${docTypeName} from ${inst.name} has been processed successfully.\n\n` +
                                 `Document Number: #${docNumber}\n` +
                                 `Amount: ${amountStr}\n` +
                                 balanceLine +
                                 `Date: ${new Date().toLocaleDateString()}\n\n` +
                                 (publicUrl ? `Download Link: ${publicUrl}\n\n` : '') +
                                 `Thank you for choosing ${inst.name}. We are dedicated to your excellence!`;
                    
                    const attachments = pdfBase64 ? [{ filename: fileName, content: pdfBase64, encoding: 'base64' }] : undefined;
                    await apiService.sendEmail(student.email, subject, body, undefined, undefined, attachments);
                } catch (emailErr) {
                    console.warn(`[DS Automation] Email delivery warning:`, emailErr);
                }
            }

            if (student.phone) {
                try {
                    const appDocUrl = `${window.location.origin}/?view=ds-invoice&id=${type === 'invoice' ? data.id : data.invoiceId || data.id}`;
                    const finalUrl = await apiService.shortenUrl(appDocUrl);
                    const shortUrl = finalUrl ? `\nView/Pay: ${finalUrl}` : '';
                    const smsMessage = `Hello ${student.fullName}, your ${inst.name} ${docTypeName} #${docNumber} of ${amountStr} is ready.${shortUrl}`;
                    
                    await apiService.sendSms(student.phone, smsMessage, activeSmsConfig, 1, institutionId);
                    console.log(`[DS Automation] Automated SMS successfully dispatched for ${docTypeName} #${docNumber} to ${student.phone}`);
                } catch (smsErr) {
                    console.warn(`[DS Automation] SMS delivery warning:`, smsErr);
                }
            }

            console.log(`[DS Automation] Notification dispatch sequence finalized for ${docTypeName} #${docNumber}`);
        } catch (err) {
            console.error(`[DS Automation] Critical failure in notification workflow:`, err);
        }
    }, [institutionId, students, settings]);

    const addInvoice = useCallback(async (data: any) => {
        try {
            const prefixStr = (settings?.invoicePrefix || 'INV-').trim();
            let invNumber = data.invoiceNumber;
            
            const asNum = Number(prefixStr);
            const isNumericPrefix = !isNaN(asNum) && prefixStr !== '';
            
            let adheresToPrefix = false;
            if (data.isOpeningBalance) {
                adheresToPrefix = true;
            } else if (invNumber) {
                if (isNumericPrefix) {
                    adheresToPrefix = !isNaN(Number(invNumber)) && Number(invNumber) >= asNum;
                } else {
                    adheresToPrefix = invNumber.toUpperCase().startsWith(prefixStr.toUpperCase());
                }
            }

            if (!adheresToPrefix) {
                if (isNumericPrefix) {
                    let maxVal = asNum;
                    invoices.forEach(inv => {
                        if (inv.invoiceNumber) {
                            const num = Number(inv.invoiceNumber.trim());
                            if (!isNaN(num) && num >= asNum && num > maxVal) {
                                maxVal = num;
                            }
                        }
                    });
                    invNumber = String(maxVal + 1);
                } else {
                    let maxNum = 0;
                    invoices.forEach(inv => {
                        if (inv.invoiceNumber && inv.invoiceNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                            const remainder = inv.invoiceNumber.slice(prefixStr.length).trim();
                            const match = remainder.match(/\d+/);
                            if (match) {
                                const num = parseInt(match[0], 10);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        }
                    });
                    invNumber = `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
                }
            }

            const totalDiscount = Number(data.discountAmount || 0);
            const totalSponsor = Number(data.sponsorAmount || 0);
            const initialBalance = Math.max(0, (data.totalAmount || 0) - totalDiscount - totalSponsor);
            const inv = {
                ...data,
                id: data.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                institutionId,
                invoiceNumber: invNumber,
                items: (data.items || []).map((it: any) => ({ ...it, paidAmount: 0 })),
                status: initialBalance <= 0 ? 'Fully Paid' : 'Pending',
                paidAmount: 0,
                balance: initialBalance,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_invoices', inv);
            success("Invoice generated successfully");
            
            // Trigger Automation
            if (!inv.isOpeningBalance) {
                await sendDocumentNotification('invoice', inv, inv.studentId);
            }
            
            await onRefresh();
        } catch (err) {
            error("Failed to generate invoice");
            throw err;
        }
    }, [institutionId, onRefresh, success, error, students, settings, invoices, sendDocumentNotification]);

    const recalculateInvoicePayments = useCallback((invoice: DSInvoice, invoicePayments: DSPayment[]) => {
        let updatedPaidAmount = 0;
        const updatedItems = (invoice.items || []).map(item => ({
            ...item,
            paidAmount: 0
        }));

        const sortedPayments = [...invoicePayments]
            .filter(p => p.status !== 'Pending Deletion')
            .sort((a, b) => new Date(a.paymentDate || 0).getTime() - new Date(b.paymentDate || 0).getTime());

        sortedPayments.forEach(payRecord => {
            let remainingAmount = Number(payRecord.amount);
            
            const itemsWithIndices = updatedItems.map((item, idx) => ({ item, idx }));
            itemsWithIndices.sort((a, b) => (a.item.priority || 99) - (b.item.priority || 99));

            itemsWithIndices.forEach(({ item }) => {
                const itemBalance = item.amount - (item.paidAmount || 0);
                if (remainingAmount <= 0) return;
                
                const distribution = Math.min(remainingAmount, itemBalance);
                item.paidAmount = (item.paidAmount || 0) + distribution;
                remainingAmount -= distribution;
            });

            updatedPaidAmount += Number(payRecord.amount);
        });

        const totalDiscount = Number((invoice as any).discountAmount || 0);
        const totalSponsor = Number((invoice as any).sponsorAmount || 0);
        const updatedBalance = Math.max(0, invoice.totalAmount - totalDiscount - totalSponsor - updatedPaidAmount);
        const newStatus = updatedBalance <= 0 ? 'Fully Paid' : (updatedPaidAmount > 0 ? 'Partially Paid' : 'Pending');

        return {
            ...invoice,
            items: updatedItems,
            paidAmount: updatedPaidAmount,
            balance: updatedBalance,
            status: newStatus,
            updatedAt: new Date().toISOString()
        };
    }, []);

    const updateInvoice = useCallback(async (data: any) => {
        if (!institutionId || !data.id) return;
        try {
            const oldInvoice = invoices.find(inv => inv.id === data.id);
            if (!oldInvoice) {
                error("Invoice to update not found");
                return;
            }

            // Find all payments linked to this invoice
            const invoicePayments = payments.filter(p => p.invoiceId === data.id);

            // Re-apply recalculateInvoicePayments with the updated items and invoice properties
            const recalculatedInvoice = recalculateInvoicePayments({
                ...oldInvoice,
                ...data,
                updatedAt: new Date().toISOString()
            }, invoicePayments);

            await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
            success("Invoice updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update invoice");
            throw err;
        }
    }, [institutionId, invoices, payments, onRefresh, success, error, recalculateInvoicePayments]);

    const addPayment = useCallback(async (data: any) => {
        try {
            let recNumber = data.receiptNumber;
            if (!recNumber) {
                const prefixStr = (settings?.receiptPrefix || 'REC-').trim();
                const asNum = Number(prefixStr);
                if (!isNaN(asNum) && prefixStr !== '') {
                    let maxVal = asNum;
                    payments.forEach(pay => {
                        if (pay.receiptNumber) {
                            const num = Number(pay.receiptNumber.trim());
                            if (!isNaN(num) && num >= asNum && num > maxVal) {
                                maxVal = num;
                            }
                        }
                    });
                    recNumber = String(maxVal + 1);
                } else {
                    let maxNum = 0;
                    payments.forEach(pay => {
                        if (pay.receiptNumber && pay.receiptNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                            const remainder = pay.receiptNumber.slice(prefixStr.length).trim();
                            const match = remainder.match(/\d+/);
                            if (match) {
                                const num = parseInt(match[0], 10);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        }
                    });
                    recNumber = `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
                }
            }

            const pay = { 
                ...data, 
                id: `pay_${Date.now()}`, 
                institutionId,
                receiptNumber: recNumber,
                status: data.status || 'Completed',
                paymentDate: new Date().toISOString()
            };

            // Automatic Payment Distribution Logic
            const invoice = invoices.find(inv => inv.id === data.invoiceId);
            let summary = '';
            
            if (invoice) {
                // Extra safety: Resolve student details from invoice if missing
                if (!pay.studentId) {
                    pay.studentId = invoice.studentId;
                    pay.studentName = invoice.studentName;
                }

                const amountPaid = Number(data.amount);
                
                // Distribution Strategy: Priority-based Settlement
                let remainingAmount = amountPaid;
                const distributions: string[] = [];
                const sortedItems = [...(invoice.items || [])].sort((a, b) => (a.priority || 99) - (b.priority || 99));
                
                const updatedItems = sortedItems.map(item => {
                    const itemBalance = item.amount - (item.paidAmount || 0);
                    if (remainingAmount <= 0) return item;
                    
                    const distribution = Math.min(remainingAmount, itemBalance);
                    if (distribution > 0) {
                        distributions.push(`${item.name}: ${distribution?.toLocaleString()}`);
                    }
                    remainingAmount -= distribution;
                    
                    return {
                        ...item,
                        paidAmount: (item.paidAmount || 0) + distribution
                    };
                });

                const newPaidAmount = (invoice.paidAmount || 0) + amountPaid;
                const newBalance = Math.max(0, invoice.totalAmount - newPaidAmount);
                const newStatus = newBalance <= 0 ? 'Fully Paid' : 'Partially Paid';

                summary = distributions.join(', ') + (newBalance > 0 ? ` | Balance: KES ${newBalance?.toLocaleString()}` : ' | Fully Paid');

                await apiService.saveModuleRecord('ds_invoices', {
                    ...invoice,
                    items: updatedItems,
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                });
            }

            await apiService.saveModuleRecord('ds_payments', pay);
            
            if (summary) {
                success(`Payment Recorded: ${summary}`);
            } else {
                success("Payment recorded and distributed successfully");
            }

            // Trigger Notification
            await sendDocumentNotification('receipt', pay, pay.studentId);
            
            await onRefresh();
        } catch (err) {
            error("Failed to record payment");
            throw err;
        }
    }, [institutionId, onRefresh, success, error, students, settings, invoices, payments, sendDocumentNotification]);

    const updatePayment = useCallback(async (data: any) => {
        if (!institutionId || !data.id) return;
        try {
            const oldPayment = payments.find(p => p.id === data.id);
            if (!oldPayment) {
                error("Payment to update not found");
                return;
            }

            const updatedPayment = {
                ...data,
                institutionId,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_payments', updatedPayment);

            const affectedInvoiceIds = new Set<string>();
            if (oldPayment.invoiceId) affectedInvoiceIds.add(oldPayment.invoiceId);
            if (data.invoiceId) affectedInvoiceIds.add(data.invoiceId);

            for (const invId of affectedInvoiceIds) {
                const invoice = invoices.find(inv => inv.id === invId);
                if (invoice) {
                    const invoicePayments = payments.map(p => p.id === data.id ? updatedPayment : p)
                                                   .filter(p => p.invoiceId === invId);
                    const recalculatedInvoice = recalculateInvoicePayments(invoice, invoicePayments);
                    await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
                }
            }

            success("Payment updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update payment");
            throw err;
        }
    }, [institutionId, payments, invoices, onRefresh, success, error, recalculateInvoicePayments]);

    const deletePayment = useCallback(async (id: string) => {
        if (!institutionId) return;
        const paymentToDelete = payments.find(p => p.id === id);
        if (!paymentToDelete) {
            error("Payment not found");
            return;
        }

        try {
            await apiService.deleteModuleRecord('ds_payments', id);

            if (paymentToDelete.invoiceId) {
                const invoice = invoices.find(inv => inv.id === paymentToDelete.invoiceId);
                if (invoice) {
                    const invoicePayments = payments.filter(p => p.invoiceId === invoice.id && p.id !== id);
                    const recalculatedInvoice = recalculateInvoicePayments(invoice, invoicePayments);
                    await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
                }
            }

            success("Payment deleted successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to delete payment");
            throw err;
        }
    }, [institutionId, invoices, payments, onRefresh, success, error]);

    const deleteInvoice = useCallback(async (id: string) => {
        if (!institutionId) return;
        const linkedPayments = payments.filter(p => p.invoiceId === id);
        const warnMsg = linkedPayments.length > 0
            ? `Warning: This invoice has ${linkedPayments.length} linked payments. Deleting this invoice will unlink/affect them. Are you sure you want to delete this invoice?`
            : "Are you sure you want to delete this invoice? This action cannot be undone.";

        if (!window.confirm(warnMsg)) return;

        try {
            await apiService.deleteModuleRecord('ds_invoices', id);
            success("Invoice deleted successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to delete invoice");
            throw err;
        }
    }, [institutionId, payments, onRefresh, success, error]);

    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
    }), [students, instructors, vehicles, lessons]);

    const value = {
        instructors, vehicles, students, lessons, mastery, settings, invoices, payments,
        mpesaTransactions, bankTransactions, leads,
        setInstructors, setVehicles, setStudents, setLessons, setMastery, setSettings, setInvoices, setPayments, setLeads,
        addInstructor, addVehicle, updateVehicle, deleteVehicle, addStudent, updateStudent, deleteStudent, addLesson, updateLesson, deleteLesson, addMastery, updateSettings, addInvoice, updateInvoice, deleteInvoice, addPayment, updatePayment, deletePayment, addLead, updateLead, deleteLead, deleteLeads,
        sendLessonNotification,
        refreshData, stats
    };

    return (
        <DrivingSchoolContext.Provider value={value}>
            {children}
        </DrivingSchoolContext.Provider>
    );
};
