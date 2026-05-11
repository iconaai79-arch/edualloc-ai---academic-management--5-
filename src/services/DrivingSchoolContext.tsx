import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, MpesaTransaction, BankTransaction } from '../types';
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
    
    // Setters (used for hydration from main loadData)
    setInstructors: React.Dispatch<React.SetStateAction<DSInstructor[]>>;
    setVehicles: React.Dispatch<React.SetStateAction<DSVehicle[]>>;
    setStudents: React.Dispatch<React.SetStateAction<DSStudent[]>>;
    setLessons: React.Dispatch<React.SetStateAction<DSLesson[]>>;
    setMastery: React.Dispatch<React.SetStateAction<DSSkillMastery[]>>;
    setSettings: React.Dispatch<React.SetStateAction<DSSettings | null>>;
    setInvoices: React.Dispatch<React.SetStateAction<DSInvoice[]>>;
    setPayments: React.Dispatch<React.SetStateAction<DSPayment[]>>;

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
    addPayment: (data: any) => Promise<void>;
    updateLesson: (data: any) => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(false);

    const loadDSData = useCallback(async () => {
        if (!institutionId) {
            console.log("[DSContext] loadDSData: No institutionId provided, skipping fetch.");
            return;
        }
        setIsLoading(true);
        console.log(`[DSContext] loadDSData: Starting fetch for institutionId=${institutionId}`);
        try {
            const [dsInst, dsVeh, dsStud, dsLess, dsMast, dsSet, dsInvs, dsPay, dsMpe, dsBnk] = await Promise.all([
                apiService.fetchModuleRecords<DSInstructor>('ds_instructors', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSVehicle>('ds_vehicles', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSStudent>('ds_students', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSLesson>('ds_lessons', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSSkillMastery>('ds_skill_mastery', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSSettings>('ds_settings', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSPayment>('ds_payments', institutionId).catch(() => []),
                apiService.fetchModuleRecords<MpesaTransaction>('mpesa_transactions', institutionId).catch(() => []),
                apiService.fetchModuleRecords<BankTransaction>('bank_transactions', institutionId).catch(() => []),
            ]);

            console.log(`[DSContext] loadDSData: Fetched ${dsInst.length} instructors, ${dsVeh.length} vehicles, ${dsStud.length} students, ${dsLess.length} lessons`);

            setInstructors(dsInst || []);
            setVehicles(dsVeh || []);
            setStudents(dsStud || []);
            setLessons(dsLess || []);
            setMastery(dsMast || []);
            setSettings(dsSet && dsSet.length > 0 ? dsSet[0] : null);
            setInvoices(dsInvs || []);
            setPayments(dsPay || []);
            setMpesaTransactions(dsMpe || []);
            setBankTransactions(dsBnk || []);
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
            await apiService.saveModuleRecord('ds_instructors', { ...data, id: `inst_${Date.now()}`, institutionId });
            success("Instructor added successfully");
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
        
        // 0. Validate Admission Number Uniqueness
        if (data.admissionNumber) {
            const isDuplicate = students.some(s => 
                s.admissionNumber?.toLowerCase().trim() === data.admissionNumber.toLowerCase().trim()
            );
            if (isDuplicate) {
                error(`Admission number "${data.admissionNumber}" is already assigned to another student.`);
                throw new Error("Duplicate admission number");
            }
        }

        try {
            const userId = `u_${Date.now()}`;
            
            // 1. Create platform user account so they appear in global student views
            try {
                await apiService.registerUser({
                    id: userId,
                    name: data.fullName,
                    email: data.email || `${userId}@ds.local`,
                    phoneNumber: data.phone,
                    role: 'student',
                    institutionId,
                    status: 'active'
                } as any);
            } catch (e) {
                console.warn("Platform user registration skipped or failed:", e);
            }

            // 2. Create Driving School specific record
            const newId = `dss_${Date.now()}`;
            const duration = data.courseDurationDays || settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 0;
            const newStudent = { 
                ...data, 
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
            const portalTitle = inst.name || 'Driving School';

            // 1. Notification for Student
            if (student.email) {
                const subject = isReminder ? `Reminder: Lesson Starting Soon - ${lesson.startTime}` : `New Lesson Scheduled: ${lesson.lessonDate || (lesson as any).date}`;
                const body = `Dear ${student.fullName},\n\n` +
                             (isReminder ? `This is a reminder for your upcoming lesson starting at ${lesson.startTime}.\n\n` : `A new driving lesson has been scheduled for you.\n\n`) +
                             `Details:\n` +
                             `- Date: ${lesson.lessonDate || (lesson as any).date}\n` +
                             `- Time: ${lesson.startTime} - ${lesson.endTime || (lesson as any).endTime}\n` +
                             `- Instructor: ${instructor.name}\n` +
                             `- Vehicle: ${vehicle?.plateNumber || 'N/A'}\n\n` +
                             `Please ensure you are at the designated training area at least 5 minutes early.\n\n` +
                             `Happy Learning,\n${portalTitle}`;
                
                await apiService.sendEmail(student.email, subject, body).catch(e => console.error("Email to student failed", e));
            }

            if (student.phone) {
                if ((inst.smsBalance || 0) <= 0) {
                    console.warn(`[DS Automation] SMS failed: Insufficient balance (${inst.smsBalance} units)`);
                } else {
                    const sms = isReminder 
                        ? `Reminder: Your ${portalTitle} lesson with ${instructor.name} starts at ${lesson.startTime}. Be ready!`
                        : `Hello ${student.fullName}, your ${portalTitle} lesson is scheduled for ${lesson.lessonDate || (lesson as any).date} at ${lesson.startTime} with ${instructor.name}.`;
                    
                    await apiService.sendSms(student.phone, sms, undefined, 1, institutionId).catch(e => console.error("SMS to student failed", e));
                }
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
                if ((inst.smsBalance || 0) <= 0) {
                    console.warn(`[DS Automation] Instructor SMS failed: Insufficient balance`);
                } else {
                    const sms = isReminder
                        ? `Reminder: Your lesson with ${student.fullName} starts at ${lesson.startTime}. Vehicle: ${vehicle?.plateNumber || 'N/A'}.`
                        : `Hello ${instructor.name}, a new lesson with ${student.fullName} has been scheduled for ${lesson.lessonDate || (lesson as any).date} at ${lesson.startTime}.`;
                    
                    await apiService.sendSms(instructor.phone, sms, undefined, 1, institutionId).catch(e => console.error("SMS to instructor failed", e));
                }
            }

            console.log(`[DS Automation] ${isReminder ? 'Reminder' : 'Initial'} notifications sent for lesson ${lesson.id}`);
        } catch (err) {
            console.error("[DS Automation] Lesson notification critical failure:", err);
        }
    }, [institutionId, students, instructors, vehicles]);

    const checkUpcomingLessons = useCallback(async () => {
        if (!lessons.length) return;
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Find lessons for today that are starting within the next 60 minutes
        const upcoming = lessons.filter(l => {
            if (l.status !== 'Scheduled' || (l as any).reminderSent) return false;
            
            const lessonDate = l.lessonDate;
            if (lessonDate !== today) return false;
            
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
                    if (currentRemaining > 0) {
                        await apiService.saveModuleRecord('ds_students', {
                            ...student,
                            remainingDays: Math.max(0, currentRemaining - 1)
                        });
                    }
                }
            }
            
            success("Lesson updated");
            await onRefresh();
        } catch (err) {
            error("Failed to update lesson");
            throw err;
        }
    }, [institutionId, lessons, students, onRefresh, success, error]);

    const addMastery = useCallback(async (data: any) => {
        try {
            await apiService.saveModuleRecord('ds_skill_mastery', { ...data, id: `mast_${Date.now()}`, institutionId });
            await onRefresh();
        } catch (err) {
            error("Failed to save mastery progress");
            throw err;
        }
    }, [institutionId, onRefresh, error]);

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
            
            console.log("[DS Context] Save triggered - Final ID:", payload.id);
            const result = await apiService.saveModuleRecord('ds_settings', payload);
            console.log("[DS Context] Save Success - Response:", result);
            
            // Mirror fee structures to the standalone ds_fee_structures table if they exist
            if (data.feeStructures && Array.isArray(data.feeStructures)) {
                console.log(`[DS Context] Syncing ${data.feeStructures.length} structures to ds_fee_structures table...`);
                for (const fee of data.feeStructures) {
                    await apiService.saveModuleRecord('ds_fee_structures', {
                        ...fee,
                        institutionId
                    }).catch(err => console.error("[DS Context] Failed to sync fee structure:", fee.id, err));
                }
            }

            const count = data.feeStructures?.length || 0;
            success(`Settings saved: ${count} fee structures synchronized.`);
            await onRefresh();
        } catch (err) {
            console.error("[DS Context] Save Error:", err);
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
            
            // Fetch institution details for PDF
            const insts = await apiService.fetchModuleRecords('institutions', institutionId);
            const inst = insts?.[0] || { name: 'Driving School' };

            // Generate PDF
            const doc = await generateDSPDF(type, data, student as any, settings, inst);
            const pdfBlob = doc.output('blob');
            const fileName = `${type === 'invoice' ? data.invoiceNumber : data.receiptNumber}.pdf`;
            const storagePath = `driving_school/${type}s/${fileName}`;

            // Upload to storage to get a public link
            let publicUrl = '';
            try {
                publicUrl = await apiService.uploadBlob(storagePath, pdfBlob, 'application/pdf');
            } catch (uploadErr) {
                console.error("[DS Automation] PDF Upload failed:", uploadErr);
            }

            // 1. Send Email with Attachment
            if (student.email) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const subject = `${inst.name} - ${type === 'invoice' ? 'Invoice' : 'Receipt'} #${type === 'invoice' ? data.invoiceNumber : data.receiptNumber}`;
                const body = `Dear ${student.fullName},\n\n` +
                             `Please find attached your ${type} from ${inst.name}.\n\n` +
                             `Document Number: #${type === 'invoice' ? data.invoiceNumber : data.receiptNumber}\n` +
                             `Amount: KES ${(data.totalAmount || data.amount).toLocaleString()}\n` +
                             (type === 'invoice' ? `Balance Due: KES ${data.balance?.toLocaleString()}\n` : '') +
                             `Date: ${new Date().toLocaleDateString()}\n\n` +
                             `You can also download it here: ${publicUrl || 'N/A'}\n\n` +
                             `Thank you for choosing ${inst.name}. We look forward to your success!`;
                
                const emailRes = await apiService.sendEmail(student.email, subject, body, undefined, undefined, [
                    { filename: fileName, content: pdfBase64, encoding: 'base64' }
                ]);
                if (emailRes && !emailRes.success) {
                    console.warn(`[DS Automation] Email delivery failed: ${emailRes.message}`);
                }
            }

            // 2. Send SMS with Link
            if (student.phone) {
                const shortUrl = publicUrl ? `\nDownload: ${publicUrl}` : '';
                const smsMessage = `Hello ${student.fullName}, your ${inst.name} ${type} #${type === 'invoice' ? data.invoiceNumber : data.receiptNumber} of KES ${(data.totalAmount || (data.amount || 0)).toLocaleString()} is ready.${shortUrl}`;
                
                if ((inst.smsBalance || 0) <= 0) {
                    error("Insufficient SMS units. Please top up to send student notifications.");
                    console.warn(`[DS Automation] Document SMS failed: Insufficient balance (${inst.smsBalance} units)`);
                } else {
                    const smsRes = await apiService.sendSms(student.phone, smsMessage, undefined, 1, institutionId);
                    if (smsRes && !smsRes.success) {
                        console.warn(`[DS Automation] SMS delivery failed: ${smsRes.message}`);
                    }
                }
            }

            console.log(`[DS Automation] Notifications successfully dispatched for ${type} to ${student.fullName}`);
        } catch (err) {
            console.error(`[DS Automation] Critical failure in notification workflow:`, err);
            // Non-blocking error for UI
        }
    }, [institutionId, students, settings]);

    const addInvoice = useCallback(async (data: any) => {
        try {
            const inv = {
                ...data,
                id: `inv_${Date.now()}`,
                institutionId,
                invoiceNumber: data.invoiceNumber || `${settings?.invoicePrefix || 'INV-'}${Date.now().toString().slice(-6)}`,
                items: (data.items || []).map((it: any) => ({ ...it, paidAmount: 0 })),
                status: 'Pending',
                paidAmount: 0,
                balance: data.totalAmount || 0,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_invoices', inv);
            success("Invoice generated successfully");
            
            // Trigger Automation
            await sendDocumentNotification('invoice', inv, inv.studentId);
            
            await onRefresh();
        } catch (err) {
            error("Failed to generate invoice");
            throw err;
        }
    }, [institutionId, onRefresh, success, error, students, settings, sendDocumentNotification]);

    const addPayment = useCallback(async (data: any) => {
        try {
            const pay = { 
                ...data, 
                id: `pay_${Date.now()}`, 
                institutionId,
                receiptNumber: data.receiptNumber || `${settings?.receiptPrefix || 'REC-'}${Date.now().toString().slice(-6)}`,
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
                        distributions.push(`${item.name}: ${distribution.toLocaleString()}`);
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

                summary = distributions.join(', ') + (newBalance > 0 ? ` | Balance: KES ${newBalance.toLocaleString()}` : ' | Fully Paid');

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
    }, [institutionId, onRefresh, success, error, students, settings, invoices, sendDocumentNotification]);

    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
    }), [students, instructors, vehicles, lessons]);

    const value = {
        instructors, vehicles, students, lessons, mastery, settings, invoices, payments,
        mpesaTransactions, bankTransactions,
        setInstructors, setVehicles, setStudents, setLessons, setMastery, setSettings, setInvoices, setPayments,
        addInstructor, addVehicle, updateVehicle, deleteVehicle, addStudent, updateStudent, deleteStudent, addLesson, updateLesson, addMastery, updateSettings, addInvoice, addPayment,
        refreshData, stats
    };

    return (
        <DrivingSchoolContext.Provider value={value}>
            {children}
        </DrivingSchoolContext.Provider>
    );
};
