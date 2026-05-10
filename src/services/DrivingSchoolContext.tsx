import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment } from '../types';
import { apiService } from './apiService';
import { useToast } from './ToastContext';

interface DrivingSchoolContextType {
    instructors: DSInstructor[];
    vehicles: DSVehicle[];
    students: DSStudent[];
    lessons: DSLesson[];
    mastery: DSSkillMastery[];
    settings: DSSettings | null;
    invoices: DSInvoice[];
    payments: DSPayment[];
    
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
    addStudent: (data: any) => Promise<void>;
    addLesson: (data: any) => Promise<void>;
    addMastery: (data: any) => Promise<void>;
    updateSettings: (data: any) => Promise<void>;
    addInvoice: (data: any) => Promise<void>;
    addPayment: (data: any) => Promise<void>;
    loadDSData: () => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(false);

    const loadDSData = useCallback(async () => {
        if (!institutionId) {
            console.log("[DSContext] loadDSData: No institutionId provided, skipping fetch.");
            return;
        }
        setIsLoading(true);
        console.log(`[DSContext] loadDSData: Starting fetch for institutionId=${institutionId}`);
        try {
            const [dsInst, dsVeh, dsStud, dsLess, dsMast, dsSet, dsInvs, dsPay] = await Promise.all([
                apiService.fetchModuleRecords<DSInstructor>('ds_instructors', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSVehicle>('ds_vehicles', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSStudent>('ds_students', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSLesson>('ds_lessons', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSSkillMastery>('ds_skill_mastery', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSSettings>('ds_settings', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSPayment>('ds_payments', institutionId).catch(() => []),
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
        } catch (err) {
            console.error("[DSContext] loadDSData: Failed to load DS data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadDSData();
    }, [loadDSData]);

    const onRefresh = loadDSData;

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
            await apiService.saveModuleRecord('ds_vehicles', { ...data, id: `vh_${Date.now()}`, institutionId });
            success("Vehicle registered successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to register vehicle");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addStudent = useCallback(async (data: any) => {
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
            const newStudent = { 
                ...data, 
                id: newId, 
                user_id: userId,
                institutionId,
                status: 'Enrolled',
                createdAt: new Date().toISOString()
            };
            
            await apiService.saveModuleRecord('ds_students', newStudent);
            success("Student enrolled successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to enroll student");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addLesson = useCallback(async (data: any) => {
        try {
            await apiService.saveModuleRecord('ds_lessons', { ...data, id: `less_${Date.now()}`, institutionId, status: 'Scheduled' });
            success("Lesson scheduled successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to schedule lesson");
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

    const updateSettings = useCallback(async (data: any) => {
        if (!institutionId) return;
        try {
            console.log("[DS Context] Init Save - Payload:", data);
            const payload = {
                ...data,
                id: data.id || settings?.id || `ds_settings_${institutionId}`,
                institutionId,
                updatedAt: new Date().toISOString()
            };
            
            const result = await apiService.saveModuleRecord('ds_settings', payload);
            console.log("[DS Context] Save Success - Response:", result);
            
            const count = data.feeStructures?.length || 0;
            success(`Settings saved: ${count} fee structures synchronized.`);
            await onRefresh();
        } catch (err) {
            console.error("[DS Context] Save Error:", err);
            error("Persistence Failure: Settings could not be saved to database.");
            throw err;
        }
    }, [institutionId, settings, onRefresh, success, error]);

    const sendDocumentNotification = async (type: 'invoice' | 'receipt', data: any, studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        try {
            // Fetch institution details for PDF
            const institutions = await apiService.fetchModuleRecords('institutions', institutionId);
            const inst = institutions?.[0] || { name: 'Driving School' };

            // Generate PDF
            const doc = generateDSPDF(type, data, student as any, settings, inst);
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            const fileName = `${type === 'invoice' ? data.invoiceNumber : data.receiptNumber}.pdf`;

            // 1. Send Email
            const subject = `${inst.name} - ${type === 'invoice' ? 'Invoice' : 'Receipt'} #${type === 'invoice' ? data.invoiceNumber : data.receiptNumber}`;
            const body = `Dear ${student.fullName},\n\nPlease find attached your ${type}. \n\nAmount: KES ${data.totalAmount || data.amount}\n\nThank you for choosing us!`;
            
            await apiService.sendEmail(student.email, subject, body, undefined, undefined, [
                { filename: fileName, content: pdfBase64, encoding: 'base64' }
            ]);

            // 2. Send SMS
            const smsMessage = `Hello ${student.fullName}, your ${type} #${type === 'invoice' ? data.invoiceNumber : data.receiptNumber} of KES ${data.totalAmount || data.amount} has been generated. Download it here: [LINK]`;
            await apiService.sendSms(student.phoneNumber, smsMessage, undefined, 1, institutionId);

            console.log(`[DS Automation] Notifications sent for ${type}`);
        } catch (err) {
            console.error(`[DS Automation] Failed to send notifications:`, err);
        }
    };

    const addInvoice = useCallback(async (data: any) => {
        try {
            const inv = {
                ...data,
                id: `inv_${Date.now()}`,
                institutionId,
                invoiceNumber: data.invoiceNumber || `${settings?.invoicePrefix || 'INV-'}${Date.now().toString().slice(-6)}`,
                status: 'Pending',
                paidAmount: 0,
                balance: data.totalAmount || 0,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_invoices', inv);
            success("Invoice generated successfully");
            
            // Trigger Automation
            sendDocumentNotification('invoice', inv, inv.studentId);
            
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
            await apiService.saveModuleRecord('ds_payments', pay);
            success("Payment recorded successfully");
            
            // Trigger Automation
            sendDocumentNotification('receipt', pay, pay.studentId);
            
            await onRefresh();
        } catch (err) {
            error("Failed to record payment");
            throw err;
        }
    }, [institutionId, onRefresh, success, error, students, settings, sendDocumentNotification]);

    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
    }), [students, instructors, vehicles, lessons]);

    const value = {
        instructors, vehicles, students, lessons, mastery, settings, invoices, payments,
        setInstructors, setVehicles, setStudents, setLessons, setMastery, setSettings, setInvoices, setPayments,
        addInstructor, addVehicle, addStudent, addLesson, addMastery, updateSettings, addInvoice, addPayment,
        loadDSData, stats
    };

    return (
        <DrivingSchoolContext.Provider value={value}>
            {children}
        </DrivingSchoolContext.Provider>
    );
};
