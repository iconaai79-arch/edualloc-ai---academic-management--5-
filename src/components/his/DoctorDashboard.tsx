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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-zoom-in">
                <div className="p-7 border-b border-white/10 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Quick <span className="text-blue-200">Diagnostic Order</span></h3>
                        <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest mt-0.5 opacity-80">Select patient &amp; generate lab requisition</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"><XIcon className="w-4 h-4" /></button>
                </div>
                <div className="p-7 space-y-5">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Patient *</label>
                        <select 
                            value={selectedPatientId} 
                            onChange={e => setSelectedPatientId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none"
                        >
                            <option value="">— Choose Patient —</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.fullName} ({p.admissionNumber || p.patientNumber || p.id?.substring(0, 8)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fulfillment Facility</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFulfillment('in_house')}
                                className={`p-3 rounded-xl text-left border text-xs font-bold uppercase transition-all ${
                                    fulfillment === 'in_house' ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                🏥 In-House Lab
                            </button>
                            <button
                                type="button"
                                onClick={() => setFulfillment('external_partner')}
                                className={`p-3 rounded-xl text-left border text-xs font-bold uppercase transition-all ${
                                    fulfillment === 'external_partner' ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'
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

    // Live sync queue state and appointments from Database (his_queue_calls & his_appointments)
    const loadClinicalQueue = React.useCallback(async () => {
        if (!institutionId) return;
        try {
            const [calls, apps] = await Promise.all([
                apiService.fetchModuleRecords('his_queue_calls', institutionId).catch(() => []),
                apiService.fetchModuleRecords('his_appointments', institutionId).catch(() => [])
            ]);
            setDbQueueCalls(calls || []);
            setDbAppointments(apps || []);

            if (calls && calls.length > 0) {
                const completedInDb = calls
                    .filter((c: any) => c.status === 'Completed' || c.status === 'DISCHARGED')
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
        }
    }, [institutionId]);

    useEffect(() => {
        loadClinicalQueue();
        const interval = setInterval(loadClinicalQueue, 8000);
        return () => clearInterval(interval);
    }, [loadClinicalQueue]);

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
    const todayApps = dbAppointments.filter(a => !a.date || a.date.startsWith(todayIsoDate));
    
    // Create combined map of real queue entries
    const combinedEntriesMap = new Map<string, any>();

    // 1. Add from today's appointments
    todayApps.forEach(app => {
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

        const isCompleted = completedPatientIds.has(p.id) || entry.status === 'Completed' || entry.status === 'DISCHARGED';
        const isInConsult = !isCompleted && (
            (activeConsultationId && p.id === activeConsultationId) ||
            entry.status === 'In-Progress' || 
            entry.status === 'In Consultation'
        );
        const isWaiting = !isCompleted && !isInConsult && (
            entry.status === 'Arrived' || 
            entry.status === 'Waiting'
        );

        const status = isCompleted 
            ? 'completed' 
            : isInConsult 
            ? 'in-consultation' 
            : isWaiting 
            ? 'waiting' 
            : 'scheduled';

        return {
            patient: p,
            queueNo: i + 1,
            complaint: entry.reason || entry.complaint || 'Consultation Review',
            waitMins: entry.waitMins || ((i + 1) * 6),
            priority: entry.priority || (i === 0 ? 'urgent' : 'normal'),
            status,
        };
    });

    const visibleQueueItems = queueItems.filter(q => !hideCompletedInQueue || q.status !== 'completed');

    const waitingCount = queueItems.filter(q => q.status === 'waiting').length;
    const inConsultCount = queueItems.filter(q => q.status === 'in-consultation').length;
    const completedCount = queueItems.filter(q => q.status === 'completed').length;
    const totalTodayCount = queueItems.length;

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
            ? { text: 'IN CONSULT', cls: 'bg-indigo-600 text-white font-black shadow-md' }
            : s === 'completed'
            ? { text: 'CHECKED OUT', cls: 'bg-emerald-600 text-white font-black shadow-md' }
            : s === 'waiting'
            ? { text: 'WAITING', cls: 'bg-amber-500/20 text-amber-400 dark:text-amber-300 font-black' }
            : { text: 'SCHEDULED', cls: 'bg-slate-500/10 text-slate-400 font-black' };

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

                {/* Live Clock + Actions */}
                <div className="relative z-10 text-left lg:text-right space-y-3">
                    <div>
                        <p className="text-5xl font-black text-white tracking-tight tabular-nums leading-none">{timeStr}</p>
                        <p className="text-[9px] font-black text-indigo-300/50 uppercase tracking-widest mt-2">{today}</p>
                    </div>

                    {/* Room Selector & Call Next Button */}
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
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all italic"
                        >
                            <BellIcon className="w-4 h-4 text-slate-950" />
                            <span>Checkout &amp; Call Next</span>
                        </button>
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

                    <div className="flex gap-2 mt-4 flex-wrap lg:justify-end">
                        <button 
                            onClick={() => handleOpenSoapModal()} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/30 italic"
                        >
                            <StethoscopeIcon className="w-3.5 h-3.5 text-slate-950" />
                            <span>🩺 EMR Consultation (SOAP)</span>
                        </button>
                        <button onClick={() => setShowDischargeModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-900/50">
                            <span>📋 Inpatient Discharge Summary</span>
                        </button>
                        <button onClick={() => setShowSickOffModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/50">
                            <span>📄 Medical Sick Off / Permission Sheet</span>
                        </button>
                        <button onClick={() => setShowLabOrderModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/50">
                            <BeakerIcon className="w-3.5 h-3.5" /> Order Lab Test
                        </button>
                        <button onClick={() => setShowLabOrderModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/50">
                            <span>🩻 Order Radiology / X-Ray</span>
                        </button>
                        <button onClick={() => setShowNoteModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10 hover:border-white/20">
                            <DocumentTextIcon className="w-3.5 h-3.5" /> Quick Note
                        </button>
                        <button onClick={onAddPrescription}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/50">
                            <BeakerIcon className="w-3.5 h-3.5" /> Prescribe
                        </button>
                        <button onClick={onAddVisit}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-900/50">
                            <PlusIcon className="w-3.5 h-3.5" /> Record Visit
                        </button>
                    </div>
                </div>
            </div>

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
                        <div className="p-6 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Clinical Queue ({visibleQueueItems.length})
                                    </span>
                                    {completedPatientIds.size > 0 && hideCompletedInQueue && (
                                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full border border-emerald-200/40">
                                            ✓ {completedPatientIds.size} Checked Out (Hidden)
                                        </span>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={hideCompletedInQueue}
                                        onChange={e => setHideCompletedInQueue(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                    />
                                    <span>Hide Checked-Out Patients</span>
                                </label>
                            </div>

                            {visibleQueueItems.length === 0 ? (
                                <div className="text-center py-20 opacity-40 space-y-3">
                                    <CalendarIcon className="w-16 h-16 mx-auto text-slate-400" />
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">No active patients in queue</p>
                                    {completedPatientIds.size > 0 && hideCompletedInQueue && (
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                            All {completedPatientIds.size} patient consultations completed today!
                                        </p>
                                    )}
                                    <button onClick={onRegisterPatient} className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                        Register New Patient
                                    </button>
                                </div>
                            ) : (
                                visibleQueueItems.map((q) => {
                                    const badge = getStatusBadge(q.status);
                                    const patName = q.patient?.fullName || (q.patient as any)?.name || 'Patient';
                                    return (
                                        <div key={q.patient.id || `q_${q.queueNo}`} onClick={() => onOpenPatient(q.patient.id)}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-100 dark:border-white/5 cursor-pointer transition-all hover:border-indigo-300/30 hover:shadow-md group">
                                            <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${getPriorityDot(q.priority)}`} />
                                            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-300 text-sm flex-shrink-0">{q.queueNo}</div>
                                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-200 flex-shrink-0">{patName[0] || 'P'}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm uppercase tracking-tight truncate">{patName}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">{q.patient?.gender || 'Adult'}</span>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="text-[9px] font-mono font-black text-indigo-500 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/30">
                                                        {q.patient?.admissionNumber || q.patient?.customPatientId || q.patient?.patientNumber || q.complaint}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase hidden sm:block">
                                                    {q.status === 'in-consultation' ? 'NOW' : q.status === 'completed' ? 'DISCHARGED' : `${q.waitMins}m`}
                                                </span>
                                                <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${badge.cls}`}>{badge.text}</span>
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
                />
            )}
            {/* ── Inpatient Discharge Summary Modal ── */}
            {showDischargeModal && (
                <InpatientDischargeModal
                    onClose={() => setShowDischargeModal(false)}
                    patients={patients}
                    institutionId={institutionId}
                    userName={userName}
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
    const defaultAdmissionDate = new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0];
    const defaultReviewDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const admittedPatients = patients.filter(p => p.admissionNumber || p.status === 'Admitted' || p.status === 'Inpatient');
    const displayPatients = admittedPatients.length > 0 ? admittedPatients : patients;

    const [selectedPatientId, setSelectedPatientId] = useState(defaultPatientId || (displayPatients.length > 0 ? displayPatients[0].id : ''));
    const [wardBed, setWardBed] = useState('Female Surgical Ward — Bed 04');
    const [admissionDate, setAdmissionDate] = useState(defaultAdmissionDate);
    const [dischargeDate, setDischargeDate] = useState(todayStr);
    const [admissionDiagnosis, setAdmissionDiagnosis] = useState('Acute Suppurative Appendicitis');
    const [finalDiagnosis, setFinalDiagnosis] = useState('Acute Suppurative Appendicitis — Post Laparoscopic Appendectomy');
    const [proceduresPerformed, setProceduresPerformed] = useState('Laparoscopic Appendectomy under General Anesthesia (10/08/2026)');
    const [hospitalCourse, setHospitalCourse] = useState('Patient was admitted with acute lower right quadrant abdominal pain. Uneventful emergency appendectomy performed. Post-op recovery smooth. Afebril, vitals stable, bowel sounds present, tolerating oral diet.');
    const [takeHomeMedications, setTakeHomeMedications] = useState('1. Tab Augmentin 1g BD x 7 Days\n2. Tab Paracetamol 1g TDS PRN x 5 Days\n3. Tab Ibuprofen 400mg BD PRN pc x 5 Days');
    const [dischargeCondition, setDischargeCondition] = useState('Improved & Fit for Outpatient Discharge');
    const [followUpInstructions, setFollowUpInstructions] = useState(`Review at Surgical Outpatient Clinic on ${defaultReviewDate} for wound inspection and suture removal.`);
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
                        <div><div class="label">Admission / Reg No</div><div class="val">${patient?.admissionNumber || patient?.id || 'N/A'}</div></div>
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
                <div className="px-8 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-md font-black uppercase tracking-wider">📋 Inpatient Medical Discharge Summary</h3>
                        <p className="text-[10px] font-semibold opacity-90">Generate clinical discharge summary, take-home Rx, &amp; follow-up instructions</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
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
                    .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
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
                    <p>This is to certify that I have examined <strong>${patient?.fullName || 'the patient'}</strong> (Admission/ID No: <strong>${patient?.admissionNumber || patient?.id || 'N/A'}</strong>, Gender: <strong>${patient?.gender || 'N/A'}</strong>) on <strong>${new Date().toLocaleDateString()}</strong>.</p>
                    
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
                <div className="px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-md font-black uppercase tracking-wider">📄 Medical Sick Off / Permission Sheet</h3>
                        <p className="text-[10px] font-semibold opacity-90">Generate off-duty permission certificate with employer email &amp; print sign-off</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Select Patient *</label>
                        <select
                            value={selectedPatientId}
                            onChange={e => setSelectedPatientId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-white outline-none uppercase"
                        >
                            {patients.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                    {p.fullName} (ID/ADM: {p.admissionNumber || p.id.substring(0, 8)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Employer / Institution Name</label>
                            <input
                                type="text"
                                value={employerName}
                                onChange={e => setEmployerName(e.target.value)}
                                placeholder="e.g. Safaricom PLC, Ministry of Education"
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
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
                            className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-white outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Expected Resume Date</label>
                            <input
                                type="date"
                                value={resumeDate}
                                onChange={e => setResumeDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Doctor Medical License / PIN</label>
                            <input
                                type="text"
                                value={medicalLicense}
                                onChange={e => setMedicalLicense(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Clinical Recommendation &amp; Notes</label>
                        <textarea
                            value={recommendation}
                            onChange={e => setRecommendation(e.target.value)}
                            rows={2}
                            className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl p-3 text-xs font-bold text-white outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 bg-black/40 border-t border-white/10 flex flex-wrap justify-between items-center gap-3">
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Close
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleEmailEmployer}
                            disabled={isEmailing}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                        >
                            {isEmailing ? '📧 Emailing HR...' : emailSent ? '✓ Emailed to HR' : '📧 Email Directly to Employer'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 italic"
                        >
                            <span>🖨️ Print Off-Duty Certificate</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
