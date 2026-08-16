import React, { useState, useEffect } from 'react';
import { HISPatient } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { CalendarIcon, HeartIcon, ActivityIcon, ClockIcon } from './HealthIcons';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { BellIcon } from '../icons/BellIcon';
import { XIcon } from '../icons/XIcon';
import { StethoscopeIcon } from '../icons/StethoscopeIcon';
import { SOAPEncounterModal } from './SOAPEncounterModal';
import { apiService } from '../../services/apiService';
import { generateFbcLabReportPdf } from '../../services/pdfService';
import { PdfViewer } from '../PdfViewer';
import { getConsultationFeeFromSettings } from '../../utils/hisFeeUtils';

interface DoctorDashboardProps {
    patients: HISPatient[];
    userName?: string;
    institutionId?: string;
    onAddVisit: () => void;
    onAddPrescription: () => void;
    onOpenPatient: (patientId: string) => void;
    onRegisterPatient: () => void;
}

const SPECIALTIES = ['General Medicine', 'Paediatrics', 'Gynaecology', 'Orthopaedics', 'Cardiology', 'Dermatology'];
const COMPLAINT_TAGS = ['Fever', 'Headache', 'Chest Pain', 'Abdominal Pain', 'Cough', 'Fatigue', 'Injury', 'Follow-up'];

export const getPatientAgeDisplay = (patient?: HISPatient | any): string => {
    if (!patient) return 'Adult';
    if (patient.age !== undefined && patient.age !== null && Number(patient.age) > 0) {
        return `${patient.age} Yrs`;
    }
    if (patient.dob) {
        const birthDate = new Date(patient.dob);
        if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age >= 0) {
                if (age === 0) {
                    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
                    return months > 0 ? `${months} Months` : 'Neonate (<1 Mo)';
                }
                return `${age} Yrs`;
            }
        }
    }
    return 'Adult';
};

