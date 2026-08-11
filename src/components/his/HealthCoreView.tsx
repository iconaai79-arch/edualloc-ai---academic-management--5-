import React, { useState } from 'react';
import { Role, HISPatient, User } from '../../types';
import { isEduInstitution } from '../../utils/roleUtils';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { BellIcon } from '../icons/BellIcon';
import { Cog8ToothIcon as SettingsIcon } from '../icons/Cog8ToothIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { XIcon } from '../icons/XIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { HeartIcon, ActivityIcon, ScissorsIcon, CalendarIcon, GlobeAltIcon, PhotoIcon, ChartLineIcon, ClockIcon, SignalIcon } from './HealthIcons';

import { InpatientView } from './InpatientView';
import { DentalView } from './DentalView';
import { OphthalmologyView } from './OphthalmologyView';
import { HISBillingView } from './HISBillingView';
import { SubscriptionExpiryBanner } from '../common/SubscriptionExpiryBanner';
import { HISBroadcasterView } from './HISBroadcasterView';
import { AppointmentsView } from './AppointmentsView';
import { HISConfigView } from './HISConfigView';
import { HISReportsView } from './HISReportsView';
import { StaffAttendanceView } from './StaffAttendanceView';
import { RegisterPatientModal } from './RegisterPatientModal';
import { UpdateVitalsModal } from './UpdateVitalsModal';
import { AddWardModal } from './AddWardModal';
import { AddVisitModal } from './AddVisitModal';
import { AddPrescriptionModal } from './AddPrescriptionModal';
import { EmergencyTransferModal } from './EmergencyTransferModal';
import { LabDiagnosticsView } from './LabDiagnosticsView';
import { ModernPharmacyManager } from './ModernPharmacyManager';
import { PharmacyView } from './PharmacyView';
import { EduPulseHomeDashboard } from './EduPulseHomeDashboard';
import { EduPulsePatientsList } from './EduPulsePatientsList';
import { ReceptionistView } from './ReceptionistView';
import { DoctorDashboard } from './DoctorDashboard';
import { HISQueueManagerView } from './HISQueueManagerView';
import { HISOverviewView } from './HISOverviewView';
import { ReferenceLabPortalView } from './ReferenceLabPortalView';
import { generateInstitutionalDemoData } from '../../utils/demoData';
import { apiService } from '../../services/apiService';
import { generateOphthalPrescriptionPdf, generateTransferLetterPdf } from '../../services/pdfService';
import { PdfViewer } from '../PdfViewer';

import { HRManager } from '../HR/HRManager';
import { BiometricAttendanceDashboard } from '../HR/BiometricAttendanceDashboard';
import { PayrollRecord, LeaveRequest, Institution } from '../../types';

type HISModule = 'overview' | 'general' | 'inpatient' | 'dental' | 'eye' | 'ear' | 'billing' | 'broadcaster' | 'appointments' | 'config' | 'reports' | 'attendance' | 'diagnostics' | 'pharmacy' | 'hr' | 'biometrics' | 'receptionist' | 'patients' | 'doctor' | 'queuing' | 'reflab';

interface HealthCoreProps {
    activeRole?: Role;
    userName?: string;
    institutionId?: string;
    users?: User[];
}

