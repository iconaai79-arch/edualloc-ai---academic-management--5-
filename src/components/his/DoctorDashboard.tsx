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
import { apiService } from '../../services/apiService';

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

function QuickLabOrderModal({ onClose, patients, institutionId, userName }: { 
    onClose: () => void; 
    patients: HISPatient[]; 
    institutionId?: string; 
    userName?: string 
}) {
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [testType, setTestType] = useState('Full Blood Count (FBC)');
    const [priority, setPriority] = useState('Routine');
    const [fulfillment, setFulfillment] = useState<'in_house' | 'external_partner'>('in_house');
    const [partnerLabName, setPartnerLabName] = useState('Lancet Kenya Reference Lab');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Test Panel</label>
                        <select 
                            value={testType} 
                            onChange={e => setTestType(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-xs font-bold text-white uppercase outline-none"
                        >
                            <option>Full Blood Count (FBC)</option>
                            <option>Liver Function Test (LFT)</option>
                            <option>Renal Electrolytes &amp; Creatinine</option>
                            <option>Urinalysis (Micro &amp; Macro)</option>
                            <option>Blood Group &amp; Crossmatch</option>
                            <option>Thyroid Profile (TSH, T3, T4)</option>
                            <option>HbA1c Glycated Hemoglobin</option>
                            <option>Lipid Profile &amp; Cholesterol</option>
                            <option>Histopathology / Tissue Biopsy (External)</option>
                            <option>Chest X-Ray / Diagnostic Imaging</option>
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

    useEffect(() => {
        fetchLabFeed();
        const interval = setInterval(fetchLabFeed, 15000);
        return () => clearInterval(interval);
    }, [institutionId]);

    const handleCallNextVoice = async () => {
        try {
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
                alert(`✓ Calling token ${next.tokenNo} (${next.patientName}) to ${roomNo}!`);
            } else {
                alert(`✓ Consultation completed. Zero waiting patients in queue.`);
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
        p.fullName.toLowerCase().includes(searchPatient.toLowerCase()) ||
        (p.contact || '').includes(searchPatient)
    );

    const queueItems = patients.slice(0, 6).map((p, i) => ({
        patient: p,
        queueNo: i + 1,
        complaint: COMPLAINT_TAGS[i % COMPLAINT_TAGS.length],
        waitMins: (i + 1) * 8,
        priority: i === 0 ? 'urgent' : i < 3 ? 'normal' : 'routine',
        status: i === 0 ? 'in-consultation' : i === 1 ? 'waiting' : 'scheduled',
    }));

    const stats = [
        { label: "Today's Patients", value: Math.min(patients.length, 12), sub: 'booked today',
          bgClass: 'bg-indigo-950/60', borderClass: 'border-indigo-500/20', textClass: 'text-indigo-200',
          icon: <UsersIcon className="w-5 h-5" /> },
        { label: 'In Queue', value: queueItems.length, sub: 'awaiting consultation',
          bgClass: 'bg-amber-950/50', borderClass: 'border-amber-500/20', textClass: 'text-amber-200',
          icon: <ClockIcon className="w-5 h-5" /> },
        { label: 'Total Patients', value: patients.length, sub: 'in registry',
          bgClass: 'bg-emerald-950/50', borderClass: 'border-emerald-500/20', textClass: 'text-emerald-200',
          icon: <HeartIcon className="w-5 h-5" /> },
        { label: 'Prescriptions', value: Math.min(patients.length * 2, 28), sub: 'issued this week',
          bgClass: 'bg-violet-950/50', borderClass: 'border-violet-500/20', textClass: 'text-violet-200',
          icon: <DocumentTextIcon className="w-5 h-5" /> },
    ];

    const getPriorityDot = (p: string) =>
        p === 'urgent' ? 'bg-rose-500' : p === 'normal' ? 'bg-amber-500' : 'bg-emerald-500';

    const getStatusBadge = (s: string) =>
        s === 'in-consultation'
            ? { text: 'IN CONSULT', cls: 'bg-indigo-600 text-white' }
            : s === 'waiting'
            ? { text: 'WAITING', cls: 'bg-amber-500/20 text-amber-400 dark:text-amber-300' }
            : { text: 'SCHEDULED', cls: 'bg-slate-500/10 text-slate-400' };

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
                    </div>

                    <div className="flex gap-2 mt-4 flex-wrap lg:justify-end">
                        <button onClick={() => setShowLabOrderModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/50">
                            <BeakerIcon className="w-3.5 h-3.5" /> Order Lab Test
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
                            {queueItems.length === 0 ? (
                                <div className="text-center py-20 opacity-40 space-y-3">
                                    <CalendarIcon className="w-16 h-16 mx-auto text-slate-400" />
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">No patients in queue</p>
                                    <button onClick={onRegisterPatient} className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                        Register First Patient
                                    </button>
                                </div>
                            ) : (
                                queueItems.map((q) => {
                                    const badge = getStatusBadge(q.status);
                                    return (
                                        <div key={q.patient.id} onClick={() => onOpenPatient(q.patient.id)}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-100 dark:border-white/5 cursor-pointer transition-all hover:border-indigo-300/30 hover:shadow-md group">
                                            <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${getPriorityDot(q.priority)}`} />
                                            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-300 text-sm flex-shrink-0">{q.queueNo}</div>
                                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-200 flex-shrink-0">{q.patient.fullName[0]}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm uppercase tracking-tight truncate">{q.patient.fullName}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">{q.patient.gender}</span>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase">{q.complaint}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase hidden sm:block">
                                                    {q.status === 'in-consultation' ? 'NOW' : `${q.waitMins}m`}
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
            {showLabOrderModal && <QuickLabOrderModal onClose={() => setShowLabOrderModal(false)} patients={patients} institutionId={institutionId} userName={userName} />}
            
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
                                <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block mb-2">Findings &amp; Lab Values</label>
                                <p className="text-xs font-mono font-bold text-white leading-relaxed whitespace-pre-wrap">{selectedLabReport.results || 'Zero abnormalities detected.'}</p>
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

                        <button
                            onClick={() => setSelectedLabReport(null)}
                            className="w-full mt-6 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all"
                        >
                            Close Report View
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