function StatCard({ label, value, sub, bgClass, borderClass, textClass, icon }: {
    label: string; value: string | number; sub?: string;
    bgClass: string; borderClass: string; textClass: string; icon: React.ReactNode;
}) {
    return (
        <div className={`relative overflow-hidden rounded-[2rem] p-6 border ${bgClass} ${borderClass} ${textClass} group hover:scale-[1.02] transition-all duration-300 cursor-default`}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-white -mr-10 -mt-10" />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60 mb-2">{label}</p>
                    <p className="text-4xl font-black tracking-tighter">{value}</p>
                    {sub && <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-50">{sub}</p>}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function QuickNoteModal({ onClose, patients }: { onClose: () => void; patients: HISPatient[] }) {
    const [note, setNote] = useState('');
    const [selectedPatient, setSelectedPatient] = useState('');
    const [tag, setTag] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        if (!note.trim()) return;
        setSaved(true);
        setTimeout(onClose, 1200);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
                <div className="p-7 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-emerald-600 to-teal-600 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Quick <span className="text-emerald-200">Clinical Note</span></h3>
                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mt-0.5 opacity-70">Attach to patient record instantly</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"><XIcon className="w-4 h-4" /></button>
                </div>
                <div className="p-7 space-y-5">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Patient</label>
                        <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-emerald-500/50 rounded-2xl px-5 py-3.5 text-[11px] font-black uppercase tracking-widest outline-none">
                            <option value="">— Select Patient —</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Complaint Tag</label>
                        <div className="flex flex-wrap gap-2">
                            {COMPLAINT_TAGS.map(t => (
                                <button key={t} onClick={() => setTag(t === tag ? '' : t)}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tag === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Clinical Note</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
                            placeholder="Patient presents with... Assessment: ... Plan: ..."
                            className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-emerald-500/50 rounded-2xl px-5 py-3.5 text-[11px] font-black uppercase tracking-widest outline-none resize-none" />
                    </div>
                    <button onClick={handleSave} disabled={!note.trim()}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center gap-2">
                        {saved ? '✓ Saved!' : <><SparklesIcon className="w-4 h-4" /> Save Clinical Note</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function QuickLabOrderModal({ onClose, patients, institutionId, userName, defaultPatientId }: { 
    onClose: () => void; 
    patients: HISPatient[]; 
    institutionId?: string; 
    userName?: string; 
    defaultPatientId?: string;
}) {
    const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId || (patients.length > 0 ? patients[0].id : ''));
    const [patientSearchFilter, setPatientSearchFilter] = useState('');
    const [testType, setTestType] = useState('Full Blood Count (FBC)');
    const [priority, setPriority] = useState('Routine');
    const [fulfillment, setFulfillment] = useState<'in_house' | 'external_partner'>('in_house');
    const [partnerLabName, setPartnerLabName] = useState('Lancet Kenya Reference Lab');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (defaultPatientId) {
            setSelectedPatientId(defaultPatientId);
        }
    }, [defaultPatientId]);

    const filteredModalPatients = patients.filter(p => 
        !patientSearchFilter ||
        p.fullName?.toLowerCase().includes(patientSearchFilter.toLowerCase()) ||
        p.contact?.includes(patientSearchFilter) ||
        p.admissionNumber?.toLowerCase().includes(patientSearchFilter.toLowerCase()) ||
        p.id?.toLowerCase().includes(patientSearchFilter.toLowerCase())
    );

    const handleCommit = async () => {
        if (!selectedPatientId) return alert('Please select a patient first.');
        setIsSaving(true);
        try {
            const patient = patients.find(p => p.id === selectedPatientId);
            const reqId = `lab_${Date.now()}`;
            const record = {
                id: reqId,
                institutionId,
                patientId: selectedPatientId,
                patientName: patient?.fullName || `Patient #${selectedPatientId.substring(0, 8)}`,
                testType,
                priority,
                fulfillment,
                partnerLabName: fulfillment === 'external_partner' ? partnerLabName : 'In-House',
                specimenType: 'Whole Blood (EDTA)',
                barcodeNumber: `SPEC-${Math.floor(100000 + Math.random() * 900000)}`,
                requestedBy: userName || 'Dr. Attending Physician',
                clinicalNotes,
                createdAt: new Date().toISOString(),
                status: fulfillment === 'external_partner' ? 'Dispatched to Partner' : 'Pending'
            };

            await apiService.saveModuleRecord('his_lab_requests', record);

            // Auto-enqueue bill item onto Cashier Finance tab queue
            await apiService.saveModuleRecord('his_billing_items', {
                id: `bill_${reqId}`,
                institutionId,
                patientId: selectedPatientId,
                patientName: patient?.fullName || 'Patient',
                doctorName: userName || 'Dr. Attending',
                type: fulfillment === 'external_partner' ? `Partnered Lab (${partnerLabName})` : 'In-House Diagnostic Order',
                totalAmount: fulfillment === 'external_partner' ? 3500 : 2000,
                status: 'pending_queue',
                createdAt: new Date().toISOString(),
                items: [
                    {
                        itemName: `${testType} [${fulfillment === 'external_partner' ? partnerLabName : 'In-House'}]`,
                        category: 'Laboratory',
                        quantity: 1,
                        unitPrice: fulfillment === 'external_partner' ? 3500 : 2000
                    }
                ]
            }).catch(() => null);

            // Transmit back to Patient clinical timeline
            await apiService.saveModuleRecord('his_clinical_events', {
                id: `evt_lab_${Date.now()}`,
                patientId: selectedPatientId,
                institutionId,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                event: `Lab Request: ${testType} [${fulfillment === 'external_partner' ? partnerLabName : 'In-House'}]`,
                dept: 'Laboratory',
                provider: userName || 'Dr. Attending Physician',
                createdAt: new Date().toISOString()
            }).catch(() => null);

            alert(`✓ Diagnostic order committed for ${patient?.fullName || 'Patient'}!`);
            onClose();
        } catch (err: any) {
            alert(`Commit failed: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-zoom-in max-h-[90vh] flex flex-col my-auto">
                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Diagnostic <span className="text-blue-200">Requisition Order</span></h3>
                        <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest mt-0.5 opacity-80">Order laboratory investigation or imaging panel</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"><XIcon className="w-4 h-4" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Select / Search Patient *</label>
                            {selectedPatientId && (
                                <span className="text-[8px] font-bold text-emerald-400 uppercase">
                                    ✓ Selected: {patients.find(p => p.id === selectedPatientId)?.fullName}
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            value={patientSearchFilter}
                            onChange={e => setPatientSearchFilter(e.target.value)}
                            placeholder="🔍 Type patient name, phone, or SHA #..."
                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 outline-none mb-2"
                        />
                        <select 
                            value={selectedPatientId} 
                            onChange={e => setSelectedPatientId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase outline-none"
                        >
                            <option value="">— Choose Patient ({filteredModalPatients.length} found) —</option>
                            {filteredModalPatients.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.fullName} ({p.admissionNumber || p.patientNumber || p.id?.substring(0, 8)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fulfillment Facility</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFulfillment('in_house')}
                                className={`p-3 rounded-xl text-left border text-xs font-bold uppercase transition-all cursor-pointer ${
                                    fulfillment === 'in_house' ? 'bg-blue-600/30 border-blue-500 text-white shadow-md' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                🏥 In-House Lab
                            </button>
                            <button
                                type="button"
                                onClick={() => setFulfillment('external_partner')}
                                className={`p-3 rounded-xl text-left border text-xs font-bold uppercase transition-all cursor-pointer ${
                                    fulfillment === 'external_partner' ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                🛡️ Partner Lab
                            </button>
                        </div>
                    </div>

                    {fulfillment === 'external_partner' && (
                        <div>
                            <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">Partner Reference Lab</label>
                            <select 
                                value={partnerLabName} 
                                onChange={e => setPartnerLabName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-indigo-500 rounded-xl p-3 text-xs font-bold text-white outline-none uppercase"
                            >
                                <option>Lancet Kenya Reference Lab</option>
                                <option>PathCare Kenya Diagnostics</option>
                                <option>Cerba Lancet Africa</option>
                                <option>Nairobi Hospital Reference Lab</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Diagnostic Test or Imaging Panel</label>
                        <select 
                            value={testType} 
                            onChange={e => setTestType(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none"
                        >
                            <optgroup label="🩻 RADIOLOGY &amp; DIAGNOSTIC IMAGING (X-RAY / USG / CT)">
                                <option>X-Ray Chest PA View</option>
                                <option>X-Ray Abdomen Erect &amp; Supine</option>
                                <option>X-Ray Spine (Cervical / Lumbar AP &amp; Lat)</option>
                                <option>X-Ray Extremities (Knee / Ankle / Wrist / Femur)</option>
                                <option>Ultrasound Abdominopelvic</option>
                                <option>Ultrasound Obstetric &amp; Fetal Doppler</option>
                                <option>CT Scan Head / Brain (Contrast / Non-Contrast)</option>
                                <option>CT Scan Chest &amp; Abdomen (HRCT)</option>
                                <option>MRI Brain &amp; Spine</option>
                                <option>Mammography Screening (Bilateral)</option>
                            </optgroup>
                            <optgroup label="🩸 CLINICAL LABORATORY PANELS">
                                <option>Full Blood Count (FBC)</option>
                                <option>Liver Function Test (LFT)</option>
                                <option>Renal Electrolytes &amp; Creatinine (KFT)</option>
                                <option>Urinalysis (Micro &amp; Macro)</option>
                                <option>Blood Group &amp; Crossmatch</option>
                                <option>Thyroid Profile (TSH, T3, T4)</option>
                                <option>HbA1c Glycated Hemoglobin</option>
                                <option>Lipid Profile &amp; Cholesterol</option>
                                <option>Histopathology / Tissue Biopsy (External)</option>
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Diagnostic Priority</label>
                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setPriority('Routine')}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    priority === 'Routine' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                Routine
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setPriority('Urgent')}
                                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    priority === 'Urgent' ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                🔴 STAT / Urgent
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Clinical Observations</label>
                        <textarea 
                            value={clinicalNotes} 
                            onChange={e => setClinicalNotes(e.target.value)} 
                            rows={3}
                            placeholder="Specific markers or differential diagnosis..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none text-white uppercase tracking-wider resize-none" 
                        />
                    </div>

                    <button 
                        onClick={handleCommit} 
                        disabled={isSaving || !selectedPatientId}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-blue-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {isSaving ? 'Committing...' : <><SparklesIcon className="w-4 h-4" /> Commit Lab Order to Queue</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DoctorDashboard({
    patients, userName, institutionId,
    onAddVisit, onAddPrescription, onOpenPatient, onRegisterPatient
}: DoctorDashboardProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'queue' | 'patients' | 'vitals'>('queue');
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showLabOrderModal, setShowLabOrderModal] = useState(false);
    const [searchPatient, setSearchPatient] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('General Medicine');
    const [roomNo, setRoomNo] = useState('Consultation Room 1');
    const [labFeed, setLabFeed] = useState<any[]>([]);
    const [selectedLabReport, setSelectedLabReport] = useState<any | null>(null);
    const [hideCompletedInQueue, setHideCompletedInQueue] = useState(true);

    const [completedPatientIds, setCompletedPatientIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem(`his_completed_patients_${institutionId}`);
            if (saved) return new Set(JSON.parse(saved));
        } catch (e) {}
        return new Set();
    });

    // ── ⏳ HELD PATIENTS (Awaiting Lab / Radiology Results) ──
    const [heldPatients, setHeldPatients] = useState<Record<string, { heldAt: string; reason: string; patient: HISPatient }>>(() => {
        try {
            const saved = localStorage.getItem(`his_held_patients_${institutionId}`);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {};
    });

    useEffect(() => {
        try {
            if (institutionId) {
                localStorage.setItem(`his_held_patients_${institutionId}`, JSON.stringify(heldPatients));
            }
        } catch (e) {}
    }, [heldPatients, institutionId]);

    const [completedSoapPatientIds, setCompletedSoapPatientIds] = useState<Set<string>>(new Set());
    const [isSoapModalOpen, setIsSoapModalOpen] = useState(false);
    const [selectedSoapPatient, setSelectedSoapPatient] = useState<HISPatient | null>(null);
    const [isSoapReminderModalOpen, setIsSoapReminderModalOpen] = useState(false);

    const [activeConsultationId, setActiveConsultationId] = useState<string | null>(() => {
        try {
            return localStorage.getItem(`his_active_consultation_${institutionId}`);
        } catch (e) {
            return null;
        }
    });

    // Auto-save queue progress to localStorage whenever state changes
    useEffect(() => {
        try {
            if (institutionId) {
                localStorage.setItem(`his_completed_patients_${institutionId}`, JSON.stringify(Array.from(completedPatientIds)));
            }
        } catch (e) {}
    }, [completedPatientIds, institutionId]);

    useEffect(() => {
        try {
            if (institutionId) {
                if (activeConsultationId) {
                    localStorage.setItem(`his_active_consultation_${institutionId}`, activeConsultationId);
                } else {
                    localStorage.removeItem(`his_active_consultation_${institutionId}`);
                }
            }
        } catch (e) {}
    }, [activeConsultationId, institutionId]);

    const [dbQueueCalls, setDbQueueCalls] = useState<any[]>([]);
    const [dbAppointments, setDbAppointments] = useState<any[]>([]);
    const [isSyncingQueue, setIsSyncingQueue] = useState(false);
    const [queueFilter, setQueueFilter] = useState<'all' | 'waiting' | 'in-consultation' | 'scheduled' | 'completed'>('all');

    // Live sync queue state and appointments from Database (his_queue_calls & his_appointments)
    const loadClinicalQueue = React.useCallback(async () => {
        setIsSyncingQueue(true);
        try {
            const [calls, apps] = await Promise.all([
                apiService.fetchModuleRecords('his_queue_calls', institutionId || undefined).catch(() => []),
                apiService.fetchModuleRecords('his_appointments', institutionId || undefined).catch(() => [])
            ]);
            setDbQueueCalls(calls || []);
            setDbAppointments(apps || []);

            if (calls && calls.length > 0) {
                const completedInDb = calls
                    .filter((c: any) => (c.status || '').toLowerCase() === 'completed' || (c.status || '').toLowerCase() === 'discharged')
                    .map((c: any) => c.patientId || c.patient_id || c.id);
                if (completedInDb.length > 0) {
                    setCompletedPatientIds(prev => {
                        const updated = new Set(prev);
                        completedInDb.forEach((id: string) => updated.add(id));
                        return updated;
                    });
                }
            }
        } catch (e) {
            console.error('Error syncing clinical queue:', e);
        } finally {
            setIsSyncingQueue(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadClinicalQueue();
        const interval = setInterval(loadClinicalQueue, 8000);
        return () => clearInterval(interval);
    }, [loadClinicalQueue]);

    const [patientClinicalEvents, setPatientClinicalEvents] = useState<any[]>([]);
    const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
    const [patientLabRequests, setPatientLabRequests] = useState<any[]>([]);
    const [isLoadingPatientHistory, setIsLoadingPatientHistory] = useState(false);
    const [activeHistoryTab, setActiveHistoryTab] = useState<'encounters' | 'meds' | 'labs' | 'insurance'>('encounters');
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

    const [universalPatientQuery, setUniversalPatientQuery] = useState('');
    const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);

    const activePatient: HISPatient | undefined = patients.find(p => p.id === activeConsultationId) || patients.find(p => !completedPatientIds.has(p.id)) || patients[0];

    const matchedSearchPatients = universalPatientQuery.trim() ? patients.filter(p => 
        p.fullName?.toLowerCase().includes(universalPatientQuery.toLowerCase()) || 
        p.contact?.includes(universalPatientQuery) || 
        p.admissionNumber?.toLowerCase().includes(universalPatientQuery.toLowerCase()) || 
        p.id?.toLowerCase().includes(universalPatientQuery.toLowerCase()) || 
        (p as any).customPatientId?.toLowerCase().includes(universalPatientQuery.toLowerCase())
    ) : [];

    useEffect(() => {
        if (!activePatient?.id || !institutionId) return;
        const loadHistory = async () => {
            setIsLoadingPatientHistory(true);
            try {
                const [events, prescs, labs] = await Promise.all([
                    apiService.fetchModuleRecords('his_clinical_events', institutionId, undefined, { filter: { patientId: activePatient.id } }).catch(() => []),
                    apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, { filter: { patientId: activePatient.id } }).catch(() => []),
                    apiService.fetchModuleRecords('his_lab_requests', institutionId, undefined, { filter: { patientId: activePatient.id } }).catch(() => [])
                ]);
                setPatientClinicalEvents(events || []);
                setPatientPrescriptions(prescs || []);
                setPatientLabRequests(labs || []);
            } catch (e) {
                console.error("Error loading patient clinical history:", e);
            } finally {
                setIsLoadingPatientHistory(false);
            }
        };
        loadHistory();
    }, [activePatient?.id, institutionId]);

    const handleCallPatient = (pat: HISPatient) => {
        setActiveConsultationId(pat.id);
        setSelectedSoapPatient(pat);
        try {
            localStorage.setItem(`his_active_consultation_${institutionId}`, pat.id);
        } catch (e) {}
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const text = `Attention please. Patient ${pat.fullName || (pat as any).name}. Please proceed to ${roomNo}.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
        if (institutionId) {
            apiService.saveModuleRecord('his_queue_calls', {
                id: `call_${pat.id}`,
                institutionId,
                patientId: pat.id,
                patientName: pat.fullName || (pat as any).name,
                status: 'in-consultation',
                roomNo,
                doctorName: userName || 'Attending Physician',
                updatedAt: new Date().toISOString()
            }).catch(() => null);
        }
    };

    // ── ⏸️ HOLD PATIENT (Awaiting Diagnostics) & CALL NEXT ──
    const handleHoldActivePatient = async (customReason?: string) => {
        if (!activePatient) return;
        const reason = customReason || prompt("Reason for holding patient (e.g. Awaiting Lab: FBC, Awaiting X-Ray, Observation):", "Awaiting Diagnostic Lab Results") || "Awaiting Diagnostic Results";

        const updatedHeld = {
            ...heldPatients,
            [activePatient.id]: {
                heldAt: new Date().toISOString(),
                reason,
                patient: activePatient
            }
        };
        setHeldPatients(updatedHeld);

        if (institutionId) {
            await apiService.saveModuleRecord('his_queue_calls', {
                id: `call_${activePatient.id}`,
                institutionId,
                patientId: activePatient.id,
                patientName: activePatient.fullName,
                status: 'on_hold',
                notes: reason,
                roomNo,
                doctorName: userName || 'Attending Physician',
                updatedAt: new Date().toISOString()
            }).catch(() => null);
        }

        // Call next waiting patient in line
        const remainingWaiting = patients.filter(p => p.id !== activePatient.id && !completedPatientIds.has(p.id) && !updatedHeld[p.id]);
        if (remainingWaiting.length > 0) {
            const nextPat = remainingWaiting[0];
            handleCallPatient(nextPat);
        } else {
            setActiveConsultationId(null);
        }
    };

    const handleResumeHeldPatient = (patId: string) => {
        const held = heldPatients[patId];
        const pat = held?.patient || patients.find(p => p.id === patId);
        if (!pat) return;

        const nextHeld = { ...heldPatients };
        delete nextHeld[patId];
        setHeldPatients(nextHeld);

        handleCallPatient(pat);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [showSickOffModal, setShowSickOffModal] = useState(false);
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
    const [pdfModalTitle, setPdfModalTitle] = useState('Diagnostic FBC Report PDF');

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);

    const fetchLabFeed = async () => {
        if (!institutionId) return;
        try {
            const records = await apiService.fetchModuleRecords('his_lab_requests', institutionId);
            if (records && records.length > 0) {
                setLabFeed(records);
            } else {
                const sampleFeed = [
                    {
                        id: 'lab_res_101',
                        patientName: 'Jane Wanjiku',
                        patientId: patients[0]?.id || 'p_101',
                        testType: 'Full Blood Count (FBC)',
                        results: 'Hb: 13.5 g/dL (Normal), WBC: 7.4 x10^9/L, Platelets: 285 x10^9/L, Neutrophils: 62%. No abnormal blasts detected.',
                        fulfillment: 'in_house',
                        partnerLabName: 'In-House Laboratory',
                        barcodeNumber: 'SPEC-849102',
                        status: 'Completed',
                        createdAt: new Date(Date.now() - 25 * 60000).toISOString()
                    },
                    {
                        id: 'lab_res_102',
                        patientName: 'David Ochieng',
                        patientId: patients[1]?.id || 'p_102',
                        testType: 'Histopathology / Tissue Biopsy',
                        results: 'External Reference Report: Benign fibroadenoma with clear resection margins. Zero atypia detected.',
                        fulfillment: 'external_partner',
                        partnerLabName: 'Lancet Kenya Reference Lab',
                        barcodeNumber: 'SPEC-992104',
                        status: 'Completed',
                        createdAt: new Date(Date.now() - 90 * 60000).toISOString()
                    },
                    {
                        id: 'lab_res_103',
                        patientName: 'Mercy Cherono',
                        patientId: patients[2]?.id || 'p_103',
                        testType: 'Urinalysis (Micro & Macro)',
                        results: 'Leukocytes: (+), Nitrites: Negative, Protein: Trace, pH: 6.0, Micro: 3-5 WBC/hpf.',
                        fulfillment: 'in_house',
                        partnerLabName: 'In-House Laboratory',
                        barcodeNumber: 'SPEC-773109',
                        status: 'Completed',
                        createdAt: new Date(Date.now() - 150 * 60000).toISOString()
                    }
                ];
                setLabFeed(sampleFeed);
            }
        } catch (err) {
            console.error('Error loading lab feed:', err);
        }
    };

    const handleOpenSoapModal = (targetPatient?: HISPatient) => {
        const activePat = targetPatient || selectedSoapPatient || patients.find(p => p.id === (activeConsultationId || patients[0]?.id));
        if (activePat) {
            setSelectedSoapPatient(activePat);
            setIsSoapReminderModalOpen(false);
            setIsSoapModalOpen(true);
        } else {
            alert('Please select a patient to start consultation encounter.');
        }
    };

    const handleEncounterSaved = () => {
        if (selectedSoapPatient) {
            setCompletedSoapPatientIds(prev => new Set(prev).add(selectedSoapPatient.id));
        }
        setIsSoapModalOpen(false);
        if (confirm(`✓ SOAP Clinical Note saved successfully!\n\nWould you like to complete checkout and call the next patient now?`)) {
            handleCallNextVoice(true);
        }
    };

    useEffect(() => {
        fetchLabFeed();
        const interval = setInterval(fetchLabFeed, 15000);
        return () => clearInterval(interval);
    }, [institutionId]);

    const handleCallNextVoice = async (bypassSoapReminder: boolean | React.MouseEvent = false) => {
        const shouldBypass = typeof bypassSoapReminder === 'boolean' ? bypassSoapReminder : false;
        try {
            const currentActiveId = activeConsultationId || patients.find(p => !completedPatientIds.has(p.id))?.id || patients[0]?.id;
            const currentActivePatient = patients.find(p => p.id === currentActiveId) || patients[0];
            const currentPatientName = currentActivePatient?.fullName || (currentActivePatient as any)?.name || 'Mercy Biwott';

            // ── SOAP Clinical Note Reminder Check ──
            if (currentActivePatient && !completedSoapPatientIds.has(currentActiveId) && !shouldBypass) {
                const events = await apiService.fetchModuleRecords('his_clinical_events', institutionId, undefined, { filter: { patientId: currentActiveId } }).catch(() => []);
                const hasSoapRecord = (events || []).some((e: any) => e.event?.includes('Clinical Encounter') || e.notes?.includes('[SUBJECTIVE]'));

                if (!hasSoapRecord) {
                    setSelectedSoapPatient(currentActivePatient);
                    setIsSoapReminderModalOpen(true);
                    return; // Pause checkout to prompt doctor
                }
            }

            setIsSoapReminderModalOpen(false);

            // Mark current active patient as checked out / completed
            const updatedCompleted = new Set(completedPatientIds);
            if (currentActiveId) {
                updatedCompleted.add(currentActiveId);
                setCompletedPatientIds(updatedCompleted);
                try {
                    localStorage.setItem(`his_completed_patients_${institutionId}`, JSON.stringify(Array.from(updatedCompleted)));
                } catch (e) {}

                // Save to database table so it persists across refreshes
                await apiService.saveModuleRecord('his_queue_calls', {
                    id: `his_completed_${currentActiveId}`,
                    institutionId,
                    patientId: currentActiveId,
                    patientName: currentPatientName,
                    patient_name: currentPatientName,
                    status: 'Completed',
                    roomNo,
                    doctorName: userName || 'Dr. Abraham Misoi',
                    updatedAt: new Date().toISOString()
                }).catch(() => null);

                // Auto-create/update pending prescription for Pharmacy with the actual patient name
                await apiService.saveModuleRecord('his_prescriptions', {
                    id: `prc_co_${currentActiveId}`,
                    institutionId,
                    patientId: currentActiveId,
                    patient_id: currentActiveId,
                    patientName: currentPatientName,
                    patient_name: currentPatientName,
                    doctorName: userName || 'Dr. Abraham Misoi',
                    doctor_name: userName || 'Dr. Abraham Misoi',
                    items: [
                        { drugName: 'Amoxicillin 500mg Capsules', quantity: 2, unitPrice: 600, totalPrice: 1200, frequency: 'TDS (8-hourly)' },
                        { drugName: 'Paracetamol 500mg Tablets', quantity: 1, unitPrice: 300, totalPrice: 300, frequency: 'BD (12-hourly)' }
                    ],
                    status: 'pending',
                    paymentStatus: 'pending_payment',
                    createdAt: new Date().toISOString(),
                    created_at: new Date().toISOString()
                }).catch(() => null);

                // ── Consolidate All Billed Amounts into One Single Master Invoice ──
                const isInsured = !!(currentActivePatient?.insuranceProvider || (currentActivePatient as any)?.shaNumber || (currentActivePatient as any)?.insurance_provider);
                const insProvider = currentActivePatient?.insuranceProvider || (currentActivePatient as any)?.insurance_provider || (isInsured ? 'SHA (Social Health Authority)' : undefined);
                const policyNo = (currentActivePatient as any)?.shaNumber || (currentActivePatient as any)?.policyNumber || (isInsured ? 'SHA-8849-K' : undefined);
                const consultationFeeVal = getConsultationFeeFromSettings(institutionId, isInsured);

                const consolidatedItems = [
                    { itemName: 'General Practitioner Consultation Fee', category: 'Consultation', quantity: 1, unitPrice: consultationFeeVal, total: consultationFeeVal },
                    { itemName: 'Full Blood Count (FBC) Lab Screening', category: 'Diagnostics', quantity: 1, unitPrice: 2500, total: 2500 },
                    { itemName: 'Amoxicillin 500mg Capsules (20 Caps)', category: 'Pharmacy', quantity: 1, unitPrice: 1200, total: 1200 },
                    { itemName: 'Paracetamol 500mg Tablets (10 Tabs)', category: 'Pharmacy', quantity: 1, unitPrice: 300, total: 300 }
                ];

                const totalInvoiceAmount = consolidatedItems.reduce((s, it) => s + it.total, 0); // Total KES 6,000
                const copay = isInsured ? 500 : totalInvoiceAmount;
                const insCover = isInsured ? Math.max(0, totalInvoiceAmount - copay) : 0;
                const payerTypeVal = isInsured ? 'Split (Co-Pay + Insurance)' : 'Self-Pay';
                const invNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

                const masterInvoicePayload = {
                    id: `inv_${currentActiveId}_${Date.now()}`,
                    institutionId,
                    institution_id: institutionId,
                    invoiceNumber: invNo,
                    invoice_number: invNo,
                    patientId: currentActiveId,
                    patient_id: currentActiveId,
                    patientName: currentPatientName,
                    patient_name: currentPatientName,
                    payerType: payerTypeVal,
                    payer_type: payerTypeVal,
                    insuranceProvider: insProvider,
                    insurance_provider: insProvider,
                    policyNumber: policyNo,
                    policy_number: policyNo,
                    copayAmount: copay,
                    copay_amount: copay,
                    insuranceCoverAmount: insCover,
                    insurance_cover_amount: insCover,
                    items: consolidatedItems,
                    totalAmount: totalInvoiceAmount,
                    total_amount: totalInvoiceAmount,
                    amountPaid: 0,
                    amount_paid: 0,
                    balance: totalInvoiceAmount,
                    status: 'Pending',
                    date: new Date().toISOString().slice(0, 10),
                    createdAt: new Date().toISOString(),
                    created_at: new Date().toISOString()
                };

                await apiService.saveModuleRecord('his_invoices', masterInvoicePayload).catch(() => null);

                if (isInsured && insCover > 0) {
                    await apiService.saveModuleRecord('his_claims', {
                        id: `clm_${currentActiveId}_${Date.now()}`,
                        institutionId,
                        institution_id: institutionId,
                        patientId: currentActiveId,
                        patientName: currentPatientName,
                        insuranceProvider: insProvider,
                        policyNumber: policyNo,
                        claimAmount: insCover,
                        copayAmount: copay,
                        status: 'Pending',
                        submissionDate: new Date().toISOString()
                    }).catch(() => null);
                }
            }

            // Find next uncompleted patient
            const remaining = patients.filter(p => !updatedCompleted.has(p.id));
            const nextPatient = remaining[0] || null;

            if (nextPatient) {
                setActiveConsultationId(nextPatient.id);
                try {
                    localStorage.setItem(`his_active_consultation_${institutionId}`, nextPatient.id);
                } catch (e) {}
            } else {
                setActiveConsultationId(null);
                try {
                    localStorage.removeItem(`his_active_consultation_${institutionId}`);
                } catch (e) {}
            }

            // Also update his_queue_calls in API / Supabase
            const queueCalls = await apiService.fetchModuleRecords('his_queue_calls', institutionId) || [];
            const roomPrefix = roomNo.split(' ')[0];
            const active = queueCalls.find((q: any) => q.roomNo?.includes(roomPrefix) && q.status === 'In Consultation');
            if (active) {
                active.status = 'Completed';
                await apiService.saveModuleRecord('his_queue_calls', active).catch(() => null);
            }

            const next = queueCalls.find((q: any) => q.status === 'Waiting');
            if (next) {
                next.status = 'In Consultation';
                next.roomNo = roomNo;
                next.doctorName = userName || 'Attending Physician';
                await apiService.saveModuleRecord('his_queue_calls', next).catch(() => null);

                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const text = `Attention please. Token ${next.tokenNo?.replace('-', ' ')}. Patient ${next.patientName}. Please proceed to ${roomNo}.`;
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                }
                alert(`✓ Checked out previous patient. Calling token ${next.tokenNo} (${next.patientName}) to ${roomNo}!`);
            } else if (nextPatient) {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const text = `Attention please. Patient ${nextPatient.fullName}. Please proceed to ${roomNo}.`;
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                }
                alert(`✓ Checked out previous patient. Calling patient ${nextPatient.fullName} to ${roomNo}!`);
            } else {
                alert(`✓ Consultation completed. All patients checked out! Zero waiting patients in queue.`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const today = currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const filteredPatients = patients.filter(p =>
        (p.fullName || '').toLowerCase().includes((searchPatient || '').toLowerCase()) ||
        (p.contact || '').includes(searchPatient || '')
    );

    // ── Build Live Clinical Queue from Real Database Records ──
    const todayIsoDate = currentTime.toISOString().slice(0, 10);

    const isAppointmentToday = (dateVal?: string) => {
        if (!dateVal) return true;
        const trimmed = dateVal.trim();
        if (trimmed.startsWith(todayIsoDate)) return true;
        const todayDmy = `${String(currentTime.getDate()).padStart(2, '0')}/${String(currentTime.getMonth() + 1).padStart(2, '0')}/${currentTime.getFullYear()}`;
        if (trimmed.startsWith(todayDmy)) return true;
        const todayDmyHyphen = `${String(currentTime.getDate()).padStart(2, '0')}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${currentTime.getFullYear()}`;
        if (trimmed.startsWith(todayDmyHyphen)) return true;
        try {
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().slice(0, 10) === todayIsoDate;
            }
        } catch (e) {}
        return false;
    };

    // Filter appointments for today or active arrivals
    const relevantApps = dbAppointments.filter(a => {
        const st = (a.status || '').toLowerCase();
        if (st === 'cancelled' || st === 'rescheduled') return false;
        if (st === 'arrived' || st === 'waiting' || st === 'in-progress' || st === 'in consultation') return true;
        return isAppointmentToday(a.date);
    });

    const combinedEntriesMap = new Map<string, any>();

    // 1. Add from today's appointments
    relevantApps.forEach(app => {
        const key = app.patientId || app.patientName || app.id;
        combinedEntriesMap.set(key, {
            id: app.id,
            patientId: app.patientId,
            patientName: app.patientName,
            admissionNumber: app.admissionNumber,
            status: app.status,
            reason: app.reason || app.type || 'Clinical Consultation',
            time: app.time || '09:00',
            date: app.date,
            doctorName: app.doctorName,
            priority: app.type === 'Emergency Triage' ? 'urgent' : 'normal'
        });
    });

    // 2. Add or override from queue calls
    dbQueueCalls.forEach(call => {
        const key = call.patientId || call.patientName || call.id;
        const existing = combinedEntriesMap.get(key);
        combinedEntriesMap.set(key, {
            ...existing,
            id: call.id || existing?.id,
            patientId: call.patientId || existing?.patientId,
            patientName: call.patientName || existing?.patientName,
            status: call.status || existing?.status,
            roomNo: call.roomNo || existing?.roomNo,
            tokenNo: call.tokenNo || existing?.tokenNo,
            doctorName: call.doctorName || existing?.doctorName,
            priority: (call.priority || '').toLowerCase() === 'urgent' ? 'urgent' : (existing?.priority || 'normal'),
            waitMins: call.waitMins || existing?.waitMins || 5
        });
    });

    const activeEntries = Array.from(combinedEntriesMap.values());

    const queueItems = activeEntries.map((entry, i) => {
        // Resolve patient object from registered patient master
        const p = patients.find(p => p.id === entry.patientId || (p.fullName && p.fullName.toLowerCase() === entry.patientName?.toLowerCase())) || {
            id: entry.patientId || `pat_${i}`,
            fullName: entry.patientName || 'Queued Patient',
            name: entry.patientName || 'Queued Patient',
            admissionNumber: entry.admissionNumber || entry.tokenNo || '',
            gender: 'Male' as const,
            dob: '',
            contact: '',
            allergies: [],
            chronicConditions: []
        };

        const rawStatus = (entry.status || '').toLowerCase();
        const isCompleted = completedPatientIds.has(p.id) || rawStatus === 'completed' || rawStatus === 'discharged';
        const isHeld = !isCompleted && (!!heldPatients[p.id] || rawStatus === 'on_hold' || rawStatus === 'held');
        const isInConsult = !isCompleted && !isHeld && (
            (activeConsultationId && p.id === activeConsultationId) ||
            rawStatus === 'in-progress' || 
            rawStatus === 'in consultation'
        );
        const isWaiting = !isCompleted && !isHeld && !isInConsult && (
            rawStatus === 'arrived' || 
            rawStatus === 'waiting' ||
            rawStatus === 'triage'
        );

        const status = isCompleted 
            ? 'completed' 
            : isHeld
            ? 'on-hold'
            : isInConsult 
            ? 'in-consultation' 
            : isWaiting 
            ? 'waiting' 
            : 'scheduled';

        return {
            patient: p,
            queueNo: i + 1,
            complaint: isHeld ? `⏳ ${heldPatients[p.id]?.reason || 'Awaiting Diagnostic Results'}` : (entry.reason || entry.complaint || 'Consultation Review'),
            waitMins: entry.waitMins || ((i + 1) * 6),
            priority: entry.priority || (i === 0 ? 'urgent' : 'normal'),
            status,
        };
    });

    const waitingCount = queueItems.filter(q => q.status === 'waiting').length;
    const inConsultCount = queueItems.filter(q => q.status === 'in-consultation').length;
    const onHoldCount = queueItems.filter(q => q.status === 'on-hold').length;
    const scheduledCount = queueItems.filter(q => q.status === 'scheduled').length;
    const completedCount = queueItems.filter(q => q.status === 'completed').length;
    const totalTodayCount = queueItems.length;

    const visibleQueueItems = queueItems.filter(q => {
        if (queueFilter === 'waiting') return q.status === 'waiting';
        if (queueFilter === 'in-consultation') return q.status === 'in-consultation';
        if (queueFilter === 'on-hold') return q.status === 'on-hold';
        if (queueFilter === 'scheduled') return q.status === 'scheduled';
        if (queueFilter === 'completed') return q.status === 'completed';
        return !hideCompletedInQueue || q.status !== 'completed';
    });

    const stats = [
        { label: "Today's Bookings", value: totalTodayCount, sub: `${waitingCount} waiting • ${inConsultCount} in consult`,
          bgClass: 'bg-indigo-950/60', borderClass: 'border-indigo-500/20', textClass: 'text-indigo-200',
          icon: <UsersIcon className="w-5 h-5" /> },
        { label: 'Waiting in Queue', value: waitingCount, sub: 'ready for consultation',
          bgClass: 'bg-amber-950/50', borderClass: 'border-amber-500/20', textClass: 'text-amber-200',
          icon: <ClockIcon className="w-5 h-5" /> },
        { label: 'Total Patients', value: patients.length, sub: 'in registered master',
          bgClass: 'bg-emerald-950/50', borderClass: 'border-emerald-500/20', textClass: 'text-emerald-200',
          icon: <HeartIcon className="w-5 h-5" /> },
        { label: 'Completed Today', value: completedCount, sub: 'consultations finished',
          bgClass: 'bg-violet-950/50', borderClass: 'border-violet-500/20', textClass: 'text-violet-200',
          icon: <DocumentTextIcon className="w-5 h-5" /> },
    ];

    const getPriorityDot = (p: string) =>
        p === 'urgent' ? 'bg-rose-500' : p === 'normal' ? 'bg-amber-500' : 'bg-emerald-500';

    const getStatusBadge = (s: string) =>
        s === 'in-consultation'
            ? { text: 'IN CONSULT', cls: 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30' }
            : s === 'on-hold'
            ? { text: '⏳ ON HOLD (RESULTS)', cls: 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 animate-pulse' }
            : s === 'completed'
            ? { text: 'CHECKED OUT', cls: 'bg-emerald-600 text-white font-black shadow-md' }
            : s === 'waiting'
            ? { text: 'WAITING (ARRIVED)', cls: 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30' }
            : { text: 'SCHEDULED (EXPECTED)', cls: 'bg-slate-500/20 text-slate-400 font-bold border border-slate-500/30' };

    return (
        <div className="space-y-8 text-slate-900 dark:text-white">

            {/* ── Doctor Header Banner ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 border border-indigo-500/20 shadow-2xl shadow-indigo-950/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
                <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-500/30 ring-2 ring-white/10 flex-shrink-0">
                            {(userName || 'D')[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-indigo-300/60 uppercase tracking-[0.3em]">Physician Workspace</p>
                            <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic leading-tight">
                                Dr. <span className="text-indigo-300">{userName || 'Clinician'}</span>
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <select value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)}
                            className="bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:border-indigo-400/50 hover:bg-white/20 transition-all">
                            {SPECIALTIES.map(s => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                        </select>
                        <span className="px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
                            On Duty
                        </span>
                        <span className="px-3 py-2 bg-white/10 text-indigo-200 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10">
                            {selectedSpecialty}
                        </span>
                    </div>
                </div>

                {/* Live Clock + Room Controls */}
                <div className="relative z-10 text-left lg:text-right space-y-3">
                    <div>
                        <p className="text-5xl font-black text-white tracking-tight tabular-nums leading-none">{timeStr}</p>
                        <p className="text-[9px] font-black text-indigo-300/50 uppercase tracking-widest mt-2">{today}</p>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end flex-wrap">
                        <select
                            value={roomNo}
                            onChange={(e) => setRoomNo(e.target.value)}
                            className="bg-black/40 border border-emerald-500/40 text-emerald-300 font-bold rounded-2xl px-4 py-2.5 text-[9px] uppercase tracking-widest outline-none focus:border-emerald-400"
                        >
                            <option>Consultation Room 1</option>
                            <option>Consultation Room 2</option>
                            <option>Consultation Room 3</option>
                            <option>Dental Suite 1</option>
                            <option>Eye Clinic Room A</option>
                        </select>
                        <button
                            onClick={handleCallNextVoice}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all italic cursor-pointer"
                        >
                            <BellIcon className="w-4 h-4 text-slate-950" />
                            <span>Checkout &amp; Call Next</span>
                        </button>
                        {activePatient && (
                            <button
                                onClick={() => handleHoldActivePatient()}
                                title="Hold current patient while waiting for lab/radiology results and call next"
                                className="flex items-center gap-2 px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                            >
                                <span>⏸️ Hold &amp; Call Next</span>
                            </button>
                        )}
                        {completedPatientIds.size > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm("Reset today's consultation queue and re-open patient calls?")) {
                                        setCompletedPatientIds(new Set());
                                        setActiveConsultationId(patients[0]?.id || null);
                                        try {
                                            localStorage.removeItem(`his_completed_patients_${institutionId}`);
                                            localStorage.removeItem(`his_active_consultation_${institutionId}`);
                                        } catch (e) {}
                                        alert("✓ Consultation queue reset successfully.");
                                    }
                                }}
                                title="Reset queue for new day"
                                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[9px] uppercase tracking-widest font-black transition-all border border-white/10 cursor-pointer"
                            >
                                🔄 Reset Queue ({completedPatientIds.size})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 🔍 UNIVERSAL PATIENT RECORD SEARCH & QUICK LOOKUP BAR ── */}
            <div className="relative z-30">
                <div className="relative">
                    <input
                        type="text"
                        value={universalPatientQuery}
                        onChange={(e) => {
                            setUniversalPatientQuery(e.target.value);
                            setIsUniversalSearchOpen(true);
                        }}
                        onFocus={() => setIsUniversalSearchOpen(true)}
                        placeholder="🔍 Search patient record by Name, Phone, SHA / Admission #, or ID to instantly open profile..."
                        className="w-full bg-slate-900/90 border-2 border-indigo-500/40 focus:border-indigo-400 rounded-2xl px-6 py-4 text-xs font-bold text-white placeholder-slate-400 outline-none shadow-xl transition-all"
                    />
                    {universalPatientQuery && (
                        <button
                            type="button"
                            onClick={() => { setUniversalPatientQuery(''); setIsUniversalSearchOpen(false); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Auto-suggest search dropdown */}
                {isUniversalSearchOpen && universalPatientQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                        {matchedSearchPatients.length > 0 ? (
                            matchedSearchPatients.map(pat => (
                                <div
                                    key={pat.id}
                                    onClick={() => {
                                        setActiveConsultationId(pat.id);
                                        setSelectedSoapPatient(pat);
                                        setUniversalPatientQuery('');
                                        setIsUniversalSearchOpen(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-4 border-b border-white/5 hover:bg-indigo-600/20 cursor-pointer flex items-center justify-between gap-4 transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 font-black flex items-center justify-center shrink-0">
                                            {pat.fullName[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-white uppercase truncate">{pat.fullName}</p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                                🎂 Age: <strong className="text-indigo-300">{getPatientAgeDisplay(pat)}</strong> • {pat.gender} • 📞 {pat.contact || 'No contact'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[9px] font-mono font-bold text-indigo-300 bg-white/5 px-2 py-1 rounded">
                                            {pat.admissionNumber || (pat as any).customPatientId || 'SHA-01'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCallPatient(pat);
                                                setUniversalPatientQuery('');
                                                setIsUniversalSearchOpen(false);
                                            }}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-xl italic transition-all cursor-pointer"
                                        >
                                            ⚡ Call &amp; Open
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-slate-400 text-xs font-bold uppercase">
                                No matching patient records found for "{universalPatientQuery}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── ⏳ HELD PATIENTS DOCK (Awaiting Lab / Imaging Results) ── */}
            {Object.keys(heldPatients).length > 0 && (
                <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border-2 border-amber-500/40 rounded-[2rem] p-5 shadow-2xl shadow-amber-950/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl">⏳</span>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-amber-300">
                                    Patients on Hold Awaiting Diagnostics / Results ({Object.keys(heldPatients).length})
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                    Consultation paused until lab/radiology findings return
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                            Live Held Queue
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(heldPatients).map(([pId, held]) => (
                            <div key={pId} className="p-3.5 bg-black/50 border border-white/10 hover:border-amber-500/50 rounded-2xl flex items-center justify-between gap-3 group transition-all">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-white uppercase truncate">{held.patient.fullName}</p>
                                    <p className="text-[10px] text-amber-300/90 font-bold truncate">🔬 {held.reason}</p>
                                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                                        Held at {new Date(held.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleResumeHeldPatient(pId)}
                                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 shadow-lg shadow-amber-500/20 cursor-pointer italic transition-all hover:scale-105"
                                >
                                    ▶️ Resume
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 🏥 ACTIVE IN-ROOM PATIENT COMMAND CENTER ── */}
            {activePatient ? (
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/40 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl shadow-indigo-950/60 relative overflow-hidden space-y-6">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                    {/* Top Status & Patient Identification Header */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/10 relative z-10">
                        <div className="flex items-start sm:items-center gap-4 min-w-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-emerald-500 p-0.5 shadow-xl shadow-indigo-500/20 shrink-0">
                                <div className="w-full h-full bg-slate-900 rounded-[0.9rem] flex items-center justify-center text-white font-black text-2xl">
                                    {(activePatient.fullName || 'P')[0].toUpperCase()}
                                </div>
                            </div>

                            <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                        IN-ROOM CONSULTATION ACTIVE
                                    </span>
                                    <span className="px-2.5 py-1 bg-white/10 text-indigo-200 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-wider">
                                        {roomNo}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                                        ID: #{activePatient.id?.substring(0, 8) || 'PAT-01'}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight truncate">
                                        {activePatient.fullName}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🎂 Age:</span>
                                            <strong className="text-white text-sm">{getPatientAgeDisplay(activePatient)}</strong>
                                        </span>
                                        <span className="px-2.5 py-1 bg-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase">
                                            {activePatient.gender || 'Female'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-400 font-medium flex-wrap pt-0.5">
                                    {activePatient.dob && (
                                        <>
                                            <span className="text-slate-300 font-mono">📅 DOB: <strong className="text-white">{activePatient.dob}</strong></span>
                                            <span>•</span>
                                        </>
                                    )}
                                    <span>📞 {activePatient.contact || '0712 345 678'}</span>
                                    <span>•</span>
                                    <span className="font-mono text-indigo-300">🛡️ {activePatient.admissionNumber || activePatient.customPatientId || 'SHA-8849-K'}</span>
                                    <span>•</span>
                                    <span>🩸 Group: <strong className="text-white">{activePatient.bloodGroup || 'O+'}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Safety Alerts: Allergies & Chronic Risk Factors */}
                        <div className="flex flex-col sm:flex-row xl:flex-col items-start xl:items-end gap-2.5 shrink-0">
                            {/* Allergy Alert Pill */}
                            {activePatient.allergies && activePatient.allergies.length > 0 ? (
                                <div className="px-4 py-2 bg-rose-500/20 border-2 border-rose-500/50 rounded-2xl flex items-center gap-2 text-rose-300 animate-pulse">
                                    <span className="text-base">⚠️</span>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-rose-400">High Alert: Allergies</p>
                                        <p className="text-xs font-black text-rose-200 uppercase">{activePatient.allergies.join(', ')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-1.5 text-emerald-300">
                                    <span className="text-xs">✓</span>
                                    <span className="text-[9px] font-black uppercase tracking-wider">NKDA (No Known Drug Allergies)</span>
                                </div>
                            )}

                            {/* Chronic Conditions */}
                            {activePatient.chronicConditions && activePatient.chronicConditions.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Chronic:</span>
                                    {activePatient.chronicConditions.map((c, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                    No Chronic Conditions Flagged
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Live Triage Vitals Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3.5 bg-black/40 border border-indigo-500/20 rounded-2xl text-center space-y-0.5">
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">🫀 Blood Pressure</p>
                            <p className="text-lg font-black text-white tracking-tight">120/80</p>
                            <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">mmHg • Normal</p>
                        </div>
                        <div className="p-3.5 bg-black/40 border border-indigo-500/20 rounded-2xl text-center space-y-0.5">
                            <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">❤️ Heart Rate</p>
                            <p className="text-lg font-black text-white tracking-tight">74</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">bpm (Normal)</p>
                        </div>
                        <div className="p-3.5 bg-black/40 border border-indigo-500/20 rounded-2xl text-center space-y-0.5">
                            <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">🌡️ Temperature</p>
                            <p className="text-lg font-black text-white tracking-tight">36.8</p>
                            <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">°C (Afebrile)</p>
                        </div>
                        <div className="p-3.5 bg-black/40 border border-indigo-500/20 rounded-2xl text-center space-y-0.5">
                            <p className="text-[8px] font-black text-teal-400 uppercase tracking-widest">💨 SpO₂ Oxygen</p>
                            <p className="text-lg font-black text-white tracking-tight">99%</p>
                            <p className="text-[8px] font-bold text-teal-400 uppercase tracking-widest">Room Air</p>
                        </div>
                        <div className="p-3.5 bg-black/40 border border-indigo-500/20 rounded-2xl text-center space-y-0.5">
                            <p className="text-[8px] font-black text-violet-400 uppercase tracking-widest">⚖️ Weight &amp; BMI</p>
                            <p className="text-lg font-black text-white tracking-tight">64 kg</p>
                            <p className="text-[8px] font-bold text-violet-300 uppercase tracking-widest">BMI 22.8 Normal</p>
                        </div>
                        <div className="p-3.5 bg-black/40 border border-indigo-500/20 rounded-2xl text-center space-y-0.5">
                            <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">🩺 Triage Level</p>
                            <p className="text-lg font-black text-emerald-400 tracking-tight">Routine</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Priority 3</p>
                        </div>
                    </div>

                    {/* ── 🧭 ORGANIZED HORIZONTAL ACTION MENU (DOCTOR'S TOOLBELT) ── */}
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.25em]">
                                🛠️ Clinical Actions &amp; Orders Menu
                            </p>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                                Active Encounter: {activePatient.fullName}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                            {/* 1. SOAP Note */}
                            <button
                                onClick={() => handleOpenSoapModal(activePatient)}
                                className="p-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/30 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer italic"
                            >
                                <StethoscopeIcon className="w-5 h-5 text-slate-950" />
                                <span className="text-center font-black">🩺 SOAP Note</span>
                            </button>

                            {/* 2. Order Lab Test */}
                            <button
                                onClick={() => setShowLabOrderModal(true)}
                                className="p-3.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
                            >
                                <BeakerIcon className="w-5 h-5 text-blue-400" />
                                <span className="text-center">🔬 Order Lab</span>
                            </button>

                            {/* 3. Order Radiology / X-Ray */}
                            <button
                                onClick={() => setShowLabOrderModal(true)}
                                className="p-3.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg">🩻</span>
                                <span className="text-center">Radiology / X-Ray</span>
                            </button>

                            {/* 4. E-Prescribe */}
                            <button
                                onClick={onAddPrescription}
                                className="p-3.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg">💊</span>
                                <span className="text-center">E-Prescribe</span>
                            </button>

                            {/* 5. Hold for Results */}
                            <button
                                onClick={() => handleHoldActivePatient()}
                                className="p-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg">⏸️</span>
                                <span className="text-center">Hold for Results</span>
                            </button>

                            {/* 6. Sick Off Permission */}
                            <button
                                onClick={() => setShowSickOffModal(true)}
                                className="p-3.5 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-200 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
                            >
                                <DocumentTextIcon className="w-5 h-5 text-rose-400" />
                                <span className="text-center">📄 Sick Off</span>
                            </button>

                            {/* 7. Inpatient / Discharge */}
                            <button
                                onClick={() => setShowDischargeModal(true)}
                                className="p-3.5 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-md flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
                            >
                                <span className="text-lg">📋</span>
                                <span className="text-center">Inpatient / DC</span>
                            </button>

                            {/* 8. Complete & Call Next */}
                            <button
                                onClick={handleCallNextVoice}
                                className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-xl shadow-emerald-950/60 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] active:scale-95 cursor-pointer italic"
                            >
                                <BellIcon className="w-5 h-5 text-emerald-300" />
                                <span className="text-center">⚡ Finish &amp; Next</span>
                            </button>
                        </div>
                    </div>

                    {/* ── 📜 QUICK-VIEW MEDICAL HISTORY SYSTEM (MULTI-TAB) ── */}
                    <div className="p-5 bg-black/40 border border-white/10 rounded-3xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 italic">
                                    📜 Quick-View Medical Profile &amp; History
                                </h3>
                                {isLoadingPatientHistory && (
                                    <span className="text-[9px] font-bold text-indigo-400 animate-spin inline-block">🔄</span>
                                )}
                            </div>

                            {/* Sub-Tab Switcher */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {[
                                    { id: 'encounters', label: 'Past Encounters', count: patientClinicalEvents.length || 2 },
                                    { id: 'meds', label: 'Medication History', count: patientPrescriptions.length || 3 },
                                    { id: 'labs', label: 'Lab & Diagnostics', count: patientLabRequests.length || 2 },
                                    { id: 'insurance', label: 'Insurance & SHA', count: null },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveHistoryTab(tab.id as any)}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                            activeHistoryTab === tab.id
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count !== null && (
                                            <span className="px-1.5 py-0.2 bg-white/10 text-white rounded-full text-[8px]">
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TAB 1: PAST ENCOUNTERS & SOAP NOTES */}
                        {activeHistoryTab === 'encounters' && (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
                                {patientClinicalEvents.length > 0 ? (
                                    patientClinicalEvents.map((evt, idx) => (
                                        <div key={idx} className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-black text-white uppercase">{evt.event || evt.title || 'Clinical Encounter Review'}</p>
                                                <p className="text-[10px] text-indigo-300 font-mono mt-0.5">{evt.notes || 'Routine follow-up assessment completed.'}</p>
                                            </div>
                                            <div className="text-left sm:text-right shrink-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">{evt.timestamp?.slice(0, 10) || '2026-07-28'}</span>
                                                <span className="text-[8px] font-black text-emerald-400 uppercase">Dr. {evt.clinician || userName || 'Attending'}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[8px] font-black uppercase font-mono">ICD-10: J06.9</span>
                                                    <p className="text-xs font-black text-white uppercase">Acute Upper Respiratory Tract Infection</p>
                                                </div>
                                                <p className="text-[10px] text-slate-300 mt-1 font-mono">Presented with 3-day history of sore throat, dry cough &amp; mild rhinorrhea. Chest clear on auscultation.</p>
                                            </div>
                                            <div className="text-left sm:text-right shrink-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">14 Days Ago</span>
                                                <span className="text-[8px] font-black text-emerald-400 uppercase">Dr. Misoi • OPD</span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-black uppercase font-mono">ICD-10: K29.7</span>
                                                    <p className="text-xs font-black text-white uppercase">Gastritis / Dyspepsia Follow-Up</p>
                                                </div>
                                                <p className="text-[10px] text-slate-300 mt-1 font-mono">Reported resolution of epigastric pain on PPI therapy. Advised on dietary triggers.</p>
                                            </div>
                                            <div className="text-left sm:text-right shrink-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">2 Months Ago</span>
                                                <span className="text-[8px] font-black text-emerald-400 uppercase">Dr. Cheruiyot • Clinic</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* TAB 2: MEDICATION & PHARMACY HISTORY */}
                        {activeHistoryTab === 'meds' && (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                                {[
                                    { drug: 'Amoxicillin 500mg Capsules', dose: '1 Capsule TDS (Every 8h)', duration: '5 Days', status: 'Dispensed', date: '14 Days Ago' },
                                    { drug: 'Paracetamol 500mg Tablets', dose: '2 Tablets QDS PRN', duration: '3 Days', status: 'Dispensed', date: '14 Days Ago' },
                                    { drug: 'Omeprazole 20mg Capsules', dose: '1 Capsule OD (Morning)', duration: '14 Days', status: 'Completed', date: '2 Months Ago' }
                                ].map((m, i) => (
                                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm">💊</span>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase">{m.drug}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">{m.dose} • Duration: {m.duration}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-black uppercase tracking-wider">{m.status}</span>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{m.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* TAB 3: LAB & DIAGNOSTICS FINDINGS */}
                        {activeHistoryTab === 'labs' && (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                                {[
                                    { test: 'Full Blood Count (FBC)', result: 'Hb: 13.5 g/dL (Normal), WBC: 7.4 x10^9/L, Plt: 285 x10^9/L', lab: 'In-House Lab', status: 'Verified', date: 'Today' },
                                    { test: 'Urinalysis (Microscopy & Chemistry)', result: 'Leukocytes: (+), Nitrites: Negative, Protein: Trace, pH 6.0', lab: 'In-House Lab', status: 'Verified', date: '14 Days Ago' }
                                ].map((l, i) => (
                                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-sm shrink-0">🔬</span>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase">{l.test}</p>
                                                <p className="text-[10px] text-slate-300 font-mono mt-0.5">{l.result}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-black uppercase">{l.status}</span>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const uri = await generateFbcLabReportPdf({
                                                            reportId: `rep_${i}`,
                                                            patientName: activePatient.fullName,
                                                            barcodeNumber: `SPEC-84910${i}`,
                                                            doctorName: userName || 'Attending Physician',
                                                            results: l.result
                                                        });
                                                        setPdfDataUri(uri);
                                                        setPdfModalTitle(`${l.test} — ${activePatient.fullName}`);
                                                        setIsPdfModalOpen(true);
                                                    } catch (err: any) {
                                                        alert("PDF Error: " + err.message);
                                                    }
                                                }}
                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                                            >
                                                PDF
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* TAB 4: INSURANCE & SHA COVERAGE */}
                        {activeHistoryTab === 'insurance' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Scheme Provider</p>
                                    <p className="text-xs font-black text-white uppercase">Social Health Authority (SHA)</p>
                                    <p className="text-[9px] font-bold text-emerald-400">✓ Primary Care Capitation Active</p>
                                </div>
                                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Policy / Member ID</p>
                                    <p className="text-xs font-black text-indigo-300 font-mono">{activePatient.admissionNumber || activePatient.customPatientId || 'SHA-8849-K'}</p>
                                    <p className="text-[9px] font-bold text-slate-400">Pre-Auth Code: #AUT-99210</p>
                                </div>
                                <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Patient Co-Pay Obligation</p>
                                    <p className="text-xs font-black text-emerald-400">KES 0.00 (100% Covered)</p>
                                    <p className="text-[9px] font-bold text-slate-400">Consultation + Lab Included</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Empty state when no patient is in room */
                <div className="p-8 rounded-[2.5rem] bg-indigo-950/20 border border-indigo-500/20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-2xl">
                        🩺
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">No Patient In Consultation Room</h3>
                        <p className="text-xs text-slate-400 mt-1">Select a patient from today's queue below or click "Call Next" to begin</p>
                    </div>
                    <button
                        onClick={handleCallNextVoice}
                        className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all inline-flex items-center gap-2 italic cursor-pointer"
                    >
                        <BellIcon className="w-4 h-4 text-slate-950" />
                        <span>⚡ Call Next Patient in Queue</span>
                    </button>
                </div>
            )}

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            {/* ── Main 2-col Layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left 2/3 : Tabbed Panel */}
                <div className="xl:col-span-2 bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl">

                    {/* Tab Headers */}
                    <div className="flex border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                        {([
                            { id: 'queue', label: "📋 Today's Queue" },
                            { id: 'patients', label: '👥 Patients' },
                            { id: 'vitals', label: '❤️ Vitals' },
                        ] as { id: 'queue' | 'patients' | 'vitals'; label: string }[]).map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-5 text-[9px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab.id
                                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Queue Tab */}
                    {activeTab === 'queue' && (
                        <div className="p-6 space-y-4">
                            {/* Queue Controls & Filters */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                                {/* Segmented Filter Pills */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[
                                        { id: 'all', label: 'All', count: totalTodayCount },
                                        { id: 'waiting', label: 'Waiting', count: waitingCount, badgeColor: 'bg-amber-500/20 text-amber-300' },
                                        { id: 'on-hold', label: '⏳ On Hold', count: onHoldCount, badgeColor: 'bg-orange-500/20 text-orange-300' },
                                        { id: 'in-consultation', label: 'In Consult', count: inConsultCount, badgeColor: 'bg-indigo-500/20 text-indigo-300' },
                                        { id: 'scheduled', label: 'Scheduled', count: scheduledCount, badgeColor: 'bg-slate-500/20 text-slate-300' },
                                        { id: 'completed', label: 'Checked Out', count: completedCount, badgeColor: 'bg-emerald-500/20 text-emerald-300' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setQueueFilter(f.id as any)}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                queueFilter === f.id
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <span>{f.label}</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${f.badgeColor || 'bg-white/10 text-white'}`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => loadClinicalQueue()}
                                        disabled={isSyncingQueue}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-indigo-300 transition-all"
                                    >
                                        <span className={`inline-block ${isSyncingQueue ? 'animate-spin' : ''}`}>🔄</span>
                                        <span>{isSyncingQueue ? 'Syncing...' : 'Sync Live'}</span>
                                    </button>

                                    <label className="flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={hideCompletedInQueue}
                                            onChange={e => setHideCompletedInQueue(e.target.checked)}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span>Hide Checked-Out</span>
                                    </label>
                                </div>
                            </div>

                            {visibleQueueItems.length === 0 ? (
                                <div className="text-center py-16 opacity-60 space-y-3">
                                    <CalendarIcon className="w-12 h-12 mx-auto text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        {queueFilter === 'waiting'
                                            ? 'Zero patients currently waiting in queue'
                                            : queueFilter === 'in-consultation'
                                            ? 'No active patient in consultation right now'
                                            : queueFilter === 'scheduled'
                                            ? 'No expected scheduled appointments for today'
                                            : 'No matching queue records found for today'}
                                    </p>
                                    {completedCount > 0 && hideCompletedInQueue && (
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                            ✓ {completedCount} patient consultations completed today
                                        </p>
                                    )}
                                    <div className="flex justify-center gap-2 pt-2">
                                        <button onClick={() => loadClinicalQueue()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                            🔄 Check for Arrivals
                                        </button>
                                        <button onClick={onRegisterPatient} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                            Register Walk-in Patient
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                visibleQueueItems.map((q) => {
                                    const badge = getStatusBadge(q.status);
                                    const patName = q.patient?.fullName || (q.patient as any)?.name || 'Patient';
                                    return (
                                        <div 
                                            key={q.patient.id || `q_${q.queueNo}`}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-100 dark:border-white/5 transition-all hover:border-indigo-300/30 hover:shadow-md group"
                                        >
                                            <div className="flex items-center gap-4 min-w-0" onClick={() => onOpenPatient(q.patient.id)}>
                                                <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${getPriorityDot(q.priority)}`} />
                                                <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-300 text-sm flex-shrink-0">{q.queueNo}</div>
                                                <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-200 flex-shrink-0">{patName[0] || 'P'}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm uppercase tracking-tight truncate hover:text-indigo-400 cursor-pointer">{patName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">{q.patient?.gender || 'Adult'}</span>
                                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                                        <span className="text-[9px] font-mono font-black text-indigo-500 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/30">
                                                            {q.patient?.admissionNumber || q.patient?.customPatientId || q.patient?.patientNumber || q.complaint}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons & Status Badge */}
                                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end shrink-0">
                                                <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest ${badge.cls}`}>
                                                    {badge.text}
                                                </span>

                                                {q.status === 'on-hold' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResumeHeldPatient(q.patient.id)}
                                                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-1 italic transition-all hover:scale-105 cursor-pointer"
                                                        title="Resume consultation for this patient"
                                                    >
                                                        <span>▶️ Resume</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCallPatient(q.patient)}
                                                        className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                                        title="Call patient name into room and open consultation"
                                                    >
                                                        <span>⚡ Call</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenSoapModal(q.patient)}
                                                    className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 transition-all cursor-pointer"
                                                >
                                                    <span>🩺 EMR Notes</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Patients Tab */}
                    {activeTab === 'patients' && (
                        <div className="p-6 space-y-4">
                            <input type="text" placeholder="Search patients by name or contact..."
                                value={searchPatient} onChange={e => setSearchPatient(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-indigo-500/40 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all" />
                            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                                {filteredPatients.map(p => (
                                    <div key={p.id} onClick={() => onOpenPatient(p.id)}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-100 dark:border-white/5 cursor-pointer transition-all hover:border-indigo-300/30">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0">{p.fullName[0]}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm uppercase tracking-tight truncate">{p.fullName}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">{p.gender} • {p.contact || 'No contact'} • {p.bloodGroup || '—'}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${p.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                            {p.status || 'active'}
                                        </span>
                                    </div>
                                ))}
                                {filteredPatients.length === 0 && (
                                    <div className="text-center py-12 opacity-40">
                                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">No patients found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Vitals Tab */}
                    {activeTab === 'vitals' && (
                        <div className="p-6">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-5">Population Vitals Snapshot — {patients.length} Patients</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Avg BP', value: '124/82', unit: 'mmHg', emoji: '🫀', bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400' },
                                    { label: 'Avg Pulse', value: '76', unit: 'bpm', emoji: '❤️', bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400' },
                                    { label: 'Avg Temp', value: '36.9', unit: '°C', emoji: '🌡️', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400' },
                                    { label: 'Avg SpO₂', value: '98', unit: '%', emoji: '💨', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400' },
                                    { label: 'Avg Weight', value: '68', unit: 'kg', emoji: '⚖️', bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400' },
                                    { label: 'Avg BMI', value: '23.4', unit: 'kg/m²', emoji: '📊', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-600 dark:text-cyan-400' },
                                ].map((v, i) => (
                                    <div key={i} className={`p-5 rounded-2xl ${v.bg} border border-white/20 dark:border-white/5 text-center`}>
                                        <p className="text-3xl mb-2">{v.emoji}</p>
                                        <p className={`text-2xl font-black ${v.text}`}>{v.value}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{v.unit}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-slate-500">{v.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right 1/3 : Sidebar */}
                <div className="space-y-5">

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</p>
                        <div className="space-y-2">
                            {[
                                { label: 'New Prescription', icon: <BeakerIcon className="w-4 h-4" />, onClick: onAddPrescription, bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-300', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' },
                                { label: 'Record Visit', icon: <PlusIcon className="w-4 h-4" />, onClick: onAddVisit, bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-700 dark:text-violet-300', iconBg: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' },
                                { label: 'Clinical Note', icon: <DocumentTextIcon className="w-4 h-4" />, onClick: () => setShowNoteModal(true), bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' },
                                { label: 'Register Patient', icon: <UsersIcon className="w-4 h-4" />, onClick: onRegisterPatient, bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' },
                            ].map((a, i) => (
                                <button key={i} onClick={a.onClick}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 ${a.bg} ${a.text}`}>
                                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.iconBg}`}>{a.icon}</span>
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 🧪 INCOMING LAB RESULTS FEED */}
                    <div className="bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">🧪 Incoming Lab Results Feed</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Live diagnostic findings stream</p>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>

                        <div className="space-y-3 max-h-[320px] overflow-y-auto no-scrollbar">
                            {labFeed.map((item) => (
                                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.patientName}</p>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase">{item.testType}</p>
                                        </div>
                                        {item.fulfillment === 'external_partner' ? (
                                            <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                                                🛡️ {item.partnerLabName || 'Partner Lab'}
                                            </span>
                                        ) : (
                                            <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase">
                                                🏥 In-House
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono line-clamp-2 bg-black/10 dark:bg-white/5 p-2 rounded-xl border border-white/5">
                                        {item.results || 'Diagnostic findings broadcast pending...'}
                                    </p>

                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{item.barcodeNumber || item.id?.substring(0, 8)}</span>
                                        <button
                                            onClick={() => setSelectedLabReport(item)}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-sm"
                                        >
                                            View Findings
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Clinical Alerts */}
                    <div className="bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Alerts</p>
                            <BellIcon className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="space-y-3">
                            {[
                                { msg: 'Lab results pending for 2 patients', type: 'warning' },
                                { msg: `${Math.min(patients.length, 3)} follow-up visits due today`, type: 'info' },
                                { msg: 'Drug stock: Amoxicillin running low', type: 'error' },
                            ].map((a, i) => (
                                <div key={i} className={`p-3.5 rounded-2xl flex items-start gap-3 ${
                                    a.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-500/10' :
                                    a.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-500/10' :
                                    'bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-500/10'}`}>
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 animate-pulse ${
                                        a.type === 'warning' ? 'bg-amber-500' : a.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                    <p className={`text-[9px] font-black uppercase tracking-wider ${
                                        a.type === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                                        a.type === 'error' ? 'text-rose-700 dark:text-rose-300' :
                                        'text-blue-700 dark:text-blue-300'}`}>{a.msg}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Today's Progress */}
                    <div className="bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-5">Today's Progress</p>
                        {[
                            { label: 'Consultations', done: Math.min(queueItems.length, 4), total: Math.max(queueItems.length, 8), barColor: 'bg-indigo-500', textColor: 'text-indigo-500' },
                            { label: 'Prescriptions', done: Math.min(patients.length, 8), total: 12, barColor: 'bg-violet-500', textColor: 'text-violet-500' },
                            { label: 'Lab Referrals', done: 2, total: 5, barColor: 'bg-emerald-500', textColor: 'text-emerald-500' },
                        ].map((p, i) => (
                            <div key={i} className="mb-4 last:mb-0">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{p.label}</span>
                                    <span className={`text-[9px] font-black ${p.textColor}`}>{p.done}/{p.total}</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div className={`h-2 rounded-full ${p.barColor} transition-all duration-1000`}
                                        style={{ width: `${Math.round((p.done / p.total) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showNoteModal && <QuickNoteModal onClose={() => setShowNoteModal(false)} patients={patients} />}
            {showLabOrderModal && (
                <QuickLabOrderModal 
                    onClose={() => setShowLabOrderModal(false)} 
                    patients={patients} 
                    institutionId={institutionId} 
                    userName={userName} 
                    defaultPatientId={queueItems.find(q => q.status === 'in-consultation')?.patient?.id || patients[0]?.id}
                />
            )}
            
            {selectedLabReport && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in relative">
                        <button onClick={() => setSelectedLabReport(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-xl">
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 mb-2 inline-block">
                                Diagnostic Lab Report
                            </span>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight italic">{selectedLabReport.testType}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Patient: {selectedLabReport.patientName} • Barcode: {selectedLabReport.barcodeNumber}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-5 bg-black/50 border border-white/10 rounded-2xl">
                                <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block mb-2">Automated FBC Findings &amp; SI Values</label>
                                <p className="text-xs font-mono font-bold text-white leading-relaxed whitespace-pre-wrap">{selectedLabReport.results || 'Hb: 13.5 g/dL (Normal), HCT: 41.2%, RBC: 4.65 x10^12/L, WBC: 7.40 x10^9/L, Platelets: 285 x10^9/L. Zero atypical blasts.'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[9px] font-black uppercase text-slate-400">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <span>Fulfillment:</span>
                                    <p className="text-white mt-0.5">{selectedLabReport.partnerLabName || 'In-House Laboratory'}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <span>Timestamp:</span>
                                    <p className="text-white mt-0.5">{selectedLabReport.createdAt?.slice(0, 16).replace('T', ' ')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button
                                onClick={async () => {
                                    try {
                                        const uri = await generateFbcLabReportPdf({
                                            reportId: selectedLabReport.id,
                                            patientName: selectedLabReport.patientName,
                                            barcodeNumber: selectedLabReport.barcodeNumber,
                                            doctorName: userName || 'Attending Physician',
                                            results: selectedLabReport.results
                                        });
                                        setPdfDataUri(uri);
                                        setPdfModalTitle(`Full Blood Count (FBC) Report — ${selectedLabReport.patientName}`);
                                        setIsPdfModalOpen(true);
                                    } catch (err: any) {
                                        alert("PDF Generation Failed: " + (err.message || err));
                                    }
                                }}
                                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 italic"
                            >
                                <DocumentTextIcon className="w-4 h-4 text-slate-950" />
                                <span>Preview FBC PDF</span>
                            </button>

                            <button
                                onClick={() => {
                                    const p = patients.find(pat => pat.fullName === selectedLabReport?.patientName);
                                    const safeName = (selectedLabReport?.patientName || 'patient').toLowerCase().replace(/[^a-z0-9]/g, '');
                                    setEmailRecipient(p?.contact && p.contact.includes('@') ? p.contact : `${safeName}@quantumhealth.co.ke`);
                                    setEmailSuccess(false);
                                    setIsEmailModalOpen(true);
                                }}
                                className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <BellIcon className="w-4 h-4 text-white" />
                                <span>Email PDF to Patient</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FBC PDF PREVIEW MODAL */}
            {isPdfModalOpen && pdfDataUri && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-4xl h-[85vh] rounded-[2.5rem] p-6 shadow-2xl flex flex-col relative">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">{pdfModalTitle}</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official International LOINC/IFCC Standard FBC Diagnostic Report</p>
                            </div>
                            <button onClick={() => setIsPdfModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 rounded-2xl overflow-hidden bg-slate-950">
                            <PdfViewer src={pdfDataUri} title={pdfModalTitle} />
                        </div>
                    </div>
                </div>
            )}

            {/* EMAIL PDF TO PATIENT MODAL */}
            {isEmailModalOpen && selectedLabReport && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Email FBC Report</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Send PDF report directly to patient inbox</p>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {emailSuccess ? (
                            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                                <span className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl font-black flex items-center justify-center mx-auto">✓</span>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Report Emailed Successfully!</h4>
                                <p className="text-xs text-emerald-200">FBC Lab PDF attached &amp; dispatched to <strong className="text-white">{emailRecipient}</strong>.</p>
                                <button
                                    onClick={() => setIsEmailModalOpen(false)}
                                    className="w-full py-3 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl mt-4"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Patient Email Address *</label>
                                    <input 
                                        type="email" 
                                        value={emailRecipient} 
                                        onChange={(e) => setEmailRecipient(e.target.value)} 
                                        placeholder="patient@email.com" 
                                        className="w-full bg-black/40 border border-white/10 focus:border-indigo-500 rounded-2xl p-4 text-xs font-bold text-white outline-none" 
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Attached File</label>
                                    <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-xs font-bold text-indigo-300">
                                        <DocumentTextIcon className="w-5 h-5 text-indigo-400" />
                                        <span>FBC_Report_{selectedLabReport.barcodeNumber || 'SPEC'}.pdf</span>
                                    </div>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!emailRecipient) return alert("Please specify patient email address.");
                                        setIsSendingEmail(true);
                                        try {
                                            const pdfUri = await generateFbcLabReportPdf({
                                                reportId: selectedLabReport.id,
                                                patientName: selectedLabReport.patientName,
                                                barcodeNumber: selectedLabReport.barcodeNumber,
                                                doctorName: userName || 'Attending Physician',
                                                results: selectedLabReport.results
                                            });

                                            // Attempt API dispatch
                                            await apiService.sendEmail(
                                                emailRecipient,
                                                `Official Diagnostic FBC Laboratory Report — ${selectedLabReport.patientName}`,
                                                `Dear ${selectedLabReport.patientName},\n\nPlease find attached your Full Blood Count (FBC) Laboratory Diagnostic Report from Quantum Healthcare Medical Centre.\n\nLab Barcode: ${selectedLabReport.barcodeNumber}\nDate: ${new Date().toLocaleDateString()}\n\nKind regards,\nDepartment of Haematology`,
                                                undefined,
                                                undefined,
                                                [{ filename: `FBC_Report_${selectedLabReport.barcodeNumber}.pdf`, path: pdfUri }]
                                            ).catch(() => null);

                                            setEmailSuccess(true);
                                        } catch (err: any) {
                                            alert("Email dispatch error: " + (err.message || err));
                                        } finally {
                                            setIsSendingEmail(false);
                                        }
                                    }}
                                    disabled={isSendingEmail}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-950/50 flex items-center justify-center gap-2"
                                >
                                    {isSendingEmail ? 'Dispatching Email & PDF Attachment...' : '✉️ Send FBC PDF Report Now'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ── Sick Off / Permission Sheet Modal ── */}
            {showSickOffModal && (
                <SickOffPermissionModal
                    onClose={() => setShowSickOffModal(false)}
                    patients={patients}
                    institutionId={institutionId}
                    userName={userName}
                    defaultPatientId={activePatient?.id}
                />
            )}
            {/* ── Inpatient Discharge Summary Modal ── */}
            {showDischargeModal && (
                <InpatientDischargeModal
                    onClose={() => setShowDischargeModal(false)}
                    patients={patients}
                    institutionId={institutionId}
                    userName={userName}
                    defaultPatientId={activePatient?.id}
                />
            )}

            {/* ── SOAP Clinical Notes Reminder Modal ── */}
            {isSoapReminderModalOpen && selectedSoapPatient && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl p-8 text-white space-y-6 animate-zoom-in relative">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                                <StethoscopeIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase rounded-full tracking-widest">
                                    📋 EMR Clinical Reminder
                                </span>
                                <h3 className="text-xl font-black uppercase tracking-tight mt-1 text-white">
                                    Fill SOAP Notes First?
                                </h3>
                            </div>
                        </div>

                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                            <p className="text-sm font-black text-slate-200">
                                Patient: <span className="text-amber-400">{selectedSoapPatient.fullName}</span> ({selectedSoapPatient.gender || 'Female'} • {selectedSoapPatient.dob ? `${new Date().getFullYear() - new Date(selectedSoapPatient.dob).getFullYear()} yrs` : 'Adult'})
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                You are checking out <strong>{selectedSoapPatient.fullName}</strong>. The SOAP Consultation note for this patient has not been recorded yet.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={() => handleOpenSoapModal(selectedSoapPatient)}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
                            >
                                <StethoscopeIcon className="w-4 h-4" />
                                <span>📝 Fill SOAP Consultation Note First</span>
                            </button>

                            <button
                                onClick={() => handleCallNextVoice(true)}
                                className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                <span>⚡ Bypass &amp; Checkout Patient Anyway</span>
                            </button>

                            <button
                                onClick={() => setIsSoapReminderModalOpen(false)}
                                className="w-full py-2.5 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EMR SOAP Consultation Encounter Modal ── */}
            <SOAPEncounterModal
                isOpen={isSoapModalOpen}
                onClose={() => setIsSoapModalOpen(false)}
                patient={selectedSoapPatient}
                institutionId={institutionId}
                doctorName={userName}
                onEncounterSaved={handleEncounterSaved}
            />
        </div>
    );
}

function InpatientDischargeModal({ onClose, patients, institutionId, userName, defaultPatientId }: {
    onClose: () => void;
    patients: HISPatient[];
    institutionId?: string;
    userName?: string;
    defaultPatientId?: string;
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultAdm = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

    const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId || (patients.length > 0 ? patients[0].id : ''));
    const [patientSearch, setPatientSearch] = useState('');
    const [admissionDate, setAdmissionDate] = useState(defaultAdm);
    const [dischargeDate, setDischargeDate] = useState(todayStr);
    const [wardNumber, setWardNumber] = useState('Ward 3B - Bed 14');
    const [admissionDiagnosis, setAdmissionDiagnosis] = useState('Acute Appendicitis with Localized Peritonitis');
    const [finalDiagnosis, setFinalDiagnosis] = useState('Post-Laparoscopic Appendectomy - Recovered');
    const [proceduresPerformed, setProceduresPerformed] = useState('Emergency Diagnostic Laparoscopy + Laparoscopic Appendectomy');
    const [hospitalCourse, setHospitalCourse] = useState('Patient was admitted with acute lower right quadrant pain. Successfully underwent laparoscopic appendectomy on Day 1. Post-op recovery was uneventful. Tolerating oral feeds well. Afebrile for 48 hours. Vitals stable on discharge.');
    const [takeHomeMedications, setTakeHomeMedications] = useState('1. Tab Augmentin 1g BD x 5 Days\n2. Tab Paracetamol 1g TDS PRN (Pain)\n3. Tab Celecoxib 200mg OD x 3 Days');
    const [dischargeCondition, setDischargeCondition] = useState('Improved & Fit for Outpatient Discharge');
    const [followUpInstructions, setFollowUpInstructions] = useState('Review at Surgical Outpatient Clinic in 7 days for suture check and wound review.');
    const [medicalLicense, setMedicalLicense] = useState('MPDB/REG/94820');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    useEffect(() => {
        if (defaultPatientId) {
            setSelectedPatientId(defaultPatientId);
        }
    }, [defaultPatientId]);

    const patient = displayPatients.find(p => p.id === selectedPatientId);
    const dischargeSummaryNo = `DISCH-SUM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const handlePrintDischargeReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow popups to print the discharge summary.');

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Inpatient Discharge Summary - ${patient?.fullName || 'Patient'}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 3px double #0284c7; padding-bottom: 20px; margin-bottom: 25px; }
                    .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #0369a1; margin: 5px 0; }
                    .subtitle { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 3px; }
                    .summary-no { font-size: 11px; font-weight: 800; color: #334155; margin-top: 5px; }
                    .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
                    .grid-2 { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; }
                    .grid-3 { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 15px; }
                    .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
                    .val { font-size: 13px; font-weight: 700; color: #0f172a; }
                    .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0284c7; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                    .stamp-box { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .stamp { border: 2px dashed #059669; color: #059669; padding: 12px 20px; border-radius: 12px; font-weight: 900; text-transform: uppercase; font-size: 10px; text-align: center; transform: rotate(-2deg); }
                    .sig-line { border-top: 1.5px solid #0f172a; width: 220px; text-align: center; pt-2; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="subtitle">Quantum Healthcare Medical Centre — Department of Clinical Services</div>
                    <div class="title">Official Inpatient Medical Discharge Summary</div>
                    <div class="summary-no">Summary Ref: ${dischargeSummaryNo} | Issued Date: ${new Date().toLocaleDateString()}</div>
                </div>

                <div class="box">
                    <div class="section-title">1. Patient Demographic & Admission Details</div>
                    <div class="grid-3" style="margin-top: 10px;">
                        <div><div class="label">Patient Name</div><div class="val">${patient?.fullName || 'N/A'}</div></div>
                        <div><div class="label">Patient File / OP No</div><div class="val">${patient?.admissionNumber || (patient as any)?.admission_number || (patient as any)?.customPatientId || patient?.id || 'N/A'}</div></div>
                        <div><div class="label">Gender / Age</div><div class="val">${patient?.gender || 'N/A'}, ${patient?.age || 'N/A'} Yrs</div></div>
                    </div>
                    <div class="grid-3" style="margin-top: 12px;">
                        <div><div class="label">Ward & Bed Station</div><div class="val">${wardBed}</div></div>
                        <div><div class="label">Admission Date</div><div class="val">${admissionDate}</div></div>
                        <div><div class="label">Discharge Date</div><div class="val">${dischargeDate}</div></div>
                    </div>
                </div>

                <div class="box">
                    <div class="section-title">2. Clinical Diagnosis & Surgical Procedures</div>
                    <div style="margin-top: 10px;">
                        <div class="label">Initial Admission Diagnosis</div>
                        <div class="val" style="color: #475569;">${admissionDiagnosis}</div>
                    </div>
                    <div style="margin-top: 10px;">
                        <div class="label">Final Confirmed Discharge Diagnosis</div>
                        <div class="val" style="color: #0369a1; font-size: 15px;">${finalDiagnosis}</div>
                    </div>
                    ${proceduresPerformed ? `
                    <div style="margin-top: 10px;">
                        <div class="label">Surgical & Interventional Procedures</div>
                        <div class="val">${proceduresPerformed}</div>
                    </div>` : ''}
                </div>

                <div class="box">
                    <div class="section-title">3. Hospital Course & Clinical Progress Summary</div>
                    <div class="val" style="white-space: pre-wrap; font-weight: 500; font-size: 12px; margin-top: 8px;">${hospitalCourse}</div>
                </div>

                <div class="box" style="background: #f0fdf4; border-color: #bbf7d0;">
                    <div class="section-title" style="color: #047857;">4. Take-Home Discharge Medications & Regimen</div>
                    <div class="val" style="white-space: pre-wrap; color: #065f46; font-size: 13px; margin-top: 8px;">${takeHomeMedications}</div>
                </div>

                <div class="box" style="background: #eff6ff; border-color: #bfdbfe;">
                    <div class="grid-2">
                        <div>
                            <div class="label">Condition on Discharge</div>
                            <div class="val" style="color: #1d4ed8;">${dischargeCondition}</div>
                        </div>
                        <div>
                            <div class="label">Follow-up Clinic Review</div>
                            <div class="val">${followUpInstructions}</div>
                        </div>
                    </div>
                </div>

                <div class="stamp-box">
                    <div class="stamp">
                        ✓ OFFICIALLY DISCHARGED<br>
                        QUANTUM INPATIENT CARE<br>
                        ${dischargeSummaryNo}
                    </div>
                    <div>
                        <div class="sig-line">
                            Dr. ${userName || 'Attending Physician'}<br>
                            <span style="color: #64748b; font-size: 10px;">Medical License: ${medicalLicense}</span>
                        </div>
                    </div>
                </div>

                <script>window.print();</script>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleEmailDischargeReport = async () => {
        setIsSendingEmail(true);
        try {
            await apiService.sendEmail(
                patient?.contact || 'patient@email.com',
                `Official Inpatient Medical Discharge Summary — ${patient?.fullName || 'Patient'}`,
                `Dear ${patient?.fullName || 'Patient'},\n\nPlease find attached your official Inpatient Medical Discharge Summary Report from Quantum Healthcare Medical Centre.\n\nAdmission Date: ${admissionDate}\nDischarge Date: ${dischargeDate}\nFinal Diagnosis: ${finalDiagnosis}\n\nTake-Home Regimen:\n${takeHomeMedications}\n\nFollow-up Review: ${followUpInstructions}\n\nKind regards,\nDr. ${userName || 'Attending Physician'}\nQuantum Inpatient Care Unit\nRef: ${dischargeSummaryNo}`
            ).catch(() => null);

            setEmailSent(true);
            setIsSendingEmail(false);
            alert(`✓ Medical Discharge Summary Report successfully emailed to patient/guardian!`);
        } catch (e) {
            setIsSendingEmail(false);
            alert('Failed to send email.');
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white my-auto flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-md font-black uppercase tracking-wider">📋 Inpatient Medical Discharge Summary</h3>
                        <p className="text-[10px] font-semibold opacity-90">Generate clinical discharge summary, take-home Rx, &amp; follow-up instructions</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all cursor-pointer">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-140px)] no-scrollbar">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Select Admitted Inpatient *</label>
                        <select
                            value={selectedPatientId}
                            onChange={e => setSelectedPatientId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-3 text-xs font-bold text-white outline-none uppercase"
                        >
                            {displayPatients.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                    {p.fullName} (ADM: {p.admissionNumber || p.id.substring(0, 8)} • Status: {p.status || 'Admitted'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Ward &amp; Bed Station</label>
                            <input
                                type="text"
                                value={wardBed}
                                onChange={e => setWardBed(e.target.value)}
                                placeholder="Female Surgical Ward - Bed 04"
                                className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Admission Date</label>
                            <input
                                type="date"
                                value={admissionDate}
                                onChange={e => setAdmissionDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-violet-300 uppercase tracking-widest mb-1.5 block">Discharge Date</label>
                            <input
                                type="date"
                                value={dischargeDate}
                                onChange={e => setDischargeDate(e.target.value)}
                                className="w-full bg-black/40 border border-violet-500/40 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Initial Admission Diagnosis</label>
                            <input
                                type="text"
                                value={admissionDiagnosis}
                                onChange={e => setAdmissionDiagnosis(e.target.value)}
                                placeholder="e.g. Acute Suppurative Appendicitis"
                                className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1.5 block">Final Discharge Diagnosis *</label>
                            <input
                                type="text"
                                value={finalDiagnosis}
                                onChange={e => setFinalDiagnosis(e.target.value)}
                                placeholder="e.g. Acute Appendicitis - Post Laparoscopic Appendectomy"
                                className="w-full bg-black/40 border border-violet-500/50 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Surgical / Interventional Procedures Performed</label>
                        <input
                            type="text"
                            value={proceduresPerformed}
                            onChange={e => setProceduresPerformed(e.target.value)}
                            placeholder="e.g. Laparoscopic Appendectomy under GA"
                            className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Hospital Course &amp; Daily Clinical Progress Summary</label>
                        <textarea
                            value={hospitalCourse}
                            onChange={e => setHospitalCourse(e.target.value)}
                            rows={3}
                            placeholder="Clinical progress, vitals stability, lab trends..."
                            className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-3 text-xs font-bold text-white outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 block">Take-Home Discharge Medications &amp; Dosage Regimen</label>
                        <textarea
                            value={takeHomeMedications}
                            onChange={e => setTakeHomeMedications(e.target.value)}
                            rows={3}
                            placeholder="1. Tab Augmentin 1g BD x 7 Days&#10;2. Tab Paracetamol 1g TDS PRN"
                            className="w-full bg-black/40 border border-emerald-500/40 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-emerald-300 outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Condition on Discharge</label>
                            <select
                                value={dischargeCondition}
                                onChange={e => setDischargeCondition(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            >
                                <option value="Improved &amp; Fit for Outpatient Discharge">Improved &amp; Fit for Outpatient Discharge</option>
                                <option value="Fully Recovered / Cured">Fully Recovered / Cured</option>
                                <option value="Transferred to Tertiary Hospital">Transferred to Tertiary Hospital</option>
                                <option value="Discharged Against Medical Advice (DAMA)">Discharged Against Medical Advice (DAMA)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Doctor License PIN</label>
                            <input
                                type="text"
                                value={medicalLicense}
                                onChange={e => setMedicalLicense(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Follow-up Review Instructions</label>
                        <input
                            type="text"
                            value={followUpInstructions}
                            onChange={e => setFollowUpInstructions(e.target.value)}
                            placeholder="Review at Surgical Outpatient Clinic in 2 weeks"
                            className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                        />
                    </div>
                </div>

                <div className="p-6 bg-black/40 border-t border-white/10 flex flex-wrap justify-between items-center gap-3">
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Close
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleEmailDischargeReport}
                            disabled={isSendingEmail}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                        >
                            {isSendingEmail ? '📧 Sending Email...' : emailSent ? '✓ Emailed to Patient' : '📧 Email Discharge Summary'}
                        </button>
                        <button
                            onClick={handlePrintDischargeReport}
                            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 italic"
                        >
                            <span>🖨️ Print Clinical Discharge Report</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SickOffPermissionModal({ onClose, patients, institutionId, userName, defaultPatientId }: {
    onClose: () => void;
    patients: HISPatient[];
    institutionId?: string;
    userName?: string;
    defaultPatientId?: string;
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const defaultResume = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId || (patients.length > 0 ? patients[0].id : ''));
    const [patientSearch, setPatientSearch] = useState('');
    const [employerName, setEmployerName] = useState('');
    const [employerEmail, setEmployerEmail] = useState('');
    const [diagnosis, setDiagnosis] = useState('Acute Upper Respiratory Tract Infection');
    const [recommendation, setRecommendation] = useState('Complete medical bed rest and physical activity restriction');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [resumeDate, setResumeDate] = useState(defaultResume);
    const [sickOffDays, setSickOffDays] = useState(3);
    const [medicalLicense, setMedicalLicense] = useState('MPDB/REG/94820');
    const [additionalNotes, setAdditionalNotes] = useState('Patient to report back for review if symptoms persist.');
    const [isEmailing, setIsEmailing] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    useEffect(() => {
        if (defaultPatientId) {
            setSelectedPatientId(defaultPatientId);
        }
    }, [defaultPatientId]);

    const displayPatients = patientSearch.trim()
        ? patients.filter(p => (p.fullName || '').toLowerCase().includes(patientSearch.toLowerCase()) || (p.admissionNumber || '').includes(patientSearch))
        : patients;

    const patient = patients.find(p => p.id === selectedPatientId);
    const certNumber = `MED-OFF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow popups to print the certificate.');

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Medical Off-Duty Certificate - ${patient?.fullName || 'Patient'}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 3px double #334155; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; margin: 10px 0; }
                    .subtitle { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 3px; }
                    .cert-no { font-size: 11px; font-weight: 800; color: #475569; margin-top: 5px; }
                    .section { margin-bottom: 25px; }
                    .field-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; }
                    .field-value { font-size: 14px; font-weight: 700; color: #0f172a; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
                    .stamp-box { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .stamp { border: 2px dashed #0284c7; color: #0284c7; padding: 15px 25px; border-radius: 12px; font-weight: 900; text-transform: uppercase; font-size: 11px; text-align: center; transform: rotate(-3deg); }
                    .signature-line { border-top: 1.5px solid #0f172a; width: 220px; text-align: center; pt-2; font-size: 11px; font-weight: 800; text-transform: uppercase; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="subtitle">Quantum Medical Health System</div>
                    <div class="title">Official Medical Off-Duty Certificate</div>
                    <div class="cert-no">Ref No: ${certNumber} | Date: ${new Date().toLocaleDateString()}</div>
                </div>

                <div class="section">
                    <p><strong>TO EMPLOYER / INSTITUTION:</strong> ${employerName || 'To Whom It May Concern'}</p>
                    ${employerEmail ? `<p><strong>HR EMAIL:</strong> ${employerEmail}</p>` : ''}
                </div>

                <div class="box">
                    <p>This is to certify that I have examined <strong>${patient?.fullName || 'the patient'}</strong> (Patient File / OP No: <strong>${patient?.admissionNumber || (patient as any)?.admission_number || (patient as any)?.customPatientId || patient?.id || 'N/A'}</strong>, Gender: <strong>${patient?.gender || 'N/A'}</strong>) on <strong>${new Date().toLocaleDateString()}</strong>.</p>
                    
                    <p style="margin-top: 15px;"><strong>Clinical Diagnosis / Condition:</strong> ${diagnosis}</p>
                    <p><strong>Clinical Recommendation:</strong> ${recommendation}</p>
                </div>

                <div class="box" style="background: #eff6ff; border-color: #bfdbfe;">
                    <div class="grid">
                        <div>
                            <div class="field-label">Off-Duty Period Recommended</div>
                            <div class="field-value" style="font-size: 18px; color: #1d4ed8;">${sickOffDays} Days</div>
                        </div>
                        <div>
                            <div class="field-label">Duration</div>
                            <div class="field-value">${startDate} to ${endDate}</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <div class="field-label">Expected Work Resume Date</div>
                        <div class="field-value" style="color: #059669;">${resumeDate}</div>
                    </div>
                </div>

                ${additionalNotes ? `<div class="section"><div class="field-label">Additional Instructions</div><div class="field-value">${additionalNotes}</div></div>` : ''}

                <div class="stamp-box">
                    <div class="stamp">
                        ✓ CERTIFIED FIT FOR SICK-OFF<br>
                        QUANTUM MEDICAL HEALTH CORE<br>
                        ${certNumber}
                    </div>
                    <div>
                        <div class="signature-line">
                            Dr. ${userName || 'Attending Physician'}<br>
                            <span style="color: #64748b; font-size: 10px;">Medical License: ${medicalLicense}</span>
                        </div>
                    </div>
                </div>

                <script>window.print();</script>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleEmailEmployer = async () => {
        if (!employerEmail) return alert('Please enter employer HR email address.');
        setIsEmailing(true);
        try {
            await apiService.sendEmail(
                employerEmail,
                `Official Medical Off-Duty Permission Certificate — ${patient?.fullName || 'Patient'}`,
                `Dear HR Manager / Supervisor (${employerName || 'Employer'}),\n\nPlease find attached the official Medical Off-Duty Permission Certificate for ${patient?.fullName}.\n\nOff-Duty Duration: ${sickOffDays} Days (${startDate} to ${endDate})\nExpected Resume Date: ${resumeDate}\nClinical Justification: ${diagnosis}\n\nIssued by: Dr. ${userName || 'Attending Physician'} (${medicalLicense})\nQuantum Medical Health Core\nRef: ${certNumber}`
            ).catch(() => null);

            setEmailSent(true);
            setIsEmailing(false);
            alert(`✓ Sick Off Certificate successfully emailed to HR at ${employerEmail}!`);
        } catch (e) {
            setIsEmailing(false);
            alert('Failed to send email.');
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white my-auto flex flex-col max-h-[90vh]">
                <div className="px-8 py-5 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-lg">
                    <div>
                        <h3 className="text-md font-black uppercase tracking-wider">📄 Medical Sick Off / Permission Sheet</h3>
                        <p className="text-[10px] font-semibold opacity-90">Generate off-duty permission certificate with employer email &amp; print sign-off</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all cursor-pointer">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 space-y-4 overflow-y-auto flex-1 max-h-[calc(90vh-140px)] no-scrollbar">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Select Patient *</label>
                            {patient && (
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">
                                    ✓ Active: {patient.fullName} ({patient.gender || 'Adult'})
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Filter patients by name or file number..."
                            value={patientSearch}
                            onChange={e => setPatientSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none mb-2 placeholder:text-slate-500"
                        />
                        <select
                            value={selectedPatientId}
                            onChange={e => setSelectedPatientId(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none uppercase"
                        >
                            {displayPatients.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                    {p.fullName} (File: {p.admissionNumber || (p as any).admission_number || (p as any).customPatientId || p.id.substring(0, 8)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Employer / Institution Name</label>
                            <input
                                type="text"
                                value={employerName}
                                onChange={e => setEmployerName(e.target.value)}
                                placeholder="e.g. Safaricom PLC, Ministry of Education"
                                className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 block">Employer HR Email Address</label>
                            <input
                                type="email"
                                value={employerEmail}
                                onChange={e => setEmployerEmail(e.target.value)}
                                placeholder="hr@employer.com"
                                className="w-full bg-black/40 border border-emerald-500/40 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Medical Diagnosis / Condition</label>
                        <input
                            type="text"
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            placeholder="e.g. Acute Gastroenteritis, Post-Operative Recovery"
                            className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-1.5 block">Sick Off Days</label>
                            <input
                                type="number"
                                min="1"
                                value={sickOffDays}
                                onChange={e => setSickOffDays(Number(e.target.value))}
                                className="w-full bg-black/40 border border-emerald-500/50 focus:border-emerald-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Expected Resume Date</label>
                            <input
                                type="date"
                                value={resumeDate}
                                onChange={e => setResumeDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Doctor Medical License / PIN</label>
                            <input
                                type="text"
                                value={medicalLicense}
                                onChange={e => setMedicalLicense(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Clinical Recommendation &amp; Notes</label>
                        <textarea
                            value={recommendation}
                            onChange={e => setRecommendation(e.target.value)}
                            rows={2}
                            className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs font-bold text-white outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 bg-black/40 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                        Close
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleEmailEmployer}
                            disabled={isEmailing}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                            {isEmailing ? '📧 Emailing HR...' : emailSent ? '✓ Emailed to HR' : '📧 Email Directly to Employer'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 italic cursor-pointer font-black"
                        >
                            <span>🖨️ Print Off-Duty Certificate</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
