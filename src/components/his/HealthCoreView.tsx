import React, { useState } from 'react';
import { Role, HISPatient } from '../../types';
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
import { LabDiagnosticsView } from './LabDiagnosticsView';
import { ModernPharmacyManager } from './ModernPharmacyManager';
import { generateInstitutionalDemoData } from '../../utils/demoData';
import { apiService } from '../../services/apiService';
import { generateOphthalPrescriptionPdf } from '../../services/pdfService';

type HISModule = 'general' | 'inpatient' | 'dental' | 'eye' | 'ear' | 'billing' | 'broadcaster' | 'appointments' | 'config' | 'reports' | 'attendance' | 'diagnostics';

interface HealthCoreProps {
    activeRole?: Role;
    userName?: string;
    institutionId?: string;
}

export const HealthCoreView: React.FC<HealthCoreProps> = ({ activeRole, userName, institutionId }) => {
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
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

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

    React.useEffect(() => {
        const loadInst = async () => {
            if (institutionId) {
                const results = await apiService.fetchModuleRecords('institutions', institutionId);
                if (results && results.length > 0) {
                    setInstitutionData(results[0]);
                }
            }
        };
        loadInst();
    }, [institutionId]);

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
                await apiService.saveModuleRecord('his_vital_statistics', {
                    ...v, institutionId, patientId: activePatientId, recordedAt: new Date().toISOString()
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
                id: `evt_${Date.now()}`
            };
            await apiService.saveModuleRecord('his_clinical_events', clinicalEvent);
            alert("Clinical record saved successfully");
            setIsAddVisitOpen(false);
            fetchPatientData();
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
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30">
            <div className="p-8 pb-4 space-y-8">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                            <SparklesIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Quantum <span className="text-indigo-600 dark:text-indigo-400">Medical</span></h1>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">H.I.S Master Operating System</p>
                        </div>
                    </div>

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
                                            <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all" />
                                        </button>
                                    )) : (
                                        <div className="p-8 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest italic animate-pulse">Patient Not Found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-2xl w-full overflow-x-auto scrollbar-hide border border-slate-200 dark:border-white/5 shadow-inner no-scrollbar">
                    <div className="flex gap-1.5 min-w-max text-white">
                        {[
                            { id: 'general', label: 'Patient 360', icon: HeartIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'inpatient', label: 'Admissions', icon: BuildingOfficeIcon, categories: ['Hospital', 'Clinic', 'Healthcare'] },
                            { id: 'diagnostics', label: 'Diagnostics', icon: BeakerIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'dental', label: 'Dental Core', icon: ScissorsIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Healthcare'] },
                            { id: 'eye', label: 'Ocular Hub', icon: EyeIcon, categories: ['Hospital', 'Clinic', 'Eye', 'Healthcare'] },
                            { id: 'ear', label: 'ENT Hub', icon: SignalIcon, categories: ['Hospital', 'Clinic', 'Ear', 'Healthcare'] },
                            { id: 'billing', label: 'Revenue/SHA', icon: CreditCardIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'broadcaster', label: 'Communications', icon: BellIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'appointments', label: 'Scheduling', icon: CalendarIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'attendance', label: 'Presence', icon: ClockIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'config', label: 'Nexus', icon: SettingsIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                            { id: 'reports', label: 'Intelligence', icon: ChartBarIcon, categories: ['Hospital', 'Clinic', 'Dental', 'Eye', 'Ear', 'Healthcare'] },
                        ]
                        .filter(mod => {
                            const cat = institutionData?.category || 'Hospital';
                            // Exact match or contains
                            return mod.categories.some(c => cat.includes(c));
                        })
                        .map((mod) => (
                            <button key={mod.id} onClick={() => setActiveModule(mod.id as HISModule)} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeModule === mod.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl border border-slate-200 dark:border-slate-700/50 scale-105' : 'text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}>
                                <mod.icon className="w-4 h-4" /> {mod.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="p-8 pt-0">
                <div className="glass-morphism dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/5 p-10 min-h-[70vh] shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
                    {(() => {
                        switch (activeModule) {
                            case 'general': return <GeneralMedicineView activePatient={activePatient} vitals={activePatientVitals} events={activePatientEvents} onOpenVitals={() => setIsUpdateVitalsOpen(true)} onOpenRegister={() => setIsRegisterModalOpen(true)} onAddVisit={() => setIsAddVisitOpen(true)} onAddPrescription={() => setIsPrescriptionModalOpen(true)} />;
                            case 'inpatient': return <InpatientView institutionId={institutionId} onAddWard={() => setIsAddWardOpen(true)} refreshTrigger={wardsRefreshTrigger} />;
                            case 'diagnostics': return <LabDiagnosticsView institutionId={institutionId} activeRole={activeRole} userName={userName} activePatientId={activePatientId} />;
                            case 'dental': return <DentalView onAddVisit={() => setIsAddVisitOpen(true)} />;
                            case 'eye': return <OphthalmologyView onAddVisit={() => setIsAddVisitOpen(true)} onPrintRx={handlePrintOphthalRx} />;
                            case 'ear': return (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 grayscale">
                                    <SignalIcon className="w-20 h-20 text-slate-700 mb-6" />
                                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">ENT Hub (Ear, Nose & Throat)</h3>
                                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mt-2">Specialized ENT clinical workflows are being synchronized.<br/>Please use Patient 360 for general ENT consultations.</p>
                                </div>
                            );
                            case 'billing': return <HISBillingView institutionId={institutionId} />;
                            case 'broadcaster': return <HISBroadcasterView />;
                            case 'appointments': return <AppointmentsView activeRole={activeRole} userName={userName} institutionId={institutionId} demoAppointments={demoData?.hisAppointments} />;
                            case 'config': return <HISConfigView demoStaff={demoData?.hisStaff} />;
                            case 'reports': return <HISReportsView activeRole={activeRole} />;
                            case 'attendance': return <StaffAttendanceView userName={userName} institutionId={institutionId} demoAttendance={demoData?.hisAttendance} />;
                            default: return <GeneralMedicineView activePatient={activePatient} vitals={activePatientVitals} events={activePatientEvents} onOpenVitals={() => setIsUpdateVitalsOpen(true)} onOpenRegister={() => setIsRegisterModalOpen(true)} onAddVisit={() => setIsAddVisitOpen(true)} onAddPrescription={() => setIsPrescriptionModalOpen(true)} />;
                        }
                    })()}
                </div>
            </main>

            <RegisterPatientModal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} onRegister={handleRegisterPatient} />
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
                            <iframe src={pdfPreviewUrl} className="w-full h-full border-none" title="PDF Preview" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const GeneralMedicineView = ({ activePatient, vitals, events, onOpenVitals, onOpenRegister, onAddVisit, onAddPrescription }: { activePatient?: HISPatient | null, vitals?: any[], events?: any[], onOpenVitals: () => void, onOpenRegister: () => void, onAddVisit: () => void, onAddPrescription: () => void }) => (
    <div className="animate-fade-in-up">
        <div className="flex justify-between items-end mb-10">
            <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">{activePatient ? (<>Patient <span className="text-indigo-400">Portfolio</span></>) : (<>Registry <span className="text-indigo-400">Overview</span></>)}</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">{activePatient ? `Displaying clinical file for ${activePatient.fullName}` : 'Unified 360-degree clinical profile registry'}</p>
            </div>
            <button onClick={onOpenRegister} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"><PlusIcon className="w-4 h-4" /> Register Patient</button>
        </div>

        {activePatient ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                <div className="md:col-span-2 space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 relative overflow-hidden bg-white/5">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl">{activePatient.fullName[0].toUpperCase()}</div>
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Full Identity</p><p className="text-lg font-black uppercase tracking-tighter">{activePatient.fullName}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Registry DOB</p><p className="text-sm font-black">{activePatient.dob || 'NOT SET'}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gender Node</p><p className="text-sm font-black uppercase">{activePatient.gender}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Blood Registry</p><p className="text-sm font-black uppercase text-rose-500">{activePatient.bloodGroup || 'UNK'}</p></div>
                                </div>
                                <div className="h-px w-full bg-white/5 my-4"></div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Contact Line</p><p className="text-xs font-black tracking-widest">{activePatient.contact || 'N/A'}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">S.H.A Number</p><p className="text-xs font-black tracking-widest text-indigo-400">{activePatient.shaNumber || 'NOT UPDATED'}</p></div>
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Insurance Unit</p><p className="text-xs font-black tracking-widest uppercase">{activePatient.insuranceProvider || 'PRIVATE PAY'}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 min-h-[500px] relative overflow-hidden bg-white/5">
                        <div className="flex justify-between items-center mb-8">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] italic">Clinical Timeline</p>
                            <div className="flex gap-4">
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
                                    <div className="text-right w-20 pt-1"><p className="text-xs font-black text-white">{item.date}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{item.time}</p></div>
                                    <div className="relative"><div className="w-px h-full bg-white/5 absolute left-1/2 -translate-x-1/2 top-4"></div><div className="w-3 h-3 rounded-full bg-indigo-500 relative z-10 border-4 border-slate-950 group-hover:scale-150 transition-transform"></div></div>
                                    <div className="flex-1 pb-10 border-b border-white/5"><h4 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:text-indigo-400 transition-colors">{item.event}</h4><div className="flex gap-4"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{item.dept}</span><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-400/20 px-3 py-1 rounded-full">{item.provider}</span></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8 italic">Vital Statistics</p>
                        <div className="space-y-6">
                            {(vitals || [
                                { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', trend: 'Normal', color: 'text-emerald-400' },
                                { label: 'Heart Rate', value: '72', unit: 'BPM', trend: '+2', color: 'text-white' },
                                { label: 'Oxygen Saturation', value: '98%', unit: 'SpO2', trend: 'Normal', color: 'text-blue-400' },
                                { label: 'Body Temp', value: '36.8', unit: '°C', trend: '-0.2', color: 'text-white' }
                            ]).map((vital, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">{vital.label}</p><p className="text-2xl font-black">{vital.value} <span className="text-xs font-bold text-slate-500 tracking-tight">{vital.unit}</span></p></div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${vital.color} italic underline underline-offset-4 decoration-2`}>{vital.trend}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={onOpenVitals} className="w-full mt-10 py-5 bg-white text-slate-950 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-white/5 italic">Update Vitals</button>
                    </div>
                    <div className="p-8 rounded-[3rem] bg-rose-500/10 border border-rose-500/20"><p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4">Emergency Contact</p><h4 className="text-sm font-black uppercase tracking-tight text-white mb-2">{activePatient.emergencyContactName || 'NONE REGISTERED'}</h4><p className="text-lg font-black tracking-[0.2em] text-rose-400 italic">{activePatient.emergencyContactPhone || '--- --- ---'}</p></div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 grayscale"><UsersIcon className="w-20 h-20 text-slate-700 mb-6" /><p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Search or Select a patient from the registry <br/>to initialize clinical 360 view</p></div>
        )}
    </div>
);
