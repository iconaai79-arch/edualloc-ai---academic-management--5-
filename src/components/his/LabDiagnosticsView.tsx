import React, { useState, useEffect } from 'react';
import { BeakerIcon } from '../icons/BeakerIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { PdfViewer } from '../PdfViewer';
import { apiService } from '../../services/apiService';
import { generateExternalLabRequisitionPdf } from '../../services/pdfService';

interface LabDiagnosticsViewProps {
    institutionId?: string;
    activeRole?: string;
    userName?: string;
    activePatientId?: string | null;
    institutionData?: any;
}

function XIcon(props: any) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

// ── Default Kenyan & East Africa Partnered Reference Laboratories ─────────────
const DEFAULT_PARTNER_LABS = [
    { id: 'partner_1', name: 'Lancet Kenya Reference Lab', code: 'PARTNER-LANCET', phone: '0703061000', email: 'dispatch@lancet.co.ke' },
    { id: 'partner_2', name: 'PathCare Kenya Diagnostics', code: 'PARTNER-PATHCARE', phone: '0709891000', email: 'results@pathcarekenya.com' },
    { id: 'partner_3', name: 'Cerba Lancet Africa', code: 'PARTNER-CERBA', phone: '0709736000', email: 'info@cerbalancetafrica.com' },
    { id: 'partner_4', name: 'Nairobi Hospital Reference Lab', code: 'PARTNER-TNH', phone: '0703082000', email: 'labrequests@nbihosp.org' }
];

