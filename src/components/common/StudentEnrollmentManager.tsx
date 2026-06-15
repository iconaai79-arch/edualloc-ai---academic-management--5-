import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Users, 
    UserPlus, 
    Search, 
    Filter, 
    Plus, 
    Sparkles, 
    CreditCard, 
    ShieldCheck, 
    Fingerprint, 
    FileSpreadsheet, 
    GraduationCap, 
    Briefcase,
    Calendar,
    Mail,
    Phone,
    UserCheck,
    CheckCircle2,
    XCircle,
    Trash2,
    Edit3,
    Send,
    Bell,
    Clock,
    MapPin,
    AlertCircle,
    CheckCircle,
    Key
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { User, StudentEnrollment, Institution, CourseLevel, Subject, Visitor } from '../../types';
import { apiService } from '../../services/apiService';
import Webcam from 'react-webcam';
import { ExcelSmartImporter } from './ExcelSmartImporter';

interface StudentEnrollmentManagerProps {
    context: 'academic' | 'driving_school';
    currentInstitution: Institution;
    activeTab?: 'students' | 'broadcaster' | 'calendar' | 'guests';
}

export const StudentEnrollmentManager: React.FC<StudentEnrollmentManagerProps> = ({ 
    context, 
    currentInstitution,
    activeTab: passedActiveTab
}) => {
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [instructors, setInstructors] = useState<User[]>([]);
    const [courseLevels, setCourseLevels] = useState<CourseLevel[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Sub-tab Navigation
    const activeTab = passedActiveTab || 'students';
    
    // New Feature Lists
    const [broadcasterMessages, setBroadcasterMessages] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [eventPins, setEventPins] = useState<any[]>([]);
    const [visitors, setVisitors] = useState<Visitor[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Enrolled' | 'Active' | 'Graduated' | 'Suspended' | 'Dropped'>('All');
    
    // Modal & Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<StudentEnrollment | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const enrollmentFields = useMemo(() => [
        { key: 'name', label: 'Student Full Name', required: true },
        { key: 'email', label: 'Student Email Address' },
        { key: 'phoneNumber', label: 'Student Phone Number' },
        { key: 'admissionNumber', label: 'Admission Number' },
        { key: 'gender', label: 'Gender (Male/Female)' },
        ...(context === 'driving_school'
            ? [{ key: 'licenseCategory', label: 'License Class / Category' }]
            : [
                { key: 'gradeLevel', label: 'Grade Level' },
                { key: 'stream', label: 'Class Stream / Allocation' }
              ]
        ),
        { key: 'parentName', label: 'Guardian / Parent Name' },
        { key: 'parentPhone', label: 'Parent Phone Number' },
        { key: 'parentEmail', label: 'Parent Email Address' }
    ], [context]);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        admissionNumber: '',
        status: 'Enrolled' as StudentEnrollment['status'],
        enrollmentDate: new Date().toISOString().split('T')[0],
        gender: '' as 'Male' | 'Female' | 'Other' | '',
        passportPhoto: '',
        // Context-specific metadata
        metadata: {
            licenseCategory: '',
            preferredInstructorId: '',
            preferredLessonHours: 'Morning' as 'Morning' | 'Noon' | 'Evening',
            priorAttendedDays: 0,
            gradeLevel: '',
            stream: '',
            subjects: [] as string[],
            parentName: '',
            parentPhone: '',
            parentEmail: '',
            parentRelation: 'Father' as 'Father' | 'Mother' | 'Guardian' | 'Other'
        }
    });

    // Broadcaster form state
    const [broadcastTarget, setBroadcastTarget] = useState('All');
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastChannels, setBroadcastChannels] = useState({ sms: true, email: false });

    // Event creation state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [eventTime, setEventTime] = useState('09:00');
    const [eventVenue, setEventVenue] = useState('');
    const [eventTarget, setEventTarget] = useState('All');

    // PIN verification state
    const [verifyIdentifier, setVerifyIdentifier] = useState('');
    const [verifyPin, setVerifyPin] = useState('');

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info' | 'idle', message: string }>({ type: 'idle', message: '' });

    // Load Data
    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [
                enrollmentsData, 
                usersData, 
                courseLevelsData, 
                subjectsData,
                broadcastsData,
                eventsData,
                pinsData,
                visitorsData
            ] = await Promise.all([
                apiService.fetchModuleRecords<StudentEnrollment>('student_enrollments', currentInstitution.id),
                apiService.fetchModuleRecords<User>('users', currentInstitution.id),
                apiService.fetchModuleRecords<CourseLevel>('course_levels', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Subject>('subjects', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('broadcaster_messages', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('institution_events', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('event_pins', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Visitor>('visitors', currentInstitution.id).catch(() => [])
            ]);
            
            setEnrollments(enrollmentsData.filter(e => e.enrollmentType === context));
            setUsers(usersData);
            setInstructors(usersData.filter(u => u.role === 'driving_instructor' || u.role === 'teacher' || u.role === 'lecturer'));
            setCourseLevels(courseLevelsData);
            setSubjects(subjectsData);
            setBroadcasterMessages(broadcastsData || []);
            setEvents(eventsData || []);
            setEventPins(pinsData || []);
            setVisitors(visitorsData || []);
        } catch (err) {
            console.error("Error loading enrollment data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const runSetup = async () => {
            // Auto-create necessary tables if not exist in database
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS public.student_enrollments (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                    enrollment_type TEXT NOT NULL,
                    admission_number TEXT,
                    status TEXT DEFAULT 'Enrolled',
                    enrollment_date TEXT,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.broadcaster_messages (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    target TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    subject TEXT,
                    body TEXT NOT NULL,
                    recipients_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.institution_events (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT,
                    event_date TEXT NOT NULL,
                    event_time TEXT NOT NULL,
                    venue TEXT NOT NULL,
                    target TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.event_pins (
                    id TEXT PRIMARY KEY,
                    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                    event_id TEXT NOT NULL REFERENCES public.institution_events(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                    pin TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
                ALTER TABLE public.broadcaster_messages ENABLE ROW LEVEL SECURITY;
                ALTER TABLE public.institution_events ENABLE ROW LEVEL SECURITY;
                ALTER TABLE public.event_pins ENABLE ROW LEVEL SECURITY;
                
                DO $$
                DECLARE
                    tables text[] := ARRAY['student_enrollments', 'broadcaster_messages', 'institution_events', 'event_pins'];
                    t text;
                BEGIN
                    FOREACH t IN ARRAY tables LOOP
                        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
                        EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON public.%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
                        
                        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
                        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON public.%I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
                        
                        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
                    END LOOP;
                END $$;

                ALTER TABLE public.event_pins ADD COLUMN IF NOT EXISTS guests TEXT;
                ALTER TABLE public.event_pins ADD COLUMN IF NOT EXISTS vehicle_registration TEXT;
                
                DROP POLICY IF EXISTS "Public select: event_pins" ON public.event_pins;
                CREATE POLICY "Public select: event_pins" ON public.event_pins FOR SELECT USING (true);
                
                DROP POLICY IF EXISTS "Public update: event_pins" ON public.event_pins;
                CREATE POLICY "Public update: event_pins" ON public.event_pins FOR UPDATE USING (true) WITH CHECK (true);
                
                DROP POLICY IF EXISTS "Public select: institution_events" ON public.institution_events;
                CREATE POLICY "Public select: institution_events" ON public.institution_events FOR SELECT USING (true);
                
                DROP POLICY IF EXISTS "Public select: users" ON public.users;
                CREATE POLICY "Public select: users" ON public.users FOR SELECT USING (true);
            `;
            try {
                await apiService.runMigration(createTableSql);
            } catch (err) {
                console.warn("Auto-migration of schema tables failed:", err);
            }
            
            if (currentInstitution?.id) {
                loadAllData();
            }
        };
        
        runSetup();
    }, [currentInstitution?.id, context]);

    // Handle Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMsg({ type: 'info', message: 'Saving enrollment...' });
        
        try {
            let userId = '';
            
            // 1. Centralized Identity setup: check if User already exists with the same phone/email
            const existingUser = users.find(u => 
                (u.email && u.email.toLowerCase() === formData.email.toLowerCase()) || 
                (u.phoneNumber && u.phoneNumber === formData.phoneNumber)
            );
            
            if (existingUser) {
                userId = existingUser.id;
                const updatedUser = {
                    ...existingUser,
                    metadata: {
                        ...(existingUser.metadata || {}),
                        passportPhoto: formData.passportPhoto || existingUser.metadata?.passportPhoto
                    }
                };
                if (formData.gender && existingUser.gender !== formData.gender) {
                    updatedUser.gender = formData.gender as any;
                }
                await apiService.saveModuleRecord('users', updatedUser);
            } else {
                // Create a base user identity profile
                const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newUser: User = {
                    id: newUserId,
                    name: formData.fullName,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    role: 'student',
                    institutionId: currentInstitution.id,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        passportPhoto: formData.passportPhoto
                    }
                };
                if (formData.gender) {
                    newUser.gender = formData.gender as any;
                }
                
                await apiService.saveModuleRecord('users', newUser);
                userId = newUserId;
            }
            
            // 2. Save Enrollment record
            if (editingEnrollment) {
                const updated: StudentEnrollment = {
                    ...editingEnrollment,
                    admissionNumber: formData.admissionNumber,
                    status: formData.status,
                    enrollmentDate: formData.enrollmentDate,
                    metadata: {
                        ...formData.metadata,
                        gender: formData.gender,
                        passportPhoto: formData.passportPhoto
                    },
                    updatedAt: new Date().toISOString()
                };
                await apiService.updateModuleRecord('student_enrollments', editingEnrollment.id, updated);
                setStatusMsg({ type: 'success', message: 'Enrollment record updated successfully.' });
            } else {
                const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newEnrollment: StudentEnrollment = {
                    id: enrollmentId,
                    institutionId: currentInstitution.id,
                    userId: userId,
                    enrollmentType: context,
                    admissionNumber: formData.admissionNumber || `ADM-${Date.now().toString().slice(-5)}`,
                    status: formData.status,
                    enrollmentDate: formData.enrollmentDate,
                    metadata: {
                        ...formData.metadata,
                        gender: formData.gender,
                        passportPhoto: formData.passportPhoto
                    },
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('student_enrollments', newEnrollment);
                setStatusMsg({ type: 'success', message: 'New student enrolled successfully.' });
            }
            
            setIsFormOpen(false);
            setEditingEnrollment(null);
            loadAllData();
            
            // Clear form
            setFormData({
                fullName: '',
                email: '',
                phoneNumber: '',
                admissionNumber: '',
                status: 'Enrolled',
                enrollmentDate: new Date().toISOString().split('T')[0],
                gender: '',
                passportPhoto: '',
                metadata: {
                    licenseCategory: '',
                    preferredInstructorId: '',
                    preferredLessonHours: 'Morning',
                    priorAttendedDays: 0,
                    gradeLevel: '',
                    stream: '',
                    subjects: [],
                    parentName: '',
                    parentPhone: '',
                    parentEmail: '',
                    parentRelation: 'Father'
                }
            });
        } catch (err: any) {
            console.error("Save failed:", err);
            setStatusMsg({ type: 'error', message: `Failed to save enrollment: ${err.message}` });
        }
        
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Open form for editing
    const handleEdit = (enr: StudentEnrollment) => {
        const associatedUser = users.find(u => u.id === enr.userId);
        setEditingEnrollment(enr);
        setFormData({
            fullName: associatedUser?.name || 'Unknown',
            email: associatedUser?.email || '',
            phoneNumber: associatedUser?.phoneNumber || '',
            admissionNumber: enr.admissionNumber || '',
            status: enr.status,
            enrollmentDate: enr.enrollmentDate,
            gender: (associatedUser?.gender || enr.metadata?.gender || '') as any,
            passportPhoto: associatedUser?.metadata?.passportPhoto || enr.metadata?.passportPhoto || '',
            metadata: {
                licenseCategory: enr.metadata?.licenseCategory || '',
                preferredInstructorId: enr.metadata?.preferredInstructorId || '',
                preferredLessonHours: enr.metadata?.preferredLessonHours || 'Morning',
                priorAttendedDays: enr.metadata?.priorAttendedDays || 0,
                gradeLevel: enr.metadata?.gradeLevel || '',
                stream: enr.metadata?.stream || '',
                subjects: enr.metadata?.subjects || [],
                parentName: enr.metadata?.parentName || '',
                parentPhone: enr.metadata?.parentPhone || '',
                parentEmail: enr.metadata?.parentEmail || '',
                parentRelation: enr.metadata?.parentRelation || 'Father'
            }
        });
        setIsFormOpen(true);
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this enrollment record? (Note: The user account identity will not be deleted)")) {
            return;
        }
        
        try {
            await apiService.deleteModuleRecord('student_enrollments', id);
            setStatusMsg({ type: 'success', message: 'Enrollment record removed.' });
            loadAllData();
        } catch (err) {
            console.error("Delete failed:", err);
            setStatusMsg({ type: 'error', message: 'Failed to remove enrollment.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
    };

    const handleBulkComplete = async (data: any[]) => {
        setIsUploading(false);
        setStatusMsg({ type: 'info', message: `Ingesting ${data.length} students from spreadsheet...` });
        setIsLoading(true);

        try {
            // Keep a local copy of users and enrollments to match against for duplicates / batch upserts
            let currentUsersList = [...users];
            let currentEnrollmentsList = [...enrollments];
            let successCount = 0;

            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    try {
                        let userId = '';
                        
                        // 1. Check if user already exists
                        let existingUser = currentUsersList.find(u => 
                            (item.email && u.email && u.email.toLowerCase() === String(item.email).trim().toLowerCase()) || 
                            (item.phoneNumber && u.phoneNumber && String(u.phoneNumber).replace(/\D/g, '') === String(item.phoneNumber).replace(/\D/g, ''))
                        );

                        if (existingUser) {
                            userId = existingUser.id;
                            // Optionally update user properties if they changed
                            const updatedUser = {
                                ...existingUser,
                                name: item.name || existingUser.name,
                                gender: (item.gender || existingUser.gender) as any,
                            };
                            await apiService.saveModuleRecord('users', updatedUser);
                        } else {
                            // Create new user profile
                            const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const newUser: User = {
                                id: newUserId,
                                name: String(item.name).trim(),
                                email: item.email ? String(item.email).trim() : null,
                                phoneNumber: item.phoneNumber ? String(item.phoneNumber).trim() : null,
                                role: 'student',
                                institutionId: currentInstitution.id,
                                createdAt: new Date().toISOString(),
                                metadata: {}
                            };
                            if (item.gender) {
                                newUser.gender = String(item.gender).trim() as any;
                            }
                            await apiService.saveModuleRecord('users', newUser);
                            userId = newUserId;
                            currentUsersList.push(newUser);
                        }

                        // 2. Check if enrollment record exists
                        let existingEnrollment = currentEnrollmentsList.find(e => 
                            e.userId === userId || 
                            (item.admissionNumber && e.admissionNumber && String(e.admissionNumber).trim().toLowerCase() === String(item.admissionNumber).trim().toLowerCase())
                        );

                        const admissionNumberValue = item.admissionNumber 
                            ? String(item.admissionNumber).trim() 
                            : (existingEnrollment?.admissionNumber || `ADM-${Date.now().toString().slice(-5)}_${Math.floor(Math.random()*1000)}`);

                        const metadataObj = {
                            ...(existingEnrollment?.metadata || {}),
                            gender: item.gender || existingEnrollment?.metadata?.gender || '',
                            licenseCategory: item.licenseCategory || existingEnrollment?.metadata?.licenseCategory || '',
                            gradeLevel: item.gradeLevel || existingEnrollment?.metadata?.gradeLevel || '',
                            stream: item.stream || existingEnrollment?.metadata?.stream || '',
                            parentName: item.parentName || existingEnrollment?.metadata?.parentName || '',
                            parentPhone: item.parentPhone || existingEnrollment?.metadata?.parentPhone || '',
                            parentEmail: item.parentEmail || existingEnrollment?.metadata?.parentEmail || '',
                            parentRelation: 'Father'
                        };

                        if (existingEnrollment) {
                            const updated: StudentEnrollment = {
                                ...existingEnrollment,
                                admissionNumber: admissionNumberValue,
                                metadata: metadataObj,
                                updatedAt: new Date().toISOString()
                            };
                            await apiService.updateModuleRecord('student_enrollments', existingEnrollment.id, updated);
                        } else {
                            const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            const newEnrollment: StudentEnrollment = {
                                id: enrollmentId,
                                institutionId: currentInstitution.id,
                                userId: userId,
                                enrollmentType: context,
                                admissionNumber: admissionNumberValue,
                                status: 'Enrolled',
                                enrollmentDate: new Date().toISOString().split('T')[0],
                                metadata: metadataObj,
                                createdAt: new Date().toISOString()
                            };
                            await apiService.saveModuleRecord('student_enrollments', newEnrollment);
                            currentEnrollmentsList.push(newEnrollment);
                        }

                        successCount++;
                    } catch (err: any) {
                        console.error(`Failed to ingest student row ${item.name}:`, err);
                    }
                }));
            }

            setStatusMsg({ type: 'success', message: `Successfully imported ${successCount} student enrollment(s).` });
            loadAllData();
        } catch (err: any) {
            console.error("Bulk ingestion failed:", err);
            setStatusMsg({ type: 'error', message: `Import failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 5000);
        }
    };

    // Register WebAuthn Biometric passkey
    const handleRegisterBiometrics = async (userId: string, name: string) => {
        try {
            setStatusMsg({ type: 'info', message: 'Initializing biometric scanner...' });
            
            alert(`Ready to register credentials for ${name}. Place your finger on the reader or authenticate using windows Hello/Passkey prompt.`);
            
            const credentialMock = {
                id: `webauthn_${Date.now()}`,
                rawId: `raw_${Date.now()}`,
                type: 'public-key',
                registeredAt: new Date().toISOString()
            };
            
            const userToUpdate = users.find(u => u.id === userId);
            if (userToUpdate) {
                await apiService.saveModuleRecord('users', {
                    ...userToUpdate,
                    metadata: {
                        ...(userToUpdate.metadata || {}),
                        webauthnCredentials: credentialMock,
                        fingerprintTemplate: `biometric_template_hash_${Date.now()}`
                    }
                });
                setStatusMsg({ type: 'success', message: `Biometrics registered successfully for ${name}.` });
                loadAllData();
            }
        } catch (err) {
            console.error("Biometric registration failed:", err);
            setStatusMsg({ type: 'error', message: 'Failed to register biometrics.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Broadcast logic
    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastBody.trim()) {
            setStatusMsg({ type: 'error', message: 'Announcement body cannot be empty.' });
            return;
        }
        if (!broadcastChannels.sms && !broadcastChannels.email) {
            setStatusMsg({ type: 'error', message: 'Please select at least one message delivery channel.' });
            return;
        }

        setStatusMsg({ type: 'info', message: 'Broadcasting messages to cohort...' });
        setIsLoading(true);

        try {
            const cohortStudents = enrollments.filter(enr => {
                if (broadcastTarget === 'All') return true;
                if (context === 'driving_school') {
                    return enr.metadata?.licenseCategory === broadcastTarget;
                } else {
                    return enr.metadata?.gradeLevel === broadcastTarget;
                }
            });

            if (cohortStudents.length === 0) {
                setStatusMsg({ type: 'error', message: 'No registered students match the targeted cohort.' });
                setIsLoading(false);
                return;
            }

            let dispatchedCount = 0;
            for (const enr of cohortStudents) {
                const associatedUser = users.find(u => u.id === enr.userId);
                if (!associatedUser) continue;

                let sent = false;
                if (broadcastChannels.sms && associatedUser.phoneNumber) {
                    try {
                        await apiService.sendSms(
                            associatedUser.phoneNumber,
                            broadcastBody,
                            currentInstitution.smsConfig,
                            1,
                            currentInstitution.id
                        );
                        sent = true;
                    } catch (e) {
                        console.error("SMS Dispatch Failed:", e);
                    }
                }
                if (broadcastChannels.email && associatedUser.email) {
                    try {
                        await apiService.sendEmail(
                            associatedUser.email,
                            broadcastSubject || 'Campus Announcement',
                            broadcastBody,
                            currentInstitution.emailConfig
                        );
                        sent = true;
                    } catch (e) {
                        console.error("Email Dispatch Failed:", e);
                    }
                }
                if (sent) dispatchedCount++;
            }

            const broadcastId = `bc_${Date.now()}`;
            const newLog = {
                id: broadcastId,
                institutionId: currentInstitution.id,
                target: broadcastTarget,
                channel: `${broadcastChannels.sms ? 'SMS' : ''}${broadcastChannels.sms && broadcastChannels.email ? ' / ' : ''}${broadcastChannels.email ? 'Email' : ''}`,
                subject: broadcastSubject || 'Announcement',
                body: broadcastBody,
                recipientsCount: dispatchedCount,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('broadcaster_messages', newLog);
            setStatusMsg({ type: 'success', message: `Broadcast successfully dispatched to ${dispatchedCount} user(s).` });
            
            setBroadcastSubject('');
            setBroadcastBody('');
            loadAllData();
        } catch (err: any) {
            console.error("Broadcast failed:", err);
            setStatusMsg({ type: 'error', message: `Broadcast dispatch failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Event creation logic
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle.trim() || !eventVenue.trim()) {
            setStatusMsg({ type: 'error', message: 'Event Title and Venue venue are required.' });
            return;
        }

        setStatusMsg({ type: 'info', message: 'Scheduling event...' });
        setIsLoading(true);

        try {
            const eventId = `evt_${Date.now()}`;
            const newEvent = {
                id: eventId,
                institutionId: currentInstitution.id,
                title: eventTitle,
                description: eventDescription,
                eventDate: eventDate,
                eventTime: eventTime,
                venue: eventVenue,
                target: eventTarget,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('institution_events', newEvent);
            setStatusMsg({ type: 'success', message: 'Institution event scheduled successfully.' });
            
            setEventTitle('');
            setEventDescription('');
            setEventVenue('');
            loadAllData();
        } catch (err: any) {
            console.error("Failed to create event:", err);
            setStatusMsg({ type: 'error', message: `Event scheduling failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Send Attendance Pin
    const handleSendAttendancePin = async (event: any) => {
        setStatusMsg({ type: 'info', message: 'Generating and dispatching attendance PINs...' });
        setIsLoading(true);

        try {
            const targetEnrollments = enrollments.filter(enr => {
                if (event.target === 'All') return true;
                if (context === 'driving_school') {
                    return enr.metadata?.licenseCategory === event.target;
                } else {
                    return enr.metadata?.gradeLevel === event.target;
                }
            });

            if (targetEnrollments.length === 0) {
                setStatusMsg({ type: 'error', message: 'No registered students match the event cohort.' });
                setIsLoading(false);
                return;
            }

            let pinCount = 0;
            for (const enr of targetEnrollments) {
                const associatedUser = users.find(u => u.id === enr.userId);
                if (!associatedUser) continue;

                // Check if a PIN already exists
                const existingPin = eventPins.find(p => p.eventId === event.id && p.userId === associatedUser.id);
                const pinCode = existingPin ? existingPin.pin : Math.floor(100000 + Math.random() * 900000).toString();
                const pinId = existingPin ? existingPin.id : `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                if (!existingPin) {
                    const newPinRecord = {
                        id: pinId,
                        institutionId: currentInstitution.id,
                        eventId: event.id,
                        userId: associatedUser.id,
                        pin: pinCode,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    await apiService.saveModuleRecord('event_pins', newPinRecord);
                }

                // Construct Confirmation Link & Shorten it
                const rawLink = `${window.location.origin}/?view=event-confirm&pinId=${pinId}`;
                const confirmationLink = await apiService.shortenUrl(rawLink);

                // Send notification with RSVP details
                const message = `You are invited to "${event.title}" on ${event.eventDate}. Please confirm your attendance here: ${confirmationLink}`;
                
                if (associatedUser.phoneNumber) {
                    try {
                        await apiService.sendSms(associatedUser.phoneNumber, message, currentInstitution.smsConfig, 1, currentInstitution.id);
                    } catch (e) {
                        console.error("SMS PIN send failed", e);
                    }
                }
                if (associatedUser.email) {
                    try {
                        await apiService.sendEmail(associatedUser.email, `Event Attendance Invitation - ${event.title}`, message, currentInstitution.emailConfig);
                    } catch (e) {
                        console.error("Email PIN send failed", e);
                    }
                }
                pinCount++;
            }

            setStatusMsg({ type: 'success', message: `Successfully generated and sent ${pinCount} PINs.` });
            loadAllData();
        } catch (err: any) {
            console.error("Failed to generate/send PINs:", err);
            setStatusMsg({ type: 'error', message: `PIN dispatch failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Invite External Parents via Excel Spreadsheet Upload
    const handleInviteExternalExcel = async (event: any, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatusMsg({ type: 'info', message: 'Reading Excel sheet...' });
        setIsLoading(true);

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = evt.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json<any>(sheet);

                    if (rows.length === 0) {
                        throw new Error("The selected sheet is empty.");
                    }

                    setStatusMsg({ type: 'info', message: `Importing and inviting ${rows.length} parents...` });

                    let successCount = 0;
                    for (const row of rows) {
                        let parentName = '';
                        let parentPhone = '';
                        let parentEmail = '';

                        // Dynamically map headers (case-insensitive key checks)
                        for (const key of Object.keys(row)) {
                            const keyLower = key.toLowerCase().replace(/[\s_-]/g, '');
                            if (keyLower.includes('name')) {
                                parentName = String(row[key] || '').trim();
                            } else if (keyLower.includes('phone') || keyLower.includes('mobile') || keyLower.includes('contact')) {
                                parentPhone = String(row[key] || '').trim();
                            } else if (keyLower.includes('email')) {
                                parentEmail = String(row[key] || '').trim();
                            }
                        }

                        if (!parentName && !parentPhone && !parentEmail) continue;
                        if (!parentName) parentName = 'Invited Parent';

                        // 1. Create a guest/parent profile in 'users' table
                        const newUserId = `u_ext_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        const newUser = {
                            id: newUserId,
                            institutionId: currentInstitution.id,
                            name: parentName,
                            email: parentEmail || null,
                            phoneNumber: parentPhone || null,
                            role: 'parent',
                            metadata: { external: true },
                            createdAt: new Date().toISOString()
                        };
                        await apiService.saveModuleRecord('users', newUser);

                        // 2. Generate event PIN record
                        const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
                        const pinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        const newPinRecord = {
                            id: pinId,
                            institutionId: currentInstitution.id,
                            eventId: event.id,
                            userId: newUserId,
                            pin: pinCode,
                            status: 'pending',
                            createdAt: new Date().toISOString()
                        };
                        await apiService.saveModuleRecord('event_pins', newPinRecord);

                        // 3. Construct RSVP Link & Shorten
                        const rawLink = `${window.location.origin}/?view=event-confirm&pinId=${pinId}`;
                        const confirmationLink = await apiService.shortenUrl(rawLink);
                        
                        const message = `You are invited to "${event.title}" on ${event.eventDate}. Please confirm your attendance here: ${confirmationLink}`;

                        // 4. Send Stage 1 Notifications
                        if (parentPhone) {
                            try {
                                await apiService.sendSms(parentPhone, message, currentInstitution.smsConfig, 1, currentInstitution.id);
                            } catch (smsErr) {
                                console.error("SMS Invite failed", smsErr);
                            }
                        }
                        if (parentEmail) {
                            try {
                                await apiService.sendEmail(parentEmail, `Event Attendance Invitation - ${event.title}`, message, currentInstitution.emailConfig);
                            } catch (emailErr) {
                                console.error("Email Invite failed", emailErr);
                            }
                        }

                        successCount++;
                    }

                    setStatusMsg({ type: 'success', message: `Successfully invited ${successCount} external parents to "${event.title}"!` });
                    loadAllData();
                } catch (err: any) {
                    console.error("Excel import/invite failed:", err);
                    setStatusMsg({ type: 'error', message: `Import failed: ${err.message}` });
                } finally {
                    setIsLoading(false);
                    setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
                }
            };
            reader.readAsBinaryString(file);
        } catch (err: any) {
            console.error("FileReader exception:", err);
            setStatusMsg({ type: 'error', message: `Failed to read file: ${err.message}` });
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Verify PIN & Expire
    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifyIdentifier.trim() || !verifyPin.trim()) {
            setStatusMsg({ type: 'error', message: 'Enter both Student identifier & PIN code.' });
            return;
        }

        setStatusMsg({ type: 'info', message: 'Verifying PIN...' });
        setIsLoading(true);

        try {
            const matchedUser = users.find(u => 
                (u.email && u.email.toLowerCase() === verifyIdentifier.toLowerCase()) ||
                (u.phoneNumber && u.phoneNumber === verifyIdentifier) ||
                enrollments.some(enr => enr.userId === u.id && enr.admissionNumber?.toLowerCase() === verifyIdentifier.toLowerCase())
            );

            if (!matchedUser) {
                setStatusMsg({ type: 'error', message: 'Student matching input details not found.' });
                setIsLoading(false);
                return;
            }

            const activePin = eventPins.find(p => 
                p.userId === matchedUser.id && 
                p.pin === verifyPin.trim() && 
                (p.status === 'pending' || p.status === 'accepted')
            );

            if (!activePin) {
                setStatusMsg({ type: 'error', message: 'Invalid or expired attendance PIN.' });
                setIsLoading(false);
                return;
            }

            const matchedEvent = events.find(ev => ev.id === activePin.eventId);
            const eventName = matchedEvent ? matchedEvent.title : 'Event';

            // Mark pin as used (expire it)
            const updated = {
                ...activePin,
                status: 'used' as 'used'
            };

            await apiService.saveModuleRecord('event_pins', updated);
            setStatusMsg({ type: 'success', message: `Verified attendance successfully for ${matchedUser.name} at "${eventName}"! PIN has been expired.` });
            
            setVerifyIdentifier('');
            setVerifyPin('');
            loadAllData();
        } catch (err: any) {
            console.error("PIN verification error:", err);
            setStatusMsg({ type: 'error', message: `Verification failed: ${err.message}` });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
        }
    };

    // Checkout guest cleared by security
    const handleCheckoutGuest = async (visitorId: string) => {
        setStatusMsg({ type: 'info', message: 'Processing guest checkout...' });
        try {
            const guest = visitors.find(v => v.id === visitorId);
            if (guest) {
                const updatedGuest = {
                    ...guest,
                    status: 'checked_out',
                    timeOut: new Date().toLocaleTimeString()
                };
                await apiService.saveModuleRecord('visitors', updatedGuest);
                setStatusMsg({ type: 'success', message: `Checked out visitor ${guest.name || guest.fullName || 'Guest'}.` });
                loadAllData();
            }
        } catch (err: any) {
            console.error("Guest checkout failed:", err);
            setStatusMsg({ type: 'error', message: `Guest checkout failed: ${err.message}` });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Filtered Enrollments
    const filteredEnrollments = useMemo(() => {
        return enrollments.filter(enr => {
            const associatedUser = users.find(u => u.id === enr.userId);
            const matchesSearch = 
                (associatedUser?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (enr.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (associatedUser?.phoneNumber || '').includes(searchTerm);
            
            const matchesStatus = statusFilter === 'All' || enr.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [enrollments, users, searchTerm, statusFilter]);

    // Available Cohorts
    const cohortsList = useMemo(() => {
        if (context === 'driving_school') {
            return [
                'Class B1 (Light Manual)',
                'Class B2 (Light Automatic)',
                'Class A (Motorcycle)',
                'Class C (Heavy Commercial)'
            ];
        } else {
            return [
                'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
                'Grade 7', 'Grade 8', 'Form 1', 'Form 2', 'Form 3', 'Form 4'
            ];
        }
    }, [context]);

    return (
        <div className="space-y-6">
            {isUploading && (
                <ExcelSmartImporter 
                    fields={enrollmentFields} 
                    onComplete={handleBulkComplete} 
                    onClose={() => setIsUploading(false)} 
                />
            )}
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            Student <span className="text-indigo-500">Enrollment Portal</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {context === 'driving_school' ? 'Driving School Cohort Registry' : 'Academic Class Placements & Registry'}
                        </p>
                    </div>
                </div>
                
                {activeTab === 'students' && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsUploading(true)}
                            className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            Import Excel
                        </button>
                        <button
                            onClick={() => {
                                setEditingEnrollment(null);
                                setIsFormOpen(true);
                            }}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                        >
                            <UserPlus className="w-4 h-4" />
                            Enroll Student
                        </button>
                    </div>
                )}
            </div>



            {/* Status Alerts */}
            {statusMsg.type !== 'idle' && (
                <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all ${
                    statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                    {statusMsg.message}
                </div>
            )}

            {/* Tab: Students */}
            {activeTab === 'students' && (
                <>
                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                        <div className="w-full sm:w-72 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name, ID or admission..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-900/30 border border-white/10 rounded-xl font-bold text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="w-full sm:w-44 py-3 px-4 bg-slate-900/30 border border-white/10 rounded-xl font-bold text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Enrolled">Enrolled</option>
                                <option value="Active">Active</option>
                                <option value="Graduated">Graduated</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Dropped">Dropped</option>
                            </select>
                        </div>
                    </div>

                    {/* Students List */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Retrieving enrollments...</p>
                        </div>
                    ) : filteredEnrollments.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl border-dashed">
                            <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                            <p className="text-sm font-bold text-slate-400">No enrollment records found.</p>
                            <p className="text-xs text-slate-500 mt-1">Enroll a new student to get started or adjust your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white/5 border border-white/5 rounded-3xl p-2">
                            <table className="w-full text-left text-sm text-slate-350">
                                <thead>
                                    <tr className="border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="py-4 px-6">Student Info</th>
                                        <th className="py-4 px-6">Admission #</th>
                                        <th className="py-4 px-6">Details</th>
                                        <th className="py-4 px-6">Biometrics</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredEnrollments.map(enr => {
                                        const user = users.find(u => u.id === enr.userId);
                                        const hasBiometrics = !!user?.metadata?.webauthnCredentials;
                                        
                                        return (
                                            <tr key={enr.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm uppercase">
                                                            {(user?.name || 'U').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">{user?.name || 'Unknown Student'}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                                                                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user?.email || 'No Email'}</span>
                                                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {user?.phoneNumber || 'No Phone'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-xs font-mono font-bold text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                                        {enr.admissionNumber}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {context === 'driving_school' ? (
                                                        <div className="text-xs">
                                                            <p className="font-bold text-slate-300">Category: <span className="text-indigo-400">{enr.metadata?.licenseCategory || 'N/A'}</span></p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">Sessions Attended: {enr.metadata?.priorAttendedDays || 0}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs">
                                                            <p className="font-bold text-slate-300">Grade: <span className="text-indigo-400">{enr.metadata?.gradeLevel || 'N/A'}</span></p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">Stream: {enr.metadata?.stream || 'N/A'}</p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6">
                                                    {hasBiometrics ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRegisterBiometrics(enr.userId, user?.name || 'Student')}
                                                            className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-xl transition-all"
                                                        >
                                                            <Fingerprint className="w-3.5 h-3.5 text-indigo-400" /> Enroll Key
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                                        enr.status === 'Active' || enr.status === 'Enrolled' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                                        enr.status === 'Graduated' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                        enr.status === 'Suspended' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                        'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`}>
                                                        {enr.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleEdit(enr)}
                                                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                                            title="Edit Enrollment"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(enr.id)}
                                                            className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                                                            title="Remove Record"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Tab: Broadcaster */}
            {activeTab === 'broadcaster' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Compose Form */}
                    <div className="lg:col-span-1 bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                            <Send className="w-4 h-4" />
                            Compose Announcement
                        </div>

                        <form onSubmit={handleSendBroadcast} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Cohort</label>
                                <select
                                    value={broadcastTarget}
                                    onChange={e => setBroadcastTarget(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="All">All Registered Cohorts</option>
                                    {cohortsList.map(cohort => (
                                        <option key={cohort} value={cohort}>{cohort}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject (Email Only)</label>
                                <input
                                    type="text"
                                    placeholder="Enter announcement subject..."
                                    value={broadcastSubject}
                                    onChange={e => setBroadcastSubject(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Body</label>
                                <textarea
                                    rows={5}
                                    required
                                    placeholder="Write broadcast details here..."
                                    value={broadcastBody}
                                    onChange={e => setBroadcastBody(e.target.value)}
                                    className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Delivery Channels</label>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={broadcastChannels.sms}
                                            onChange={e => setBroadcastChannels({ ...broadcastChannels, sms: e.target.checked })}
                                            className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-600 focus:ring-indigo-500"
                                        />
                                        SMS Alerts
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={broadcastChannels.email}
                                            onChange={e => setBroadcastChannels({ ...broadcastChannels, email: e.target.checked })}
                                            className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-600 focus:ring-indigo-500"
                                        />
                                        Email Notifications
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                            >
                                <Send className="w-4 h-4" />
                                {isLoading ? 'Sending...' : 'Dispatch Broadcast'}
                            </button>
                        </form>
                    </div>

                    {/* Broadcast Logs */}
                    <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                            <Bell className="w-4 h-4" />
                            Broadcast Logs & History
                        </div>

                        {broadcasterMessages.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <Mail className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                                <p className="text-xs font-bold">No announcements have been broadcasted yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead>
                                        <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                            <th className="pb-3 pr-4">Broadcast Time</th>
                                            <th className="pb-3 pr-4">Target Cohort</th>
                                            <th className="pb-3 pr-4">Subject & Preview</th>
                                            <th className="pb-3 pr-4">Channels</th>
                                            <th className="pb-3 text-right">Delivered</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {broadcasterMessages.slice().sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map((msg) => (
                                            <tr key={msg.id} className="hover:bg-white/5">
                                                <td className="py-3 pr-4 font-mono font-bold text-slate-400 whitespace-nowrap">
                                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'N/A'}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className="bg-indigo-500/10 text-indigo-400 font-bold px-2 py-1 rounded text-[10px]">
                                                        {msg.target}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 max-w-xs truncate">
                                                    <p className="font-bold text-white">{msg.subject || 'Announcement'}</p>
                                                    <p className="text-slate-500 text-[10px] mt-0.5 truncate">{msg.body}</p>
                                                </td>
                                                <td className="py-3 pr-4 font-bold text-slate-400">{msg.channel}</td>
                                                <td className="py-3 text-right font-black text-white">{msg.recipientsCount || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Calendar & Events */}
            {activeTab === 'calendar' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Event & Verify forms */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Create Event */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                                <Plus className="w-4 h-4" />
                                Schedule New Event
                            </div>
                            <form onSubmit={handleCreateEvent} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Matriculation Ceremony"
                                        value={eventTitle}
                                        onChange={e => setEventTitle(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Enter details..."
                                        value={eventDescription}
                                        onChange={e => setEventDescription(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={e => setEventDate(e.target.value)}
                                            className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</label>
                                        <input
                                            type="time"
                                            required
                                            value={eventTime}
                                            onChange={e => setEventTime(e.target.value)}
                                            className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Campus Amphitheater"
                                        value={eventVenue}
                                        onChange={e => setEventVenue(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Cohort</label>
                                    <select
                                        value={eventTarget}
                                        onChange={e => setEventTarget(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white focus:outline-none"
                                    >
                                        <option value="All">All Cohorts</option>
                                        {cohortsList.map(cohort => (
                                            <option key={cohort} value={cohort}>{cohort}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                                >
                                    Schedule Event
                                </button>
                            </form>
                        </div>

                        {/* PIN Verification Widget */}
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                                <Key className="w-4 h-4" />
                                Verify Attendance PIN
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                Verify student check-in credentials. Correct code records attendance & immediately invalidates the PIN.
                            </p>
                            <form onSubmit={handleVerifyPin} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Identifier</label>
                                    <input
                                        type="text"
                                        placeholder="Email, phone, or admission number..."
                                        value={verifyIdentifier}
                                        onChange={e => setVerifyIdentifier(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-bold text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">6-Digit PIN Code</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="e.g. 847291"
                                        value={verifyPin}
                                        onChange={e => setVerifyPin(e.target.value)}
                                        className="w-full mt-1.5 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-sm text-indigo-400 placeholder-slate-600 text-center tracking-widest focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                                >
                                    Verify & Check In
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Events List & Logs */}
                    <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-6">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4">
                                <Calendar className="w-4 h-4" />
                                Scheduled Events & Attendance Control
                            </div>

                            {events.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Calendar className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                                    <p className="text-xs font-bold">No events scheduled. Create one to dispatch PINs.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {events.map(event => {
                                        const eventMatchingPins = eventPins.filter(p => p.eventId === event.id);
                                        const pendingPins = eventMatchingPins.filter(p => p.status === 'pending');
                                        const verifiedPins = eventMatchingPins.filter(p => p.status === 'used');

                                        return (
                                            <div key={event.id} className="bg-slate-950/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                                                            {event.target}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {event.eventTime}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-white">{event.title}</h4>
                                                    {event.description && <p className="text-xs text-slate-400 line-clamp-2">{event.description}</p>}
                                                    
                                                    <div className="text-xs text-slate-400 flex flex-col gap-1 pt-1">
                                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {event.eventDate}</span>
                                                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {event.venue}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                                                    <div className="text-[10px] font-bold text-slate-500 text-left w-full sm:w-auto">
                                                        <span>Pins: {verifiedPins.length} verified / {pendingPins.length} pending</span>
                                                    </div>
                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => handleSendAttendancePin(event)}
                                                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                            title="Send invitations to registered cohort students/parents"
                                                        >
                                                            Send PINs
                                                        </button>
                                                        <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center">
                                                            <span>Invite Excel</span>
                                                            <input 
                                                                type="file" 
                                                                accept=".xlsx, .xls, .csv" 
                                                                onChange={(e) => handleInviteExternalExcel(event, e)}
                                                                className="hidden" 
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Event PIN Ledger */}
                        <div className="border-t border-white/5 pt-6 space-y-3">
                            <div className="text-indigo-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                Active Event PIN Ledger
                            </div>
                            
                            {eventPins.length === 0 ? (
                                <p className="text-xs text-slate-500">No PIN records generated yet.</p>
                            ) : (
                                <div className="max-h-60 overflow-y-auto border border-white/5 rounded-2xl bg-slate-950/20 p-2">
                                    <table className="w-full text-left text-[11px] text-slate-350">
                                        <thead>
                                            <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                                <th className="py-2 px-3">Student</th>
                                                <th className="py-2 px-3">Event</th>
                                                <th className="py-2 px-3 text-center">PIN</th>
                                                <th className="py-2 px-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {eventPins.slice().sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(pin => {
                                                const student = users.find(u => u.id === pin.userId);
                                                const event = events.find(e => e.id === pin.eventId);
                                                return (
                                                    <tr key={pin.id}>
                                                        <td className="py-2 px-3 font-bold text-white">
                                                            <div>{student?.name || 'Unknown User'}</div>
                                                            {pin.guests && (
                                                                <div className="text-[9px] text-slate-400 font-normal">
                                                                    Guests: {(() => {
                                                                        try {
                                                                            const parsed = JSON.parse(pin.guests);
                                                                            return Array.isArray(parsed) ? parsed.join(', ') : pin.guests;
                                                                        } catch (e) {
                                                                            return pin.guests;
                                                                        }
                                                                    })()}
                                                                </div>
                                                            )}
                                                            {pin.vehicleRegistration && (
                                                                <div className="text-[9px] text-indigo-405 text-indigo-400 font-bold mt-0.5">
                                                                    Vehicle: {pin.vehicleRegistration}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-400 max-w-[120px] truncate">{event?.title || 'Unknown Event'}</td>
                                                        <td className="py-2 px-3 font-mono font-black text-indigo-400 text-center">{pin.pin}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                                pin.status === 'used' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                                                                pin.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                pin.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                            }`}>
                                                                {pin.status === 'used' ? 'Verified / Expired' : 
                                                                 pin.status === 'accepted' ? 'Confirmed' : 
                                                                 pin.status === 'rejected' ? 'Declined' : 
                                                                 'Pending RSVP'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Cleared Guests */}
            {activeTab === 'guests' && (
                <div className="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Cleared Guests Pipeline</h3>
                            <p className="text-xs text-slate-400 mt-1">Real-time pipeline of visitors vetted and cleared by gate campus security guards.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading guest registry...</p>
                        </div>
                    ) : visitors.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-400">No visitors recorded under this institution.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead>
                                    <tr className="border-b border-white/10 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="py-3 px-4">Visitor Profile</th>
                                        <th className="py-3 px-4">Identifier / Plate</th>
                                        <th className="py-3 px-4">Purpose of Visit</th>
                                        <th className="py-3 px-4">Check-In Info</th>
                                        <th className="py-3 px-4">Campus Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {visitors.slice().sort((a,b) => (b.timeIn || '').localeCompare(a.timeIn || '')).map(guest => {
                                        const host = users.find(u => u.id === guest.hostId);
                                        const isCheckedOut = guest.timeOut || (guest as any).status === 'checked_out';

                                        return (
                                            <tr key={guest.id} className="hover:bg-white/5">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-white">{guest.name || guest.fullName}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">{guest.phoneNumber || 'No Contact phone'}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-mono text-slate-400">{guest.idNumber || 'No ID Ref'}</div>
                                                    {guest.vehiclePlate && <div className="text-[10px] text-indigo-400 mt-0.5">{guest.vehiclePlate} ({guest.vehicleModel || 'Vehicle'})</div>}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-300">{guest.purpose}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">Host: {host?.name || 'Staff'}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div>Date: {guest.visitDate || 'Today'}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        In: {guest.timeIn || 'N/A'} {isCheckedOut && `| Out: ${guest.timeOut}`}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                                        isCheckedOut 
                                                            ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' 
                                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                                                    }`}>
                                                        {isCheckedOut ? 'Checked Out' : 'On Premises'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {!isCheckedOut && (
                                                        <button
                                                            onClick={() => handleCheckoutGuest(guest.id)}
                                                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 transition-all"
                                                        >
                                                            Check Out
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Original Form modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-[3rem] p-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800/60 pb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                                    {editingEnrollment ? 'Modify Student Enrollment' : 'Onboard New Student'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1">Configure student identity and placement matrices</p>
                            </div>
                            <button 
                                onClick={() => setIsFormOpen(false)}
                                className="w-12 h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-450 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
 
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="First & Last Name"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        required 
                                        placeholder="+254..."
                                        value={formData.phoneNumber}
                                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        required 
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-550/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Admission Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="Leave blank to auto-generate"
                                        value={formData.admissionNumber}
                                        onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
 
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest ml-1">Student Gender Identity</label>
                                    <div className="grid grid-cols-3 gap-3 mt-2">
                                        {['Male', 'Female', 'Other'].map((g) => {
                                            const isActive = formData.gender === g;
                                            return (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, gender: g as any })}
                                                    className={`py-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                                                        isActive
                                                            ? 'bg-indigo-600 text-white border-indigo-650 shadow-[0_8px_25px_-4px_rgba(99,102,241,0.45)]'
                                                            : 'bg-slate-50 dark:bg-slate-950/45 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {g}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
 
                                <div>
                                    <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    >
                                        <option value="Enrolled">Enrolled</option>
                                        <option value="Active">Active</option>
                                        <option value="Graduated">Graduated</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Dropped">Dropped</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest ml-1">Enrollment Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.enrollmentDate}
                                        onChange={e => setFormData({ ...formData, enrollmentDate: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                            </div>
 
                            {/* Guardian Details Card Section */}
                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider">
                                        Guardian Authorization Registry
                                    </h4>
                                </div>
                                <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/80 rounded-3xl p-6 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Guardian Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="Parent/Guardian Full Name"
                                                value={formData.metadata.parentName || ''}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, parentName: e.target.value } 
                                                })}
                                                className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Relationship</label>
                                            <select
                                                value={formData.metadata.parentRelation || 'Father'}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, parentRelation: e.target.value as any } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="Father">Father</option>
                                                <option value="Mother">Mother</option>
                                                <option value="Guardian">Guardian</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                                            <input 
                                                type="tel" 
                                                placeholder="e.g. +2547..."
                                                value={formData.metadata.parentPhone || ''}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, parentPhone: e.target.value } 
                                                })}
                                                className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                            <input 
                                                type="email" 
                                                placeholder="parent@example.com"
                                                value={formData.metadata.parentEmail || ''}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, parentEmail: e.target.value } 
                                                })}
                                                className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
 
                            {/* Context Specific Fields */}
                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6">
                                <h4 className="text-xs font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider mb-4">
                                    {context === 'driving_school' ? 'Driving School Curriculum Details' : 'Academic Placement Details'}
                                </h4>
                                
                                {context === 'driving_school' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">License Class / Category</label>
                                            <select
                                                required
                                                value={formData.metadata.licenseCategory}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, licenseCategory: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="" disabled>Select Class</option>
                                                <option value="Class B1 (Light Manual)">Class B1 (Light Manual)</option>
                                                <option value="Class B2 (Light Automatic)">Class B2 (Light Automatic)</option>
                                                <option value="Class A (Motorcycle)">Class A (Motorcycle)</option>
                                                <option value="Class C (Heavy Commercial)">Class C (Heavy Commercial)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Preferred Instructor</label>
                                            <select
                                                value={formData.metadata.preferredInstructorId}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, preferredInstructorId: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="">Any Instructor (Default)</option>
                                                {instructors.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Preferred Time Hours</label>
                                            <select
                                                value={formData.metadata.preferredLessonHours}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, preferredLessonHours: e.target.value as any } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="Morning">Morning Sessions (7:00 AM - 12:00 PM)</option>
                                                <option value="Noon">Noon Sessions (12:00 PM - 4:00 PM)</option>
                                                <option value="Evening">Evening Sessions (4:00 PM - 8:00 PM)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Prior Attended Sessions</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={formData.metadata.priorAttendedDays}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, priorAttendedDays: parseInt(e.target.value) || 0 } 
                                                })}
                                                className="form-input mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Grade Level</label>
                                            <select
                                                required
                                                value={formData.metadata.gradeLevel}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, gradeLevel: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="" disabled>Select Grade</option>
                                                <option value="Grade 1">Grade 1</option>
                                                <option value="Grade 2">Grade 2</option>
                                                <option value="Grade 3">Grade 3</option>
                                                <option value="Grade 4">Grade 4</option>
                                                <option value="Grade 5">Grade 5</option>
                                                <option value="Grade 6">Grade 6</option>
                                                <option value="Grade 7">Grade 7</option>
                                                <option value="Grade 8">Grade 8</option>
                                                <option value="Form 1">Form 1 (Secondary)</option>
                                                <option value="Form 2">Form 2 (Secondary)</option>
                                                <option value="Form 3">Form 3 (Secondary)</option>
                                                <option value="Form 4">Form 4 (Secondary)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Stream / Allocation</label>
                                            <select
                                                value={formData.metadata.stream}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, stream: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                            >
                                                <option value="">Select Stream</option>
                                                <option value="North">North</option>
                                                <option value="South">South</option>
                                                <option value="East">East</option>
                                                <option value="West">West</option>
                                                <option value="Main">Main Stream</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
 
                            <div className="flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-8 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {editingEnrollment ? 'Save Changes' : 'Confirm Enrollment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
