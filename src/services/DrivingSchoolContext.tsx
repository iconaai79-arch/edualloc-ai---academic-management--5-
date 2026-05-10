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

const DrivingSchoolContext = createContext<DrivingSchoolContextType | undefined>(undefined);

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
        try {
            const payload = {
                ...data,
                id: data.id || settings?.id || `set_${Date.now()}`,
                institutionId
            };
            await apiService.saveModuleRecord('ds_settings', payload);
            success("Settings updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update settings");
            throw err;
        }
    }, [institutionId, settings, onRefresh, success, error]);

    const addInvoice = useCallback(async (data: any) => {
        try {
            const inv = {
                ...data,
                id: `inv_${Date.now()}`,
                institutionId,
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                status: 'Pending',
                paidAmount: 0,
                balance: data.totalAmount || 0,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_invoices', inv);
            success("Invoice generated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to generate invoice");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addPayment = useCallback(async (data: any) => {
        try {
            await apiService.saveModuleRecord('ds_payments', { ...data, id: `pay_${Date.now()}`, institutionId });
            success("Payment recorded successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to record payment");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

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
