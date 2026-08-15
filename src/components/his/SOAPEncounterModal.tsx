import React, { useState, useEffect } from 'react';
import type { HISPatient } from '../../types';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { StethoscopeIcon } from '../icons/StethoscopeIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { HeartIcon, ActivityIcon, ClockIcon } from './HealthIcons';
import { apiService } from '../../services/apiService';
import { getConsultationFeeFromSettings } from '../../utils/hisFeeUtils';

interface SOAPEncounterModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: HISPatient | null;
    institutionId?: string;
    doctorName?: string;
    onAddPrescription?: (patientId: string) => void;
    onAddLabOrder?: (patientId: string) => void;
    onEncounterSaved?: () => void;
}

const TEMPLATES = [
    {
        id: 'soap_standard',
        name: '🩺 Standard SOAP Consultation',
        subjective: 'Patient reports 3-day history of fever, headache, and generalized body malaise.',
        objective: 'Vitals: Stable. Chest: Clear bilaterally. Abdomen: Soft, non-tender. ENT: Mild pharyngeal erythema.',
        assessment: 'Acute Upper Respiratory Tract Infection (URTI) / Viral Fever.',
        plan: '1. Oral hydration & rest.\n2. Paracetamol 500mg TDS for 5 days.\n3. Review if fever persists > 48 hours.'
    },
    {
        id: 'paediatric',
        name: '👶 Paediatric Illness & Growth Review',
        subjective: 'Mother presents child with poor appetite, low-grade fever, and mild rhinorrhea for 2 days. Milestones up to date.',
        objective: 'Alert, responsive child. Temp 37.8°C, Weight: 14kg. No respiratory distress. Throat mildly congested.',
        assessment: 'Mild Paediatric Viral Syndrome.',
        plan: '1. Antipyretic syrup (Paracetamol 5ml 6-hourly PRN).\n2. Warm fluids & light diet.\n3. Return if lethargic or difficulty breathing.'
    },
    {
        id: 'maternity_anc',
        name: '🤰 Antenatal Care (ANC) Review',
        subjective: 'Routine ANC visit at 28 weeks gestation. Reports good fetal movement. No bleeding or fluid leakage.',
        objective: 'BP 115/75 mmHg. Fundal height 28cm. Fetal Heart Rate (FHR) 144 bpm, regular. Urinalysis: Protein Nil, Glucose Nil.',
        assessment: 'Single Intrauterine Pregnancy at 28 weeks (Normal ANC progress).',
        plan: '1. Routine Iron & Folic Acid supplementation.\n2. Tetanus Toxoid (TT2) administered.\n3. Next review in 4 weeks (32 weeks gestation).'
    },
    {
        id: 'eye_vision',
        name: '👁️ Ocular / Vision Assessment',
        subjective: 'Complains of bilateral eye strain and blurry vision while reading for past 2 weeks.',
        objective: 'Visual Acuity: OD 6/9 (uncorrected), OS 6/9 (uncorrected). Fundoscopy: Normal disc & macula. IOP: Normal.',
        assessment: 'Mild Refractive Error / Presbyopia.',
        plan: '1. Refraction testing for reading spectacles.\n2. Lubricating eye drops BD.\n3. Screen time ergonomics guidance.'
    },
    {
        id: 'dental_assessment',
        name: '🦷 Dental & Oral Examination',
        subjective: 'Toothache on upper right molar (Tooth #16) aggravated by cold drinks.',
        objective: 'Carious lesion observed on Tooth #16 occlusal surface. No gingival swelling or sinus tract.',
        assessment: 'Dental Caries (Tooth #16) - Irreversible Pulpitis suspect.',
        plan: '1. Dental X-ray (Periapical view).\n2. Analgesic coverage.\n3. Schedule for Composite Restoration / Root Canal Treatment.'
    }
];