function GeneralMedicineView({ activePatient, vitals, events, onOpenVitals, onOpenRegister, onAddVisit, onAddPrescription, onOpenTransferLetter }: { activePatient?: HISPatient | null, vitals?: any[], events?: any[], onOpenVitals: () => void, onOpenRegister: () => void, onAddVisit: () => void, onAddPrescription: () => void, onOpenTransferLetter: () => void }) {
    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">{activePatient ? (<>Patient <span className="text-indigo-400">Portfolio</span></>) : (<>Registry <span className="text-indigo-400">Overview</span></>)}</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">{activePatient ? `Displaying clinical file for ${activePatient.fullName}` : 'Unified 360-degree clinical profile registry'}</p>
                </div>
                <button onClick={onOpenRegister} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"><PlusIcon className="w-4 h-4" /> Register Patient</button>
            </div>

            {activePatient ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-900 dark:text-white">
                    <div className="md:col-span-2 space-y-8">
                        <div className="glass-morphism p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 relative overflow-hidden bg-slate-50 dark:bg-white/5">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl">{activePatient.fullName[0].toUpperCase()}</div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Full Identity</p><p className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">{activePatient.fullName}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Registry DOB</p><p className="text-sm font-black text-slate-700 dark:text-slate-300">{activePatient.dob || 'NOT SET'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gender Node</p><p className="text-sm font-black uppercase text-slate-700 dark:text-slate-300">{activePatient.gender}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Blood Registry</p><p className="text-sm font-black uppercase text-rose-500">{activePatient.bloodGroup || 'UNK'}</p></div>
                                    </div>
                                    <div className="h-px w-full bg-slate-200 dark:bg-white/5 my-4"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Contact Line</p><p className="text-xs font-black tracking-widest text-slate-700 dark:text-slate-300">{activePatient.contact || 'N/A'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">S.H.A Number</p><p className="text-xs font-black tracking-widest text-indigo-500 dark:text-indigo-400">{activePatient.shaNumber || 'NOT UPDATED'}</p></div>
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Insurance Unit</p><p className="text-xs font-black tracking-widest uppercase text-slate-700 dark:text-slate-300">{activePatient.insuranceProvider || 'PRIVATE PAY'}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-morphism p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 min-h-[500px] relative overflow-hidden bg-slate-50 dark:bg-white/5">
                            <div className="flex justify-between items-center mb-8">
                                <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] italic">Clinical Timeline</p>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={onOpenTransferLetter}
                                        className="bg-rose-500/10 text-rose-500 p-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-3 h-3" /> Emergency Transfer
                                    </button>
                                    <button 
                                        onClick={onAddPrescription}
                                        className="bg-indigo-500/10 text-indigo-400 p-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-indigo-400/20 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <DocumentTextIcon className="w-3 h-3" /> New Prescription
                                    </button>
                                    <button 
                                        onClick={onAddVisit}
                                        className="bg-emerald-500/10 text-emerald-500 p-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-3 h-3" /> Add Visit
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-12">
                                {(events || [
                                    { date: 'Oct 12', time: '14:30', event: 'Dental Extraction (Tooth 14)', dept: 'Dental', provider: 'Dr. Sarah' },
                                    { date: 'Sep 28', time: '10:15', event: 'Refraction Exam (OD: -2.25)', dept: 'Ophthalmology', provider: 'Dr. Mike' },
                                    { date: 'Sep 15', time: '09:00', event: 'General Consultation', dept: 'OPD', provider: 'Dr. Jane' }
                                ]).map((item, i) => (
                                    <div key={i} className="flex gap-8 group">
                                        <div className="text-right w-20 pt-1"><p className="text-xs font-black text-slate-900 dark:text-white">{item.date}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{item.time}</p></div>
                                        <div className="relative"><div className="w-px h-full bg-slate-200 dark:bg-white/5 absolute left-1/2 -translate-x-1/2 top-4"></div><div className="w-3 h-3 rounded-full bg-indigo-500 relative z-10 border-4 border-white dark:border-slate-950 group-hover:scale-150 transition-transform"></div></div>
                                        <div className="flex-1 pb-10 border-b border-slate-200 dark:border-white/5"><h4 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-slate-900 dark:text-white">{item.event}</h4><div className="flex gap-4"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">{item.dept}</span><span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-200 dark:border-indigo-400/20 px-3 py-1 rounded-full">{item.provider}</span></div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="glass-morphism p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8 italic">Vital Statistics</p>
                            <div className="space-y-6">
                                {(!vitals || vitals.length === 0 ? [
                                    { label: 'Blood Pressure', value: '—', unit: 'mmHg', trend: '—', color: 'text-emerald-500' },
                                    { label: 'Heart Rate', value: '—', unit: 'BPM', trend: '—', color: 'text-slate-900 dark:text-white' },
                                    { label: 'Oxygen Saturation', value: '—', unit: 'SpO2', trend: '—', color: 'text-blue-500' },
                                    { label: 'Body Temp', value: '—', unit: '°C', trend: '—', color: 'text-slate-900 dark:text-white' }
                                ] : vitals).map((vital, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all cursor-pointer">
                                        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">{vital.label}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{vital.value} <span className="text-xs font-bold text-slate-500 tracking-tight">{vital.unit}</span></p></div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${vital.color} italic underline underline-offset-4 decoration-2`}>{vital.trend}</div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={onOpenVitals} className="w-full mt-10 py-5 bg-indigo-600 text-white dark:bg-white dark:text-slate-950 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-indigo-600/20 dark:shadow-white/5 italic">Update Vitals</button>
                        </div>
                        <div className="p-8 rounded-[3rem] bg-rose-500/10 border border-rose-500/20"><p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4">Emergency Contact</p><h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">{activePatient.emergencyContactName || 'NONE REGISTERED'}</h4><p className="text-lg font-black tracking-[0.2em] text-rose-600 dark:text-rose-400 italic">{activePatient.emergencyContactPhone || '--- --- ---'}</p></div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 grayscale"><UsersIcon className="w-20 h-20 text-slate-700 mb-6" /><p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Search or Select a patient from the registry <br/>to initialize clinical 360 view</p></div>
            )}
        </div>
    );
}

export function HealthCoreView({ activeRole, userName, institutionId, users = [] }: HealthCoreProps) {
    const [activeModule, setActiveModule] = useState<HISModule>('general');
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<HISPatient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activePatientId, setActivePatientId] = useState<string | null>(null);
    const [activePatientVitals, setActivePatientVitals] = useState<any[]>([]);
    const [activePatientEvents, setActivePatientEvents] = useState<any[]>([]);
    const [institutionData, setInstitutionData] = useState<any>(null);

    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isUpdateVitalsOpen, setIsUpdateVitalsOpen] = useState(false);
    const [isAddWardOpen, setIsAddWardOpen] = useState(false);
    const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
    const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    // EduPulse sidebar: track which primary nav item is active independently
    const [eduSidebarItem, setEduSidebarItem] = useState<string>('home');
    const [allClinicalEvents, setAllClinicalEvents] = useState<any[]>([]);
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [hisPayrollRecords, setHisPayrollRecords] = useState<PayrollRecord[]>([]);
    const [hisLeaveRequests, setHisLeaveRequests] = useState<LeaveRequest[]>([]);

    const isEdu = isEduInstitution(institutionData);

    const fetchAllWellnessData = React.useCallback(async () => {
        if (!institutionId) return;
        try {
            const events = await apiService.fetchModuleRecords('his_clinical_events', institutionId);
            const apps = await apiService.fetchModuleRecords('his_appointments', institutionId);
            const payroll = await apiService.fetchModuleRecords('payroll_records', institutionId).catch(() => []);
            const leave = await apiService.fetchModuleRecords('leave_requests', institutionId).catch(() => []);
            setAllClinicalEvents(events || []);
            setAllAppointments(apps || []);
            setHisPayrollRecords(payroll || []);
            setHisLeaveRequests(leave || []);
        } catch (error) {
            console.error("Failed to load aggregate wellness & HR data:", error);
        }
    }, [institutionId]);

    React.useEffect(() => {
        if (eduSidebarItem === 'home') {
            fetchAllWellnessData();
        }
    }, [eduSidebarItem, fetchAllWellnessData]);

    const handlePrintOphthalRx = async (od: any, os: any) => {
        if (!activePatient) {
            alert("Please select a patient first to generate a prescription.");
            return;
        }
        try {
            const dataUri = await generateOphthalPrescriptionPdf(
                od, 
                os, 
                activePatient.fullName, 
                institutionData || { name: 'Health Service' },
                institutionData?.logoUrl || null
            );
            setPdfPreviewUrl(dataUri);
        } catch (error) {
            console.error(error);
            alert("Failed to generate prescription PDF.");
        }
    };

    const handleGenerateTransferLetter = async (receivingFacility: string, reasonForTransfer: string, nurseNotes: string) => {
        if (!activePatient || !institutionData) return;
        try {
            const dataUri = await generateTransferLetterPdf(
                activePatient,
                activePatientVitals,
                receivingFacility,
                reasonForTransfer,
                nurseNotes,
                institutionData,
                institutionData.logoUrl || null,
                userName || 'Duty Nurse'
            );
            setPdfPreviewUrl(dataUri);
            setIsTransferModalOpen(false);
        } catch (error) {
            console.error("Failed to generate transfer letter:", error);
            alert("Failed to compile transfer document.");
        }
    };

    React.useEffect(() => {
        const loadInst = async () => {
            if (institutionId) {
                const results = await apiService.fetchModuleRecords('institutions', institutionId);
                if (results && results.length > 0) {
                    setInstitutionData(results[0]);
                }
                // Auto-provision Pharmacy Sub-Store in school inventory if not exists
                try {
                    const stores = await apiService.fetchModuleRecords('retail_stores', institutionId);
                    const hasPharmStore = (stores || []).some((s: any) => s.storeType === 'pharmacy_store' || s.name.toLowerCase().includes('pharmacy'));
                    if (!hasPharmStore) {
                        const newPharmStore = {
                            id: `store_pharm_sub_${Date.now()}`,
                            institutionId,
                            name: 'Pharmacy Sub-Store',
                            storeType: 'pharmacy_store',
                            location: 'Wellness Center',
                            isActive: true,
                            createdAt: new Date().toISOString()
                        };
                        await apiService.saveModuleRecord('retail_stores', newPharmStore);
                        console.info('[auto-provision] Pharmacy Sub-Store registered in school inventory stores.');
                    }
                } catch (err) {
                    console.error('Failed to auto-provision Pharmacy Sub-Store:', err);
                }
            }
        };
        // Auto-migrate to add columns to public.his_patients if not exists
        apiService.runMigration("ALTER TABLE public.his_patients ADD COLUMN IF NOT EXISTS admission_number text;").catch(() => {});
        apiService.runMigration("ALTER TABLE public.his_patients ADD COLUMN IF NOT EXISTS grade_level text;").catch(() => {});
        apiService.runMigration("ALTER TABLE public.his_patients ADD COLUMN IF NOT EXISTS stream text;").catch(() => {});
        loadInst();
        fetchAllWellnessData();
    }, [institutionId, fetchAllWellnessData]);

    const staffList = React.useMemo(() => {
        return (users || []).filter(u => {
            if (!u || !u.role) return false;
            const r = u.role.toLowerCase().trim();
            return r !== 'student' && r !== 'parent' && r !== 'patient';
        });
    }, [users]);

    const currentInst: Institution = React.useMemo(() => {
        return institutionData || {
            id: institutionId || 'his_inst_1',
            name: institutionData?.name || 'Hospital & Health Information System',
            institutionType: 'HIS',
            code: 'HIS-01',
            status: 'active',
            createdAt: new Date().toISOString()
        };
    }, [institutionData, institutionId]);

    const handleProcessPayroll = async (records: PayrollRecord[]) => {
        if (!institutionId) return;
        try {
            for (const r of records) {
                await apiService.saveModuleRecord('payroll_records', {
                    ...r,
                    institutionId,
                    updatedAt: new Date().toISOString()
                });
            }
            alert('Payroll processed and saved successfully.');
            fetchAllWellnessData();
        } catch (err: any) {
            console.error('Payroll save failed:', err);
            alert('Failed to save payroll: ' + (err.message || err));
        }
    };

    const handleUpdateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
        if (!institutionId) return;
        try {
            await apiService.saveModuleRecord('leave_requests', {
                id,
                status,
                updatedAt: new Date().toISOString()
            });
            alert(`Leave request ${status} successfully.`);
            fetchAllWellnessData();
        } catch (err: any) {
            console.error('Leave update failed:', err);
            alert('Failed to update leave: ' + (err.message || err));
        }
    };

    const demoData = React.useMemo(() => {
        return institutionId ? generateInstitutionalDemoData(institutionId, 'admin') : null;
    }, [institutionId]);

    const fetchPatients = React.useCallback(async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords('his_patients', institutionId);
            setPatients(data || []);
        } catch (error) {
            console.error("Failed to fetch patients:", error);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    React.useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    // Auto-navigate receptionist to their dedicated desk
    React.useEffect(() => {
        if (activeRole === 'receptionist' && !isEdu) {
            setActiveModule('receptionist');
        }
    }, [activeRole, isEdu]);

    const activePatient = React.useMemo(() => {
        if (!activePatientId) return null;
        return patients.find(p => p.id === activePatientId) || null;
    }, [activePatientId, patients]);

    const fetchPatientData = React.useCallback(async () => {
        if (!activePatientId || !institutionId) return;
        try {
            const vitals = await apiService.fetchModuleRecords('his_vital_statistics', institutionId, undefined, { filter: { patient_id: activePatientId } });
            const events = await apiService.fetchModuleRecords('his_clinical_events', institutionId, undefined, { filter: { patient_id: activePatientId }, order: 'created_at.desc' });
            setActivePatientVitals(vitals || []);
            setActivePatientEvents(events || []);
        } catch (error) {
            console.error("Failed to fetch patient records:", error);
        }
    }, [activePatientId, institutionId]);

    React.useEffect(() => {
        fetchPatientData();
    }, [fetchPatientData]);

    const filteredPatients = React.useMemo(() => {
        if (!searchTerm.trim()) return [];
        return patients.filter(p => 
            p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.contact?.includes(searchTerm) ||
            p.shaNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, patients]);


    const filteredDirectoryUsers = React.useMemo(() => {
        if (!isEdu || !searchTerm.trim()) return [];
        const existingPatientNames = new Set(patients.map(p => p.fullName.toLowerCase()));
        return (users || []).filter(u => {
            const isClinicApplicableRole = ['student', 'teacher', 'boarding_master', 'staff', 'parent', 'librarian'].includes(u.role);
            if (!isClinicApplicableRole) return false;
            
            const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (u.phoneNumber || '').includes(searchTerm);
                                  
            const notRegisteredYet = !existingPatientNames.has(u.name.toLowerCase());
            return matchesSearch && notRegisteredYet;
        });
    }, [isEdu, searchTerm, users, patients]);

    const handleImportDirectoryUser = async (userRecord: User) => {
        if (!institutionId) return;
        try {
            const newPatientId = `his_p_${Date.now()}`;
            const dob = userRecord.metadata?.dob || '';
            const gender = (userRecord.metadata?.gender || 'Unknown') as any;
            
            const admNo = userRecord.admissionNumber || userRecord.admission_number || userRecord.metadata?.admissionNumber || userRecord.metadata?.admission_number || '';
            const grade = userRecord.metadata?.gradeLevel || userRecord.metadata?.class_level || userRecord.metadata?.grade_level || '';
            const stream = userRecord.metadata?.stream || '';
            const record: HISPatient = {
                id: newPatientId,
                institutionId,
                fullName: userRecord.name,
                gender: gender,
                dob: dob,
                contact: userRecord.phoneNumber || userRecord.email || '',
                shaNumber: '',
                insuranceProvider: 'School Coverage',
                bloodGroup: 'Unknown',
                emergencyContactName: '',
                emergencyContactPhone: '',
                status: 'active',
                admissionNumber: admNo,
                gradeLevel: grade,
                stream: stream,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await apiService.saveModuleRecord('his_patients', record);
            setPatients(prev => [...prev, record]);
            setActivePatientId(newPatientId);
            setSearchTerm('');
            setActiveModule('general');
            alert(`Imported ${userRecord.name} successfully into wellness registry!`);
        } catch (error) {
            console.error("Failed to import directory user:", error);
            alert("Import failed.");
        }
    };

    React.useEffect(() => {
        (window as any).openRegisterModal = () => setIsRegisterModalOpen(true);
        (window as any).openUpdateVitalsModal = () => setIsUpdateVitalsOpen(true);
        (window as any).openAddWardModal = () => setIsAddWardOpen(true);
        (window as any).openAddVisitModal = () => setIsAddVisitOpen(true);
        return () => { 
            delete (window as any).openRegisterModal; 
            delete (window as any).openUpdateVitalsModal;
            delete (window as any).openAddWardModal;
            delete (window as any).openAddVisitModal;
        };
    }, []);

    const handleRegisterPatient = async (patientData: any) => {
        if (!institutionId) return;
        try {
            const record = {
                ...patientData,
                institutionId,
                id: `his_p_${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('his_patients', record);
            alert("Success: Patient registered successfully");
            setIsRegisterModalOpen(false);
            fetchPatients();
            if (activeModule === 'general') setActivePatientId(record.id);
        } catch (error: any) {
            console.error(error);
            alert("Registration Failed");
        }
    };

    const handleUpdateVitals = async (vitalsData: any[]) => {
        if (!institutionId || !activePatientId) return;
        try {
            for (const v of vitalsData) {
                const vitalId = `v_${activePatientId}_${v.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                await apiService.saveModuleRecord('his_vital_statistics', {
                    ...v,
                    id: vitalId,
                    institutionId,
                    patientId: activePatientId,
                    recordedAt: new Date().toISOString()
                });
            }
            alert("Vitals updated successfully");
            setIsUpdateVitalsOpen(false);
            fetchPatientData();
        } catch (error) {
            console.error(error);
            alert("Failed to update vitals");
        }
    };

    const [wardsRefreshTrigger, setWardsRefreshTrigger] = useState(0);

    const handleAddVisit = async (visitData: any) => {
        if (!activePatientId || !institutionId) return;
        try {
            const clinicalEvent = {
                ...visitData,
                patientId: activePatientId,
                institutionId,
                id: `evt_${Date.now()}`,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('his_clinical_events', clinicalEvent);
            alert("Clinical record saved successfully");
            setIsAddVisitOpen(false);
            fetchPatientData();
            fetchAllWellnessData();
        } catch (error) {
            console.error(error);
            alert("Record saving failed");
        }
    };

    const handleAddWard = async (wardData: any) => {
        if (!institutionId) return;
        try {
            await apiService.saveModuleRecord('his_wards', { ...wardData, institutionId, id: `ward_${Date.now()}` });
            alert("Ward Added Successfully");
            // Automatically refresh if we are in inpatient view
            if (activeModule === 'inpatient') {
                // We'll use a hack to trigger useEffect if we don't have a better way
                // Or just the user clicks refresh. But let's add a state.
                setWardsRefreshTrigger(prev => prev + 1);
            }
        } catch (error) {
            console.error(error);
            alert("Ward Addition Failed");
        }
    };


    const patientData = activePatient || (patients.length > 0 ? patients[0] : null);

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30 flex">

            {/* ── Vertical Sidebar Menu for HIS ── */}
            <aside className="w-20 lg:w-64 min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col flex-shrink-0 shadow-2xl shadow-indigo-950/50 z-20 sticky top-0 self-start h-screen border-r border-slate-800/80">
                {/* Brand */}
                <div className="p-5 lg:p-6 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ring-1 ring-white/20">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="hidden lg:block">
                            {isEdu ? (
                                <>
                                    <p className="text-base font-black uppercase tracking-tighter italic text-white leading-none">
                                        Edu<span className="text-indigo-300">Pulse</span>
                                    </p>
                                    <p className="text-[8px] font-black text-indigo-300 uppercase tracking-[0.25em] mt-1">School Wellness</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-base font-black uppercase tracking-tighter italic text-white leading-none">
                                        Quantum <span className="text-indigo-400">H.I.S</span>
                                    </p>
                                    <p className="text-[8px] font-black text-indigo-300/70 uppercase tracking-[0.25em] mt-1">Medical Operating System</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Subscription Expiry Banner */}
                <div className="px-3">
                    <SubscriptionExpiryBanner institution={institutionData} />
                </div>

                {/* Vertical Navigation Menu */}
                <nav className="flex-1 p-3 space-y-4 overflow-y-auto mt-2 no-scrollbar">
                    {/* EduPulse Menu Mode */}
                    {isEdu ? (
                        <>
                            <div>
                                <p className="hidden lg:block text-[8px] font-black text-indigo-300/50 uppercase tracking-widest px-3 mb-2">Main Menu</p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'home', label: 'Home', icon: HeartIcon, module: 'general' as HISModule },
                                        { id: 'patients', label: 'Manage Patients', icon: UsersIcon, module: 'patients' as HISModule },
                                        { id: 'appointment', label: 'Appointment', icon: CalendarIcon, module: 'appointments' as HISModule },
                                        { id: 'doctor', label: 'Doctor Dashboard', icon: ActivityIcon, module: 'doctor' as HISModule },
                                    ].map(item => {
                                        const isActive = eduSidebarItem === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveModule(item.module);
                                                    setEduSidebarItem(item.id);
                                                    if (item.id === 'home') setActivePatientId(null);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                                        : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                                    isActive ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-indigo-200 group-hover:bg-white/20 group-hover:text-white'
                                                }`}>
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                <span className="hidden lg:block text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-2">
                                <p className="hidden lg:block text-[8px] font-black text-indigo-300/50 uppercase tracking-widest px-3 mb-2">More Tools</p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'pharmacy' as HISModule, label: 'Pharmacy', icon: BeakerIcon },
                                        { id: 'hr' as HISModule, label: 'HR & Payroll', icon: UsersIcon },
                                        { id: 'biometrics' as HISModule, label: 'Biometrics Fleet', icon: ClockIcon },
                                        { id: 'broadcaster' as HISModule, label: 'Communications', icon: BellIcon },
                                        { id: 'attendance' as HISModule, label: 'Attendance', icon: ClockIcon },
                                        { id: 'reports' as HISModule, label: 'Reports', icon: ChartBarIcon },
                                        { id: 'config' as HISModule, label: 'Nexus Settings', icon: SettingsIcon },
                                    ].map(item => {
                                        const isActive = activeModule === item.id && !['home','patients','appointment'].includes(eduSidebarItem);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => { setActiveModule(item.id); setEduSidebarItem(''); }}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group ${
                                                    isActive ? 'bg-indigo-600/80 text-white' : 'text-indigo-300/70 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                                    isActive ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-indigo-300 group-hover:bg-white/20 group-hover:text-white'
                                                }`}>
                                                    <item.icon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Standalone Quantum Medical HIS Vertical Navigation */
                        <>
                            {/* Section 1: Clinical & Care */}
                            <div>
                                <p className="hidden lg:block text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] px-3 mb-2 italic">Clinical &amp; Care</p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'overview' as HISModule, label: 'HIS Overview', icon: ChartBarIcon },
                                        { id: 'receptionist' as HISModule, label: 'Reception Desk', icon: UsersIcon },
                                        { id: 'doctor' as HISModule, label: 'Doctor Dashboard', icon: ActivityIcon },
                                        { id: 'queuing' as HISModule, label: 'Queuing & TV Screen', icon: BellIcon },
                                        { id: 'patients' as HISModule, label: 'Manage Patients', icon: UsersIcon },
                                        { id: 'general' as HISModule, label: 'Patient 360', icon: HeartIcon },
                                        { id: 'inpatient' as HISModule, label: 'Admissions', icon: BuildingOfficeIcon },
                                        { id: 'appointments' as HISModule, label: 'Scheduling', icon: CalendarIcon },
                                        { id: 'diagnostics' as HISModule, label: 'Diagnostics & Lab', icon: BeakerIcon },
                                        { id: 'pharmacy' as HISModule, label: 'Pharmacy & Store', icon: BeakerIcon },
                                        { id: 'billing' as HISModule, label: 'Finance & Invoicing', icon: CreditCardIcon },
                                    ].map(item => {
                                        const isActive = activeModule === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveModule(item.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                                    isActive ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-slate-400 group-hover:bg-white/20 group-hover:text-white'
                                                }`}>
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Specialized Units */}
                            <div className="border-t border-white/10 pt-3">
                                <p className="hidden lg:block text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] px-3 mb-2 italic">Specialized Hubs</p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'reflab' as HISModule, label: 'Reference Lab Hub', icon: BeakerIcon },
                                        { id: 'dental' as HISModule, label: 'Dental Core', icon: ScissorsIcon },
                                        { id: 'eye' as HISModule, label: 'Ocular Hub', icon: EyeIcon },
                                        { id: 'ear' as HISModule, label: 'ENT Hub', icon: SignalIcon },
                                    ].map(item => {
                                        const isActive = activeModule === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveModule(item.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                                    isActive ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-slate-400 group-hover:bg-white/20 group-hover:text-white'
                                                }`}>
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 3: Revenue & Administration */}
                            <div className="border-t border-white/10 pt-3">
                                <p className="hidden lg:block text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] px-3 mb-2 italic">Finance &amp; Operations</p>
                                <div className="space-y-1">
                                    {[
                                        { id: 'hr' as HISModule, label: 'HR & Payroll', icon: UsersIcon },
                                        { id: 'biometrics' as HISModule, label: 'Biometrics Fleet', icon: ClockIcon },
                                        { id: 'attendance' as HISModule, label: 'Staff Presence', icon: ClockIcon },
                                        { id: 'broadcaster' as HISModule, label: 'Communications', icon: BellIcon },
                                        { id: 'reports' as HISModule, label: 'Intelligence', icon: ChartBarIcon },
                                    ].map(item => {
                                        const isActive = activeModule === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveModule(item.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                                    isActive ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-slate-400 group-hover:bg-white/20 group-hover:text-white'
                                                }`}>
                                                    <item.icon className="w-4 h-4" />
                                                </div>
                                                <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 4: System Administration (Absolute Last Tab) */}
                            <div className="border-t border-white/10 pt-3">
                                <p className="hidden lg:block text-[8px] font-black text-indigo-400/60 uppercase tracking-[0.2em] px-3 mb-2 italic">System Control</p>
                                <button
                                    onClick={() => setActiveModule('config')}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 group ${
                                        activeModule === 'config'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                        activeModule === 'config' ? 'bg-white text-indigo-600 shadow-md' : 'bg-white/10 text-slate-400 group-hover:bg-white/20 group-hover:text-white'
                                    }`}>
                                        <SettingsIcon className="w-4 h-4" />
                                    </div>
                                    <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">Nexus Settings</span>
                                </button>
                            </div>
                        </>
                    )}
                </nav>

                {/* Bottom User Badge */}
                <div className="p-4 border-t border-white/10 flex-shrink-0 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600/30 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-black shadow ring-1 ring-white/20">
                            {(userName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="hidden lg:block min-w-0 flex-1">
                            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{userName || 'Staff'}</p>
                            <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest capitalize">{(activeRole || 'user').replace(/_/g, ' ')}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main Content Wrapper ── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
                <div className="p-8 pb-4 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                        {!isEdu && (
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                                    <SparklesIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black uppercase tracking-tighter italic">
                                        Quantum <span className="text-indigo-600 dark:text-indigo-400">Medical</span>
                                    </h1>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">
                                        H.I.S Master Operating System
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3 relative">
                            <div className="relative group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="GLOBAL SEARCH (PATIENTS, RECORDS, STAFF)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all w-full md:w-80 shadow-inner"
                                />
                                {searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden max-h-[400px] overflow-y-auto no-scrollbar animate-fade-in-down">
                                        <div className="p-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search Results ({filteredPatients.length})</p>
                                            <button onClick={() => setSearchTerm('')} className="p-1 hover:text-rose-500"><XIcon className="w-3 h-3" /></button>
                                        </div>
                                        {filteredPatients.length > 0 ? filteredPatients.map(p => (
                                            <button key={p.id} onClick={() => { setActivePatientId(p.id); setSearchTerm(''); setActiveModule('general'); }} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group border-b border-slate-50 dark:border-white/5 last:border-0 pointer-cursor">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs">{p.fullName[0].toUpperCase()}</div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-tight">{p.fullName}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.gender} • {p.contact || 'No Contact'}</p>
                                                    </div>
                                                </div>
                                                <ChevronRightIcon className="w-4 h-4 text-slate-350 group-hover:text-indigo-500 transition-all" />
                                            </button>
                                        )) : null}

                                        {isEdu && filteredDirectoryUsers.length > 0 && (
                                            <>
                                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-[9px] font-black text-indigo-500 uppercase tracking-widest border-t border-b border-slate-50 dark:border-white/5">
                                                    Import from School Directory
                                                </div>
                                                {filteredDirectoryUsers.map(u => (
                                                    <button 
                                                        key={u.id} 
                                                        onClick={() => handleImportDirectoryUser(u)} 
                                                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group border-b border-slate-50 dark:border-white/5 last:border-0 pointer-cursor"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black text-xs">
                                                                {u.name[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black uppercase tracking-tight">{u.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                                    {u.role.toUpperCase()} • {u.metadata?.gradeLevel || u.email || 'No Details'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                                            Import
                                                        </span>
                                                    </button>
                                                ))}
                                            </>
                                        )}

                                        {filteredPatients.length === 0 && filteredDirectoryUsers.length === 0 && (
                                            <div className="p-8 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic animate-pulse">Patient Not Found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                </div>

            <main className="p-8 pt-0">
                <div className="glass-morphism dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/5 p-10 min-h-[70vh] shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
                    {(() => {
                        switch (activeModule) {
                            case 'overview': return <HISOverviewView institutionId={institutionId} userName={userName} activeRole={activeRole?.name} patients={patients} />;
                            case 'general': 
                                if (isEdu && eduSidebarItem === 'home' && !activePatient) {
                                    return (
                                        <EduPulseHomeDashboard 
                                            patients={patients} 
                                            clinicalEvents={allClinicalEvents} 
                                            appointments={allAppointments} 
                                            onRegisterPatient={() => setIsRegisterModalOpen(true)} 
                                            onAddVisit={() => setIsAddVisitOpen(true)} 
                                            onScheduleAppointment={() => {
                                                setActiveModule('appointments');
                                                setEduSidebarItem('appointment');
                                            }} 
                                            onSelectPatient={(pId) => {
                                                setActivePatientId(pId);
                                                setEduSidebarItem('patients');
                                            }}
                                        />
                                    );
                                }
                                if (isEdu && eduSidebarItem === 'patients' && !activePatient) {
                                    return (
                                        <EduPulsePatientsList
                                            patients={patients as any}
                                            onRegisterPatient={() => setIsRegisterModalOpen(true)}
                                            onSelectPatient={(pId) => setActivePatientId(pId)}
                                            onPatientUpdated={fetchPatients}
                                            institutionId={institutionId}
                                            institutionData={institutionData}
                                            onPreviewPdf={(url) => setPdfPreviewUrl(url)}
                                        />
                                    );
                                }
                                return <GeneralMedicineView activePatient={activePatient} vitals={activePatientVitals} events={activePatientEvents} onOpenVitals={() => setIsUpdateVitalsOpen(true)} onOpenRegister={() => setIsRegisterModalOpen(true)} onAddVisit={() => setIsAddVisitOpen(true)} onAddPrescription={() => setIsPrescriptionModalOpen(true)} onOpenTransferLetter={() => setIsTransferModalOpen(true)} />;

                            case 'inpatient': return <InpatientView institutionId={institutionId} onAddWard={() => setIsAddWardOpen(true)} refreshTrigger={wardsRefreshTrigger} />;
                            case 'diagnostics': return <LabDiagnosticsView institutionId={institutionId} activeRole={activeRole} userName={userName} activePatientId={activePatientId} />;
                            case 'reflab': return <ReferenceLabPortalView institutionId={institutionId} userName={userName} />;
                            case 'pharmacy': return <PharmacyView institutionId={institutionId} />;
                            case 'dental': return <DentalView onAddVisit={() => setIsAddVisitOpen(true)} />;
                            case 'eye': return <OphthalmologyView onAddVisit={() => setIsAddVisitOpen(true)} onPrintRx={handlePrintOphthalRx} />;
                            case 'ear': return (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 grayscale">
                                    <SignalIcon className="w-20 h-20 text-slate-700 mb-6" />
                                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">ENT Hub (Ear, Nose & Throat)</h3>
                                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mt-2">Specialized ENT clinical workflows are being synchronized.<br/>Please use Patient 360 for general ENT consultations.</p>
                                </div>
                            );
                            case 'doctor': return (
                                <DoctorDashboard
                                    patients={patients}
                                    userName={userName}
                                    institutionId={institutionId}
                                    onAddVisit={() => setIsAddVisitOpen(true)}
                                    onAddPrescription={() => setIsPrescriptionModalOpen(true)}
                                    onOpenPatient={(pId) => { setActivePatientId(pId); setActiveModule('general'); isEdu && setEduSidebarItem('patients'); }}
                                    onRegisterPatient={() => setIsRegisterModalOpen(true)}
                                />
                            );
                            case 'billing': return <HISBillingView institutionId={institutionId} />;
                            case 'hr': return (
                                <HRManager 
                                    currentUser={(users || []).find(u => u.name === userName)}
                                    staff={staffList}
                                    payrollRecords={hisPayrollRecords}
                                    leaveRequests={hisLeaveRequests}
                                    institution={currentInst}
                                    onProcessPayroll={handleProcessPayroll}
                                    onUpdateLeaveStatus={handleUpdateLeaveStatus}
                                />
                            );
                            case 'biometrics': return (
                                <BiometricAttendanceDashboard 
                                    staff={staffList}
                                    institution={currentInst}
                                />
                            );
                            case 'receptionist': return <ReceptionistView institutionId={institutionId} userName={userName} users={users} />;
                            case 'queuing': return <HISQueueManagerView institutionId={institutionId} userName={userName} activeRole={activeRole} />;
                            case 'patients': return <EduPulsePatientsList patients={patients} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSelectPatient={(p) => { setActivePatientId(p.id); setActiveModule('general'); }} onOpenRegister={() => setIsRegisterModalOpen(false)} isEdu={isEdu} />;
                            case 'broadcaster': return <HISBroadcasterView />;
                            case 'appointments': return <AppointmentsView activeRole={activeRole} userName={userName} institutionId={institutionId} demoAppointments={demoData?.hisAppointments} isEdu={isEdu} users={users} />;
                            case 'config': return <HISConfigView institutionId={institutionId} users={users} demoStaff={demoData?.hisStaff} onStaffUpdated={fetchPatients} />;
                            case 'reports': return <HISReportsView activeRole={activeRole} institutionId={institutionId} patients={patients} users={users} />;
                            case 'attendance': return <StaffAttendanceView userName={userName} institutionId={institutionId} demoAttendance={demoData?.hisAttendance} />;
                            default: return <GeneralMedicineView activePatient={activePatient} vitals={activePatientVitals} events={activePatientEvents} onOpenVitals={() => setIsUpdateVitalsOpen(true)} onOpenRegister={() => setIsRegisterModalOpen(true)} onAddVisit={() => setIsAddVisitOpen(true)} onAddPrescription={() => setIsPrescriptionModalOpen(true)} onOpenTransferLetter={() => setIsTransferModalOpen(true)} />;
                        }
                    })()}
                </div>
            </main>

            <RegisterPatientModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} onRegister={handleRegisterPatient} users={users} isEdu={isEdu} />
            <UpdateVitalsModal isOpen={isUpdateVitalsOpen} onClose={() => setIsUpdateVitalsOpen(false)} patientId={activePatientId || ''} patientName={activePatient?.fullName} onUpdate={handleUpdateVitals} />
            <AddWardModal isOpen={isAddWardOpen} onClose={() => setIsAddWardOpen(false)} onAdd={handleAddWard} />
            <AddVisitModal 
                isOpen={isAddVisitOpen} 
                onClose={() => setIsAddVisitOpen(false)} 
                patientId={activePatientId || undefined}
                patientName={activePatient?.fullName} 
                patientGender={activePatient?.gender}
                patientAge={activePatient?.dob ? (new Date().getFullYear() - new Date(activePatient.dob).getFullYear()) : 30}
                onAdd={handleAddVisit} 
            />
            <AddPrescriptionModal 
                isOpen={isPrescriptionModalOpen} 
                onClose={() => setIsPrescriptionModalOpen(false)} 
                patientId={activePatientId || ''} 
                patientName={activePatient?.fullName} 
                institutionId={institutionId || ''} 
                doctorName={userName}
            />
            <EmergencyTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                patient={activePatient}
                vitals={activePatientVitals}
                onGenerate={handleGenerateTransferLetter}
            />

            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-zoom-in">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-indigo-600">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Clinical <span className="text-indigo-200">Document Hub</span></h2>
                                <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">Refraction Prescription Preview</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = pdfPreviewUrl;
                                        link.download = `Rx-${activePatient?.fullName || 'Clinical'}.pdf`;
                                        link.click();
                                    }}
                                    className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                >Download PDF</button>
                                <button onClick={() => setPdfPreviewUrl(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"><XIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <PdfViewer src={pdfPreviewUrl} className="w-full h-full border-none" title="PDF Preview" />
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default HealthCoreView;

