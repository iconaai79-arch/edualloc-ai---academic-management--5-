import React, { useState } from 'react';
import { Role, HISPatient } from '../../types';
import { 
    PlusIcon, 
    SparklesIcon,
    ArrowPathIcon,
    SearchIcon,
    ChevronRightIcon,
    UsersIcon,
    EyeIcon,
    BuildingOfficeIcon,
    PencilIcon,
    CreditCardIcon,
    DocumentTextIcon,
    BellIcon,
    Cog8ToothIcon as SettingsIcon,
    ChartBarIcon,
    XIcon
} from '../icons/index';
import { HeartIcon, ActivityIcon, ScissorsIcon, CalendarIcon, GlobeAltIcon, PhotoIcon, ChartLineIcon, ClockIcon } from './HealthIcons';

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
import { generateInstitutionalDemoData } from '../../utils/demoData';
import { apiService } from '../../services/apiService';

type HISModule = 'general' | 'inpatient' | 'dental' | 'eye' | 'billing' | 'broadcaster' | 'appointments' | 'config' | 'reports' | 'attendance';

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

    const demoData = React.useMemo(() => {
        return institutionId ? generateInstitutionalDemoData(institutionId, 'admin') : null;
    }, [institutionId]);

    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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

    const filteredPatients = React.useMemo(() => {
        if (!searchTerm.trim()) return [];
        return patients.filter(p => 
            p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.contact?.includes(searchTerm) ||
            p.shaNumber?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, patients]);

    // Make state accessible to sub-views if needed
    React.useEffect(() => {
        (window as any).openRegisterModal = () => setIsRegisterModalOpen(true);
        return () => { delete (window as any).openRegisterModal; };
    }, []);

    const renderModule = () => {
        const patientData = activePatient || (patients.length > 0 ? patients[0] : null);
        
        switch (activeModule) {
            case 'general':
                return <GeneralMedicineView 
                    activePatient={patientData}
                    vitals={demoData?.hisVitals} 
                    events={demoData?.hisEvents} 
                />;
            case 'inpatient':
                return <InpatientView />;
            case 'dental':
                return <DentalView />;
            case 'eye':
                return <OphthalmologyView />;
            case 'billing':
                return <HISBillingView />;
            case 'broadcaster':
                return <HISBroadcasterView />;
            case 'appointments':
                return <AppointmentsView 
                    activeRole={activeRole} 
                    userName={userName} 
                    institutionId={institutionId} 
                    demoAppointments={demoData?.hisAppointments}
                />;
            case 'config':
                return <HISConfigView demoStaff={demoData?.hisStaff} />;
            case 'reports':
                return <HISReportsView activeRole={activeRole} />;
            case 'attendance':
                return <StaffAttendanceView 
                    userName={userName} 
                    institutionId={institutionId} 
                    demoAttendance={demoData?.hisAttendance}
                />;
            default:
                return <GeneralMedicineView 
                    activePatient={patientData}
                    vitals={demoData?.hisVitals} 
                    events={demoData?.hisEvents} 
                />;
        }
    };

    const handleRegisterPatient = async (patientData: any) => {
        if (!institutionId) {
            alert("Security Error: No active institutional context detected. Please select a valid HIS facility.");
            return;
        }

        try {
            const record = {
                ...patientData,
                institutionId,
                id: `his_p_${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log("Saving Patient Record:", {
                module: 'his_patients',
                record,
                activeInstitutionId: institutionId
            });

            await apiService.saveModuleRecord('his_patients', record);
            alert("Success: Patient registered successfully in Quantum Medical Registry");
            setIsRegisterModalOpen(false);
            fetchPatients();
            
            if (activeModule === 'general') {
                setActivePatientId(record.id);
            }
        } catch (error: any) {
            console.error("Patient registration failed:", error);
            const errorMsg = error.message || "Unknown gateway error";
            alert(`Intake Failed: ${errorMsg}\n\nPlease ensure the database tables are initialized and your connection is stable.`);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30">
            {/* Master Header - Property Management Style */}
            <div className="p-8 pb-4 space-y-8">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-500/20 text-white">
                                <SparklesIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tighter italic">Quantum <span className="text-indigo-600 dark:text-indigo-400">Medical</span></h1>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">H.I.S Master Operating System</p>
                            </div>
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
                            
                            {/* Search Results Dropdown */}
                            {searchTerm && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden max-h-[400px] overflow-y-auto no-scrollbar">
                                    <div className="p-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search Results ({filteredPatients.length})</p>
                                        <button onClick={() => setSearchTerm('')} className="p-1 hover:text-rose-500"><XIcon className="w-3 h-3" /></button>
                                    </div>
                                    {filteredPatients.length > 0 ? (
                                        filteredPatients.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => {
                                                    setActivePatientId(p.id);
                                                    setSearchTerm('');
                                                    setActiveModule('general');
                                                }}
                                                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group border-b border-slate-50 dark:border-white/5 last:border-0"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs">
                                                        {p.fullName[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-tight">{p.fullName}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.gender} • {p.contact || 'No Contact'}</p>
                                                    </div>
                                                </div>
                                                <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic animate-pulse">Intake Registry ID Not Found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sub-navigation bar - Standardized PM Format */}
                <div className="flex bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-2xl w-full overflow-x-auto scrollbar-hide border border-slate-200 dark:border-white/5 shadow-inner no-scrollbar">
                    <div className="flex gap-1.5 min-w-max text-white">
                        {[
                            { id: 'general', label: 'Patient 360', icon: HeartIcon },
                            { id: 'inpatient', label: 'Admissions', icon: BuildingOfficeIcon },
                            { id: 'dental', label: 'Dental Core', icon: ScissorsIcon },
                            { id: 'eye', label: 'Ocular Hub', icon: EyeIcon },
                            { id: 'billing', label: 'Revenue/SHA', icon: CreditCardIcon },
                            { id: 'broadcaster', label: 'Signal', icon: BellIcon },
                            { id: 'appointments', label: 'Scheduling', icon: CalendarIcon },
                            { id: 'attendance', label: 'Presence', icon: ClockIcon },
                            { id: 'config', label: 'Nexus', icon: SettingsIcon },
                            { id: 'reports', label: 'Intelligence', icon: ChartBarIcon },
                        ].map((mod) => (
                            <button
                                key={mod.id}
                                onClick={() => setActiveModule(mod.id as HISModule)}
                                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeModule === mod.id 
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl border border-slate-200 dark:border-slate-700/50 scale-105' 
                                    : 'text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400'
                                }`}
                            >
                                <mod.icon className="w-4 h-4" />
                                {mod.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="p-8 pt-0">
                <div className="glass-morphism dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/5 p-10 min-h-[70vh] shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
                    {renderModule()}
                </div>
            </main>

            <RegisterPatientModal 
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
                onRegister={handleRegisterPatient}
            />
        </div>
    );
};

// --- General Medicine View (Patient 360) ---

const GeneralMedicineView = ({ activePatient, vitals, events }: { activePatient?: HISPatient | null, vitals?: any[], events?: any[] }) => (
    <div className="animate-fade-in-up">
        <div className="flex justify-between items-end mb-10">
            <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">
                    {activePatient ? (
                        <>Patient <span className="text-indigo-400">Portfolio</span></>
                    ) : (
                        <>Registry <span className="text-indigo-400">Overview</span></>
                    )}
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">
                    {activePatient ? `Displaying clinical file for ${activePatient.fullName}` : 'Unified 360-degree clinical profile registry'}
                </p>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={() => (window as any).openRegisterModal && (window as any).openRegisterModal()}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
                >
                    <PlusIcon className="w-4 h-4" /> Register Patient
                </button>
            </div>
        </div>

        {activePatient ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    {/* Patient Summary Card */}
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 relative overflow-hidden bg-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                                {activePatient.fullName[0].toUpperCase()}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Full Identity</p>
                                        <p className="text-lg font-black uppercase tracking-tighter">{activePatient.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Registry DOB</p>
                                        <p className="text-sm font-black uppercase">{activePatient.dob || 'NOT SET'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gender Node</p>
                                        <p className="text-sm font-black uppercase">{activePatient.gender}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Blood Registry</p>
                                        <p className="text-sm font-black uppercase text-rose-500">{activePatient.bloodGroup || 'UNK'}</p>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-white/5 my-4"></div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Contact Line</p>
                                        <p className="text-xs font-black tracking-widest">{activePatient.contact || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">S.H.A Number</p>
                                        <p className="text-xs font-black tracking-widest text-indigo-400">{activePatient.shaNumber || 'NOT UPDATED'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Insurance Unit</p>
                                        <p className="text-xs font-black tracking-widest uppercase">{activePatient.insuranceProvider || 'PRIVATE PAY'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 h-[500px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Clinical Timeline</p>
                        
                        <div className="space-y-12">
                            {(events || [
                                { date: 'Oct 12', time: '14:30', event: 'Dental Extraction (Tooth 14)', dept: 'Dental', provider: 'Dr. Sarah' },
                                { date: 'Sep 28', time: '10:15', event: 'Refraction Exam (OD: -2.25)', dept: 'Ophthalmology', provider: 'Dr. Mike' },
                                { date: 'Sep 15', time: '09:00', event: 'General Consultation', dept: 'OPD', provider: 'Dr. Jane' }
                            ]).map((item, i) => (
                                <div key={i} className="flex gap-8 group">
                                    <div className="text-right w-20 pt-1">
                                        <p className="text-xs font-black text-white">{item.date}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{item.time}</p>
                                    </div>
                                    <div className="relative">
                                        <div className="w-px h-full bg-white/5 absolute left-1/2 -translate-x-1/2 top-4"></div>
                                        <div className="w-3 h-3 rounded-full bg-indigo-500 relative z-10 border-4 border-slate-950 group-hover:scale-150 transition-transform"></div>
                                    </div>
                                    <div className="flex-1 pb-10 border-b border-white/5">
                                        <h4 className="text-sm font-black uppercase tracking-tight mb-2 group-hover:text-indigo-400 transition-colors">{item.event}</h4>
                                        <div className="flex gap-4">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{item.dept}</span>
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-400/20 px-3 py-1 rounded-full">{item.provider}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Vital Statistics</p>
                        <div className="space-y-6">
                            {(vitals || [
                                { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', trend: 'Normal', color: 'text-emerald-400' },
                                { label: 'Heart Rate', value: '72', unit: 'BPM', trend: '+2', color: 'text-white' },
                                { label: 'Oxygen Saturation', value: '98%', unit: 'SpO2', trend: 'Normal', color: 'text-blue-400' },
                                { label: 'Body Temp', value: '36.8', unit: '°C', trend: '-0.2', color: 'text-white' }
                            ]).map((vital, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{vital.label}</p>
                                        <p className="text-2xl font-black">{vital.value} <span className="text-xs font-bold text-slate-500 tracking-tight">{vital.unit}</span></p>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${vital.color} italic underline underline-offset-4 decoration-2`}>
                                        {vital.trend}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-10 py-5 bg-white text-slate-950 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-white/5">
                            Update Vitals
                        </button>
                    </div>

                    {/* Emergency Link Card */}
                    <div className="p-8 rounded-[3rem] bg-rose-500/10 border border-rose-500/20">
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4">Emergency Contact</p>
                        <h4 className="text-sm font-black uppercase tracking-tight text-white mb-2">{activePatient.emergencyContactName || 'NONE REGISTERED'}</h4>
                        <p className="text-lg font-black tracking-[0.2em] text-rose-400 italic">{activePatient.emergencyContactPhone || '--- --- ---'}</p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 grayscale">
                <UsersIcon className="w-20 h-20 text-slate-700 mb-6" />
                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Search or Select a patient from the registry <br/>to initialize clinical 360 view</p>
            </div>
        )}
    </div>
);