function AddLabRequestModal({ isOpen, onClose, onAdd, activePatientId, partnerLabsList = [], patientsList = [] }: any) {
    const [fetchedPatients, setFetchedPatients] = useState<any[]>(patientsList);
    const [formData, setFormData] = useState({
        testType: 'Full Blood Count (FBC)',
        priority: 'Routine',
        clinicalNotes: '',
        patientId: activePatientId || '',
        patientName: '',
        fulfillment: 'in_house', // 'in_house' | 'external_partner'
        partnerLabId: '',
        partnerLabName: '',
        specimenType: 'Whole Blood (EDTA)',
        barcodeNumber: `SPEC-${Math.floor(100000 + Math.random() * 900000)}`,
        collectionTime: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });

    useEffect(() => {
        if (activePatientId) {
            setFormData(prev => ({ ...prev, patientId: activePatientId }));
        }
    }, [activePatientId]);

    useEffect(() => {
        if (isOpen && fetchedPatients.length === 0) {
            apiService.fetchModuleRecords('his_patients').then(res => {
                if (res && res.length > 0) setFetchedPatients(res);
            }).catch(() => null);
        }
    }, [isOpen]);

    const availablePartners = partnerLabsList.length > 0 ? partnerLabsList : DEFAULT_PARTNER_LABS;
    const availablePatients = fetchedPatients.length > 0 ? fetchedPatients : patientsList;

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[3rem] p-8 md:p-10 relative shadow-2xl animate-zoom-in my-8">
                <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                    <XIcon className="w-6 h-6" />
                </button>

                <div className="mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-white">
                        Initiate <span className="text-blue-400">Diagnostic Order</span>
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        In-House Processing &amp; External Partner Lab Referrals
                    </p>
                </div>

                <div className="space-y-5">
                    {/* Patient Selection Field */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 ml-1 block">Patient Registry *</label>
                        {availablePatients.length > 0 ? (
                            <select
                                value={formData.patientId}
                                onChange={(e) => {
                                    const selected = availablePatients.find((p: any) => p.id === e.target.value);
                                    setFormData({
                                        ...formData,
                                        patientId: e.target.value,
                                        patientName: selected?.fullName || e.target.value
                                    });
                                }}
                                className="w-full bg-black/50 border border-indigo-500/40 rounded-2xl px-5 py-3.5 text-xs font-bold text-white outline-none focus:border-indigo-400 uppercase"
                            >
                                <option value="">-- Select Patient File / Name --</option>
                                {availablePatients.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        {p.fullName} (File #: {p.admissionNumber || p.patientNumber || p.id?.substring(0, 8)})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={formData.patientId}
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                                placeholder="Enter Patient File Number or OP ID..."
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold text-white outline-none focus:border-blue-500 uppercase"
                            />
                        )}
                    </div>

                    {/* Fulfillment Facility Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fulfillment Facility</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, fulfillment: 'in_house' })}
                                className={`p-4 rounded-2xl text-left border transition-all ${
                                    formData.fulfillment === 'in_house'
                                        ? 'bg-blue-600/20 border-blue-500 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                }`}
                            >
                                <p className="text-xs font-black uppercase tracking-tight">🏥 In-House Lab</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">Processed by internal laboratory</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const firstLab = availablePartners[0];
                                    setFormData({ 
                                        ...formData, 
                                        fulfillment: 'external_partner',
                                        partnerLabId: firstLab?.id || '',
                                        partnerLabName: firstLab?.name || 'Lancet Kenya Reference Lab'
                                    });
                                }}
                                className={`p-4 rounded-2xl text-left border transition-all ${
                                    formData.fulfillment === 'external_partner'
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                }`}
                            >
                                <p className="text-xs font-black uppercase tracking-tight">🛡️ External Partner Lab</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">Outsourced pathology referral</p>
                            </button>
                        </div>
                    </div>

                    {/* External Partner Selection Dropdown */}
                    {formData.fulfillment === 'external_partner' && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">Select Partnered Reference Lab</label>
                            <select
                                value={formData.partnerLabId}
                                onChange={(e) => {
                                    const selected = availablePartners.find(p => p.id === e.target.value);
                                    setFormData({
                                        ...formData,
                                        partnerLabId: e.target.value,
                                        partnerLabName: selected?.name || e.target.value
                                    });
                                }}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-indigo-500 uppercase"
                            >
                                {availablePartners.map((lab: any) => (
                                    <option key={lab.id} value={lab.id}>
                                        {lab.name} ({lab.code || 'REF-LAB'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Specimen / Test Type */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specimen / Diagnostic Test Panel</label>
                        <select 
                            value={formData.testType} 
                            onChange={e => setFormData({ ...formData, testType: e.target.value })} 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-blue-500 text-white appearance-none uppercase tracking-wider"
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

                    {/* Specimen Collection Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Specimen Type</label>
                            <select
                                value={formData.specimenType}
                                onChange={e => setFormData({ ...formData, specimenType: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-blue-500"
                            >
                                <option>Whole Blood (EDTA)</option>
                                <option>Serum (Gel Tube)</option>
                                <option>Plasma (Citrate)</option>
                                <option>Urine (Mid-Stream)</option>
                                <option>Tissue Biopsy / Formalin</option>
                                <option>Swab / Culture</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Barcode / Specimen ID</label>
                            <input
                                type="text"
                                value={formData.barcodeNumber}
                                onChange={e => setFormData({ ...formData, barcodeNumber: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-indigo-400 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Diagnostic Priority */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Diagnostic Urgency</label>
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => setFormData({ ...formData, priority: 'Routine' })} 
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    formData.priority === 'Routine' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                Routine
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setFormData({ ...formData, priority: 'Urgent' })} 
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    formData.priority === 'Urgent' ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                            >
                                🔴 STAT / Urgent
                            </button>
                        </div>
                    </div>

                    {/* Clinical Observations */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Clinical Observations &amp; Indications</label>
                        <textarea 
                            value={formData.clinicalNotes} 
                            onChange={e => setFormData({ ...formData, clinicalNotes: e.target.value })} 
                            placeholder="SPECIFIC MARKERS, DIFFERENTIAL DIAGNOSIS, OR SPECIAL HANDLING..." 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold outline-none text-white uppercase tracking-wider h-24 resize-none"
                        />
                    </div>
                </div>

                <button 
                    onClick={() => onAdd(formData)} 
                    className="w-full mt-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-blue-600/30 italic"
                >
                    Commit Lab Order to Queue →
                </button>
            </div>
        </div>
    );
}

function UpdateLabResultModal({ isOpen, onClose, request, onUpdate }: any) {
    const [result, setResult] = useState('');
    const [dispatchStatus, setDispatchStatus] = useState(request?.status || 'Pending');
    const [entryMode, setEntryMode] = useState<'structured' | 'text'>('structured');

    // FBC Numerical Values State
    const [fbcValues, setFbcValues] = useState({
        hb: '13.5',
        hct: '41.2',
        rbc: '4.65',
        mcv: '88.4',
        mch: '29.1',
        mchc: '33.2',
        rdw: '12.8',
        wbc: '7.40',
        plt: '285',
        mpv: '9.2',
        neut: '62.0',
        lymph: '28.5',
        mono: '6.2',
        eos: '2.5',
        baso: '0.8',
        pbfNotes: 'Red cells are normocytic normochromic. Zero atypical blasts.'
    });

    useEffect(() => {
        if (request) {
            setDispatchStatus(request.status || 'Pending');
            setResult(request.results || '');
        }
    }, [request]);

    const isFbc = !request?.testType || request?.testType?.toLowerCase().includes('blood') || request?.testType?.toLowerCase().includes('fbc') || request?.testType?.toLowerCase().includes('cbc');

    const handleCompileFbcString = () => {
        const compiled = `Hb: ${fbcValues.hb} g/dL, HCT: ${fbcValues.hct}%, RBC: ${fbcValues.rbc} x10^12/L, MCV: ${fbcValues.mcv} fL, MCH: ${fbcValues.mch} pg, MCHC: ${fbcValues.mchc} g/dL, RDW: ${fbcValues.rdw}%, WBC: ${fbcValues.wbc} x10^9/L, PLT: ${fbcValues.plt} x10^9/L. Differential: Neut: ${fbcValues.neut}%, Lymph: ${fbcValues.lymph}%, Mono: ${fbcValues.mono}%, Eos: ${fbcValues.eos}%, Baso: ${fbcValues.baso}%. PBF: ${fbcValues.pbfNotes}`;
        setResult(compiled);
        return compiled;
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 md:p-10 relative shadow-2xl animate-zoom-in my-8 max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-white rounded-xl">
                    <XIcon className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">
                            Diagnostic Result Entry Form
                        </span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                        {request?.testType} <span className="text-emerald-400">— Result Input</span>
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Patient ID: {request?.patientId?.substring(0, 10)} • Barcode: {request?.barcodeNumber}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Status lifecycle update */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lifecycle Status</label>
                        <select
                            value={dispatchStatus}
                            onChange={(e) => setDispatchStatus(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs font-bold text-white outline-none uppercase"
                        >
                            <option value="Pending">Pending Specimen Collection</option>
                            <option value="Sample Collected">Sample Collected / In-Transit</option>
                            <option value="Dispatched to Partner">Dispatched to Partner Lab</option>
                            <option value="Acknowledged by Partner">Acknowledged by Partner Lab</option>
                            <option value="Completed">Completed &amp; Broadcast Results</option>
                        </select>
                    </div>

                    {/* Entry Mode Switcher */}
                    <div className="flex items-center justify-between p-2 bg-black/40 border border-white/10 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider ml-2">Input Mode:</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEntryMode('structured')}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    entryMode === 'structured' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                🧪 Parameter Value Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setEntryMode('text')}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    entryMode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                📝 Free-Text Summary
                            </button>
                        </div>
                    </div>

                    {/* STRUCTURED FBC PARAMETER INPUT GRID */}
                    {entryMode === 'structured' && isFbc ? (
                        <div className="p-5 bg-black/50 border border-indigo-500/30 rounded-3xl space-y-5 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">FBC / CBC Quantitative Parameter Grid</h4>
                                <button
                                    type="button"
                                    onClick={() => setFbcValues({
                                        hb: '13.5', hct: '41.2', rbc: '4.65', mcv: '88.4', mch: '29.1', mchc: '33.2', rdw: '12.8',
                                        wbc: '7.40', plt: '285', mpv: '9.2', neut: '62.0', lymph: '28.5', mono: '6.2', eos: '2.5', baso: '0.8',
                                        pbfNotes: 'Red cells are normocytic normochromic. Zero atypical blasts.'
                                    })}
                                    className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 uppercase hover:bg-emerald-500/20"
                                >
                                    ⚡ Pre-fill Normal FBC Values
                                </button>
                            </div>

                            {/* Red Cell Parameters */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Red Cell Indices &amp; Haemoglobin</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">Hb (g/dL)</label>
                                        <input type="text" value={fbcValues.hb} onChange={e => setFbcValues({ ...fbcValues, hb: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">HCT (%)</label>
                                        <input type="text" value={fbcValues.hct} onChange={e => setFbcValues({ ...fbcValues, hct: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">RBC (10¹²/L)</label>
                                        <input type="text" value={fbcValues.rbc} onChange={e => setFbcValues({ ...fbcValues, rbc: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">MCV (fL)</label>
                                        <input type="text" value={fbcValues.mcv} onChange={e => setFbcValues({ ...fbcValues, mcv: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            {/* White Cell & Platelets */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total White Cells &amp; Platelets</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">WBC (10⁹/L)</label>
                                        <input type="text" value={fbcValues.wbc} onChange={e => setFbcValues({ ...fbcValues, wbc: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">PLT (10⁹/L)</label>
                                        <input type="text" value={fbcValues.plt} onChange={e => setFbcValues({ ...fbcValues, plt: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">MCH (pg)</label>
                                        <input type="text" value={fbcValues.mch} onChange={e => setFbcValues({ ...fbcValues, mch: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">RDW (%)</label>
                                        <input type="text" value={fbcValues.rdw} onChange={e => setFbcValues({ ...fbcValues, rdw: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs font-mono font-bold text-white text-center outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            {/* 5-Part Differential */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">5-Part Differential (%)</label>
                                <div className="grid grid-cols-5 gap-2">
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">Neut %</label>
                                        <input type="text" value={fbcValues.neut} onChange={e => setFbcValues({ ...fbcValues, neut: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-mono text-center text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">Lymph %</label>
                                        <input type="text" value={fbcValues.lymph} onChange={e => setFbcValues({ ...fbcValues, lymph: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-mono text-center text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">Mono %</label>
                                        <input type="text" value={fbcValues.mono} onChange={e => setFbcValues({ ...fbcValues, mono: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-mono text-center text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">Eos %</label>
                                        <input type="text" value={fbcValues.eos} onChange={e => setFbcValues({ ...fbcValues, eos: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-mono text-center text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-bold text-slate-300 uppercase block mb-1">Baso %</label>
                                        <input type="text" value={fbcValues.baso} onChange={e => setFbcValues({ ...fbcValues, baso: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-mono text-center text-white outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Diagnostic Findings Summary *</label>
                            <textarea 
                                value={result} 
                                onChange={e => setResult(e.target.value)} 
                                placeholder="ENTER QUANTITATIVE & QUALITATIVE VALUES OR ATTACH FINDINGS..." 
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-xs font-bold outline-none text-white tracking-wider h-36 resize-none"
                            />
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => {
                        const finalResultString = entryMode === 'structured' && isFbc ? handleCompileFbcString() : result;
                        onUpdate({ results: finalResultString, status: dispatchStatus });
                    }} 
                    className="w-full mt-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-emerald-600/30 italic"
                >
                    Save &amp; Broadcast Result to Patient 360 ✓
                </button>
            </div>
        </div>
    );
}

export function LabDiagnosticsView({ institutionId, activeRole, userName, activePatientId, institutionData }: LabDiagnosticsViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [partnerLabsList, setPartnerLabsList] = useState<any[]>([]);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

    // On-Screen PDF Requisition Preview modal state
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfPreviewUri, setPdfPreviewUri] = useState<string | null>(null);
    const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');

    const fetchLabs = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords('his_lab_requests', institutionId);
            setRequests(data || []);

            const partners = await apiService.fetchModuleRecords('his_partner_labs', institutionId);
            if (partners && partners.length > 0) {
                setPartnerLabsList(partners);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLabs();
    }, [institutionId]);

    const handlePreviewRequisitionPdf = async (req: any) => {
        try {
            const partnerInfo = partnerLabsList.find(p => p.id === req.partnerLabId || p.name === req.partnerLabName) || {
                name: req.partnerLabName || 'Lancet Kenya Reference Lab',
                phone: req.partnerLabPhone || '+254 703 061000',
                email: req.partnerLabEmail || 'dispatch@lancet.co.ke'
            };

            const patientInfo = {
                fullName: req.patientName || `Patient #${req.patientId?.substring(0, 8)}`,
                admissionNumber: req.patientAdmissionNumber || 'PAT-0001',
                gender: req.patientGender || 'Male',
                dob: req.patientDob || '1995-05-12',
                contact: req.patientContact || '+254 700 000 000',
                insuranceProvider: req.insuranceProvider || 'Self-Pay (Direct Referral)'
            };

            const uri = await generateExternalLabRequisitionPdf(
                {
                    id: req.id,
                    testType: req.testType,
                    priority: req.priority,
                    clinicalNotes: req.clinicalNotes,
                    specimenType: req.specimenType,
                    barcodeNumber: req.barcodeNumber,
                    collectionTime: req.collectionTime || req.createdAt,
                    requestedBy: req.requestedBy || userName || 'Dr. Attending Physician',
                    partnerLabName: partnerInfo.name,
                    partnerLabPhone: partnerInfo.phone,
                    partnerLabEmail: partnerInfo.email
                },
                patientInfo,
                institutionData || { name: 'Quantum Healthcare' }
            );

            setPdfPreviewUri(uri);
            setPdfPreviewTitle(`Lab Requisition - ${req.testType} (${partnerInfo.name})`);
            setIsPdfModalOpen(true);
        } catch (err: any) {
            alert(`PDF Generation error: ${err.message || err}`);
        }
    };

    const filteredRequests = requests.filter(r => 
        r.testType?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.partnerLabName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in-up space-y-10">
            {/* Header */}
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Diagnostics <span className="text-blue-400">Hub</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified In-House &amp; Partnered Laboratory Referral Registry</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchLabs} className="glass-morphism px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync
                    </button>
                    <button 
                        onClick={() => setIsRequestModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                    >
                        <PlusIcon className="w-4 h-4" /> New Lab Order
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-3 space-y-6">
                    {/* Search bar */}
                    <div className="relative">
                        <SearchIcon className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by test panel, patient ID, or partnered lab..."
                            className="w-full bg-slate-900/60 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden min-h-[500px]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Panel &amp; Facility</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Specimen / Barcode</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {isLoading ? (
                                        [1,2,3].map(i => <tr key={i} className="animate-pulse h-20 bg-white/5"></tr>)
                                    ) : filteredRequests.length > 0 ? filteredRequests.map((r, i) => (
                                        <tr key={r.id || i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                        r.fulfillment === 'external_partner' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        <BeakerIcon className="w-5 h-5 transition-transform group-hover:rotate-12" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase tracking-tight italic text-slate-900 dark:text-white">{r.testType}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {r.fulfillment === 'external_partner' ? (
                                                                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                                                                    🛡️ {r.partnerLabName || 'Partner Lab'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase">
                                                                    🏥 In-House Lab
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-mono font-bold text-indigo-400">{r.barcodeNumber || `SPEC-${r.id?.substring(0, 6)}`}</p>
                                                <p className="text-[9px] text-slate-500 mt-0.5">{r.specimenType || 'Whole Blood'}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                    r.priority === 'Urgent' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10 animate-pulse' : 'border-blue-500/20 text-blue-400 bg-blue-500/10'
                                                }`}>
                                                    {r.priority || 'Routine'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${
                                                    r.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                    r.status === 'Dispatched to Partner' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                                }`}>
                                                    {r.status === 'Completed' ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                                                    {r.status || 'Pending'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {r.fulfillment === 'external_partner' && (
                                                        <button
                                                            onClick={() => handlePreviewRequisitionPdf(r)}
                                                            className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 px-3 border border-indigo-500/20"
                                                            title="Print External Lab Requisition Slip"
                                                        >
                                                            <FileTextIcon className="w-3.5 h-3.5" />
                                                            <span>Requisition PDF</span>
                                                        </button>
                                                    )}

                                                    <button 
                                                        onClick={() => { setSelectedRequest(r); setIsResultModalOpen(true); }}
                                                        className="bg-blue-600/10 text-blue-400 p-2 py-2 px-4 rounded-xl text-[9px] font-black uppercase border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                                                    >
                                                        Update / Result
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center opacity-40 italic">
                                                <BeakerIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Zero Diagnostic Orders in Queue</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                    <div className="glass-morphism p-8 rounded-[3rem] border border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent shadow-xl space-y-6">
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] italic">Active Reference Networks</p>
                        <div className="space-y-4">
                            {(partnerLabsList.length > 0 ? partnerLabsList : DEFAULT_PARTNER_LABS).map((lab, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                    <p className="text-xs font-black text-white italic">{lab.name}</p>
                                    <p className="text-[9px] font-mono text-indigo-400">{lab.phone || '0700123456'} • {lab.email || 'partner@lab.com'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL: ADD LAB ORDER */}
            <AddLabRequestModal 
                isOpen={isRequestModalOpen} 
                onClose={() => setIsRequestModalOpen(false)} 
                activePatientId={activePatientId}
                partnerLabsList={partnerLabsList}
                onAdd={async (data: any) => {
                    try {
                        if (!activePatientId && !data.patientId) {
                            alert("Please select a patient first in the Patient 360 view.");
                            return;
                        }
                        
                        const reqId = `lab_${Date.now()}`;
                        const record = { 
                            ...data, 
                            patientId: data.patientId || activePatientId,
                            institutionId, 
                            requestedBy: userName || 'DR. ATTENDING', 
                            id: reqId,
                            createdAt: new Date().toISOString(),
                            status: data.fulfillment === 'external_partner' ? 'Dispatched to Partner' : 'Pending'
                        };

                        await apiService.saveModuleRecord('his_lab_requests', record);

                        // Auto-enqueue bill item onto Cashier Finance tab queue
                        await apiService.saveModuleRecord('his_billing_items', {
                            id: `bill_${reqId}`,
                            institutionId,
                            patientId: data.patientId || activePatientId,
                            patientName: `Patient #${(data.patientId || activePatientId).substring(0, 8)}`,
                            doctorName: userName || 'Dr. Attending',
                            type: data.fulfillment === 'external_partner' ? `Partnered Lab (${data.partnerLabName})` : 'In-House Diagnostic Order',
                            totalAmount: data.fulfillment === 'external_partner' ? 3500 : 2000,
                            status: 'pending_queue',
                            createdAt: new Date().toISOString(),
                            items: [
                                {
                                    itemName: `${data.testType} [${data.fulfillment === 'external_partner' ? data.partnerLabName : 'In-House'}]`,
                                    category: 'Laboratory',
                                    quantity: 1,
                                    unitPrice: data.fulfillment === 'external_partner' ? 3500 : 2000
                                }
                            ]
                        }).catch(() => null);

                        setIsRequestModalOpen(false);
                        fetchLabs();
                        alert(`✓ Diagnostic order committed! ${data.fulfillment === 'external_partner' ? `Dispatched to ${data.partnerLabName}` : 'In-house queue updated.'}`);
                    } catch (error: any) {
                        alert(`Submission failed: ${error.message || 'Unknown error'}`);
                    }
                }} 
            />

            {/* MODAL: UPDATE RESULT & DISPATCH */}
            <UpdateLabResultModal 
                isOpen={isResultModalOpen} 
                onClose={() => setIsResultModalOpen(false)} 
                request={selectedRequest} 
                onUpdate={async (data: any) => {
                    try {
                        const completeData = { 
                            ...selectedRequest, 
                            ...data, 
                            technicianId: userName || 'TECH_SYS', 
                            completedAt: new Date().toISOString() 
                        };
                        await apiService.saveModuleRecord('his_lab_requests', completeData);
                        
                        // Transmit back to Patient 360 dossier
                        await apiService.saveModuleRecord('his_clinical_events', {
                            id: `evt_lab_${Date.now()}`,
                            patientId: selectedRequest.patientId,
                            institutionId: institutionId,
                            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                            time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                            event: `Lab Result [${selectedRequest.fulfillment === 'external_partner' ? selectedRequest.partnerLabName : 'In-House'}]: ${selectedRequest.testType} - ${data.results.substring(0, 35)}...`,
                            dept: 'Laboratory',
                            provider: userName || 'Lab Technician',
                            createdAt: new Date().toISOString()
                        });

                        setIsResultModalOpen(false);
                        fetchLabs();
                        alert(`✓ Result broadcasted to Patient Dossier successfully!`);
                    } catch (error: any) {
                        alert(`Broadcast failed: ${error.message || 'Unknown error'}`);
                    }
                }} 
            />

            {/* MODAL: ON-SCREEN REQUISITION PDF PREVIEW */}
            {isPdfModalOpen && pdfPreviewUri && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">
                                    📄 External Lab <span className="text-indigo-400">Requisition PDF Preview</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pdfPreviewTitle}</p>
                            </div>
                            <button
                                onClick={() => setIsPdfModalOpen(false)}
                                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                            <PdfViewer pdfDataUri={pdfPreviewUri} title={pdfPreviewTitle} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabDiagnosticsView;