export function SOAPEncounterModal({
    isOpen,
    onClose,
    patient,
    institutionId,
    doctorName,
    onAddPrescription,
    onAddLabOrder,
    onEncounterSaved
}: SOAPEncounterModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState('soap_standard');
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [vitals, setVitals] = useState({
        bp: '120/80',
        pulse: '72',
        temp: '36.6',
        spo2: '98',
        weight: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (patient) {
            const tmpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];
            setSubjective(tmpl.subjective);
            setObjective(tmpl.objective);
            setAssessment(tmpl.assessment);
            setPlan(tmpl.plan);
        }
    }, [selectedTemplate, patient]);

    if (!isOpen || !patient) return null;

    const handleApplyTemplate = (tmplId: string) => {
        setSelectedTemplate(tmplId);
        const tmpl = TEMPLATES.find(t => t.id === tmplId);
        if (tmpl) {
            setSubjective(tmpl.subjective);
            setObjective(tmpl.objective);
            setAssessment(tmpl.assessment);
            setPlan(tmpl.plan);
        }
    };

    const handleSaveEncounter = async () => {
        if (!subjective.trim() && !assessment.trim()) {
            alert('Please fill in clinical findings or assessment before saving.');
            return;
        }

        setIsSaving(true);
        try {
            const encId = `enc_${Date.now()}`;
            const fullNotes = `[SUBJECTIVE]\n${subjective}\n\n[OBJECTIVE]\n${objective}\nVitals: BP ${vitals.bp} | Pulse ${vitals.pulse} bpm | Temp ${vitals.temp}°C | SpO2 ${vitals.spo2}% | Wt ${vitals.weight || 'N/A'}kg\n\n[ASSESSMENT / DIAGNOSIS]\n${assessment}\n\n[PLAN / MANAGEMENT]\n${plan}`;

            // Save clinical event timeline
            await apiService.saveModuleRecord('his_clinical_events', {
                id: `evt_${encId}`,
                institutionId,
                patientId: patient.id,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                event: `Clinical Encounter: ${assessment.substring(0, 45)}...`,
                dept: 'Outpatient Clinic',
                provider: doctorName || 'Dr. Attending Physician',
                notes: fullNotes,
                createdAt: new Date().toISOString()
            });

            // Save consolidated master invoice with Consultation Fee included
            const isInsured = !!(patient.insuranceProvider || (patient as any).shaNumber || (patient as any).insurance_provider);
            const insProvider = patient.insuranceProvider || (patient as any).insurance_provider || (isInsured ? 'SHA (Social Health Authority)' : undefined);
            const policyNo = (patient as any).shaNumber || (patient as any).policyNumber || (isInsured ? 'SHA-8849-K' : undefined);

            const consolidatedItems = [
                { itemName: 'General Practitioner Consultation Fee', category: 'Consultation', quantity: 1, unitPrice: 2000, total: 2000 },
                { itemName: 'Diagnostic Lab Screening', category: 'Diagnostics', quantity: 1, unitPrice: 2500, total: 2500 },
                { itemName: 'Prescription Medications & Dispensing', category: 'Pharmacy', quantity: 1, unitPrice: 1500, total: 1500 }
            ];

            const totalInvoiceAmount = consolidatedItems.reduce((s, it) => s + it.total, 0); // Total KES 6,000
            const copay = isInsured ? 500 : totalInvoiceAmount;
            const insCover = isInsured ? Math.max(0, totalInvoiceAmount - copay) : 0;
            const payerTypeVal = isInsured ? 'Split (Co-Pay + Insurance)' : 'Self-Pay';
            const invNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

            await apiService.saveModuleRecord('his_invoices', {
                id: `inv_soap_${patient.id}`,
                institutionId,
                institution_id: institutionId,
                invoiceNumber: invNo,
                invoice_number: invNo,
                patientId: patient.id,
                patient_id: patient.id,
                patientName: patient.fullName,
                patient_name: patient.fullName,
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
            }).catch(() => null);

            alert(`✓ EMR Consultation Encounter saved for ${patient.fullName}!`);
            if (onEncounterSaved) onEncounterSaved();
            onClose();
        } catch (err: any) {
            console.error('Save encounter error:', err);
            alert(`Failed to save consultation: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh] animate-zoom-in">
                {/* Top Banner */}
                <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                            <StethoscopeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h3 className="text-xl font-black uppercase tracking-tight text-white">{patient.fullName}</h3>
                                <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase rounded-full">
                                    {patient.gender} • {patient.age ? `${patient.age} yrs` : 'Adult'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-bold mt-0.5">
                                File ID: <span className="text-slate-200">{patient.admissionNumber || patient.patientNumber || patient.id}</span>
                                {patient.bloodGroup && ` • Blood Group: ${patient.bloodGroup}`}
                                {patient.insuranceProvider && ` • ${patient.insuranceProvider}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Medical Safety Alerts Bar */}
                {((patient.allergies && patient.allergies.length > 0) || (patient.chronicConditions && patient.chronicConditions.length > 0)) && (
                    <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between shrink-0">
                        <div className="flex items-center space-x-4 text-xs font-black text-rose-300">
                            {patient.allergies && patient.allergies.length > 0 && (
                                <span className="flex items-center space-x-1">
                                    <span>⚠️ ALLERGIES:</span>
                                    <span className="text-white font-bold">{patient.allergies.join(', ')}</span>
                                </span>
                            )}
                            {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                                <span className="flex items-center space-x-1">
                                    <span>🏥 CHRONIC:</span>
                                    <span className="text-white font-bold">{patient.chronicConditions.join(', ')}</span>
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-600/40">
                            Clinical Safety Warning
                        </span>
                    </div>
                )}

                {/* Main Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Template Selector & Quick Vitals */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Clinical Template Preset</label>
                            <select
                                value={selectedTemplate}
                                onChange={e => handleApplyTemplate(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500 uppercase"
                            >
                                {TEMPLATES.map(t => (
                                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Encounter Orders</label>
                            <div className="flex space-x-2">
                                {onAddPrescription && (
                                    <button
                                        type="button"
                                        onClick={() => onAddPrescription(patient.id)}
                                        className="flex-1 py-3 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        💊 Rx Order
                                    </button>
                                )}
                                {onAddLabOrder && (
                                    <button
                                        type="button"
                                        onClick={() => onAddLabOrder(patient.id)}
                                        className="flex-1 py-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        🧪 Lab Order
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vitals Quick Entry Row */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1">
                            <ActivityIcon className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Encounter Vitals</span>
                        </p>
                        <div className="grid grid-cols-5 gap-3">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">BP (mmHg)</label>
                                <input
                                    type="text" value={vitals.bp} onChange={e => setVitals({ ...vitals, bp: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Pulse (bpm)</label>
                                <input
                                    type="text" value={vitals.pulse} onChange={e => setVitals({ ...vitals, pulse: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Temp (°C)</label>
                                <input
                                    type="text" value={vitals.temp} onChange={e => setVitals({ ...vitals, temp: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">SpO2 (%)</label>
                                <input
                                    type="text" value={vitals.spo2} onChange={e => setVitals({ ...vitals, spo2: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Weight (kg)</label>
                                <input
                                    type="text" placeholder="65" value={vitals.weight} onChange={e => setVitals({ ...vitals, weight: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SOAP Four Quadrants */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Subjective */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-1">
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                <span>Subjective (Chief Complaints &amp; History)</span>
                            </label>
                            <textarea
                                rows={4}
                                value={subjective}
                                onChange={e => setSubjective(e.target.value)}
                                placeholder="Patient reports..."
                                className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-2xl p-4 text-xs font-medium text-slate-200 outline-none resize-none leading-relaxed"
                            />
                        </div>

                        {/* Objective */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center space-x-1">
                                <StethoscopeIcon className="w-3.5 h-3.5" />
                                <span>Objective (Physical Exam &amp; Systemic Findings)</span>
                            </label>
                            <textarea
                                rows={4}
                                value={objective}
                                onChange={e => setObjective(e.target.value)}
                                placeholder="Physical findings..."
                                className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-2xl p-4 text-xs font-medium text-slate-200 outline-none resize-none leading-relaxed"
                            />
                        </div>

                        {/* Assessment */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center space-x-1">
                                <SparklesIcon className="w-3.5 h-3.5" />
                                <span>Assessment &amp; Diagnosis (ICD-10)</span>
                            </label>
                            <textarea
                                rows={4}
                                value={assessment}
                                onChange={e => setAssessment(e.target.value)}
                                placeholder="Clinical diagnosis..."
                                className="w-full bg-black/40 border border-white/10 focus:border-amber-500 rounded-2xl p-4 text-xs font-bold text-amber-200 outline-none resize-none leading-relaxed"
                            />
                        </div>

                        {/* Plan */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center space-x-1">
                                <BeakerIcon className="w-3.5 h-3.5" />
                                <span>Plan &amp; Treatment Management</span>
                            </label>
                            <textarea
                                rows={4}
                                value={plan}
                                onChange={e => setPlan(e.target.value)}
                                placeholder="Treatment plan, advice..."
                                className="w-full bg-black/40 border border-white/10 focus:border-purple-500 rounded-2xl p-4 text-xs font-medium text-slate-200 outline-none resize-none leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-slate-950 flex justify-between items-center shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Attending Doctor: <span className="text-white font-black">{doctorName || 'Dr. Attending Physician'}</span>
                    </p>
                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-3 border border-white/10 rounded-2xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveEncounter}
                            disabled={isSaving}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-950/50 transition-all flex items-center space-x-2"
                        >
                            {isSaving ? (
                                <span>Saving EMR Notes...</span>
                            ) : (
                                <>
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>Save &amp; Commit Encounter</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
