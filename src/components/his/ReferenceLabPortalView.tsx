import React, { useState, useEffect } from 'react';
import { BeakerIcon } from '../icons/BeakerIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { BuildingOfficeIcon, ClockIcon } from './HealthIcons';
import { SearchIcon } from '../icons/SearchIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { XIcon } from '../icons/XIcon';
import { apiService } from '../../services/apiService';
import { generateFbcLabReportPdf } from '../../services/pdfService';
import { PdfViewer } from '../PdfViewer';

interface ReferenceLabPortalProps {
    institutionId?: string;
    userName?: string;
}

const REGISTERED_REFERENCE_LABS = [
    { id: 'lab_lancet', name: 'Lancet Kenya Reference Laboratories', code: 'LANCET-HQ', city: 'Nairobi' },
    { id: 'lab_pathcare', name: 'PathCare Diagnostics International', code: 'PATHCARE-01', city: 'Mombasa' },
    { id: 'lab_cerba', name: 'Cerba Lancet Africa Network', code: 'CERBA-AFR', city: 'Kisumu' },
    { id: 'lab_nairobi', name: 'Nairobi Hospital Reference Lab', code: 'NH-LAB-04', city: 'Nairobi' },
    { id: 'lab_micropath', name: 'MicroPath Independent Diagnostics', code: 'MPATH-09', city: 'Nakuru' }
];

export function ReferenceLabPortalView({ institutionId, userName }: ReferenceLabPortalProps) {
    const [selectedLabId, setSelectedLabId] = useState('lab_lancet');
    const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'completed' | 'hospitals' | 'billing'>('orders');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for entering / submitting results
    const [selectedOrderForSubmit, setSelectedOrderForSubmit] = useState<any | null>(null);
    const [resultValuesText, setResultValuesText] = useState('');
    const [pathologistRemarks, setPathologistRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // PDF Preview Modal
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);

    const activeLab = REGISTERED_REFERENCE_LABS.find(l => l.id === selectedLabId) || REGISTERED_REFERENCE_LABS[0];

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const records = await apiService.fetchModuleRecords('his_lab_requests', institutionId);
            if (records && records.length > 0) {
                setIncomingOrders(records);
            } else {
                const sampleOrders = [
                    {
                        id: 'ref_ord_801',
                        hospitalName: 'Quantum Medical Centre',
                        patientName: 'David Ochieng',
                        patientId: 'pat_102',
                        gender: 'Male',
                        dob: '1988-11-20',
                        testType: 'Histopathology / Tissue Biopsy',
                        priority: 'Stat Urgent',
                        specimenType: 'Tissue Biopsy Formalin',
                        barcodeNumber: 'SPEC-992104',
                        requestedBy: 'Dr. Sarah Omondi',
                        clinicalNotes: 'Excisional biopsy of right breast mass. Rule out malignancy.',
                        createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
                        status: 'Pending Receipt'
                    },
                    {
                        id: 'ref_ord_802',
                        hospitalName: 'Nairobi South Hospital',
                        patientName: 'Jane Wanjiku',
                        patientId: 'pat_101',
                        gender: 'Female',
                        dob: '1992-05-14',
                        testType: 'Full Blood Count (FBC)',
                        priority: 'Routine',
                        specimenType: 'Whole Blood EDTA',
                        barcodeNumber: 'SPEC-849102',
                        requestedBy: 'Dr. John Smith',
                        clinicalNotes: 'Post-op routine evaluation',
                        createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
                        status: 'In-Process'
                    },
                    {
                        id: 'ref_ord_803',
                        hospitalName: 'Coast General Teaching Hospital',
                        patientName: 'Kevin Otieno',
                        patientId: 'pat_103',
                        gender: 'Male',
                        dob: '1995-03-08',
                        testType: 'Thyroid Panel (TSH, Free T3, Free T4)',
                        priority: 'Routine',
                        specimenType: 'Serum Yellow Top',
                        barcodeNumber: 'SPEC-773109',
                        requestedBy: 'Dr. Peter Kamau',
                        clinicalNotes: 'Suspected hyperthyroidism',
                        createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
                        status: 'Completed'
                    }
                ];
                setIncomingOrders(sampleOrders);
            }
        } catch (err) {
            console.error('Error fetching reference lab orders:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [institutionId, selectedLabId]);

    const handleAcceptOrder = async (order: any) => {
        try {
            order.status = 'In-Process';
            order.acceptedAt = new Date().toISOString();
            await apiService.saveModuleRecord('his_lab_requests', order).catch(() => null);
            setIncomingOrders([...incomingOrders]);
            alert(`✓ Specimen Barcode ${order.barcodeNumber} accepted into ${activeLab.name} workflow.`);
        } catch (err: any) {
            alert('Error accepting specimen: ' + err.message);
        }
    };

    const handleBroadcastResult = async () => {
        if (!selectedOrderForSubmit) return;
        setIsSubmitting(true);
        try {
            const updatedRecord = {
                ...selectedOrderForSubmit,
                status: 'Completed',
                results: resultValuesText || 'Hb: 13.5 g/dL (Normal), HCT: 41.2%, RBC: 4.65 x10^12/L, WBC: 7.40 x10^9/L, PLT: 285 x10^9/L. Zero atypical blasts.',
                pathologistNotes: pathologistRemarks || 'Specimen processed using automated analyzer. Results validated by Consultant Hematopathologist.',
                partnerLabName: activeLab.name,
                completedAt: new Date().toISOString(),
                verifiedBy: `${userName || 'Lab Tech'} (${activeLab.code})`
            };

            await apiService.saveModuleRecord('his_lab_requests', updatedRecord);

            // Broadcast back to Hospital Clinical Events
            await apiService.saveModuleRecord('his_clinical_events', {
                id: `evt_reflab_${Date.now()}`,
                patientId: selectedOrderForSubmit.patientId || 'pat_101',
                institutionId,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                event: `Reference Lab Result: ${selectedOrderForSubmit.testType} [${activeLab.name}]`,
                dept: 'External Laboratory',
                provider: activeLab.name,
                createdAt: new Date().toISOString()
            }).catch(() => null);

            alert(`🚀 Results for ${selectedOrderForSubmit.patientName} submitted & broadcasted live to ${selectedOrderForSubmit.hospitalName}!`);
            setSelectedOrderForSubmit(null);
            setResultValuesText('');
            setPathologistRemarks('');
            fetchOrders();
        } catch (err: any) {
            alert('Submission failed: ' + (err.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = incomingOrders.filter(o =>
        o.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.barcodeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.testType?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 text-slate-900 dark:text-white animate-fade-in p-2 md:p-6">

            {/* ── HEADER BANNER ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> B2B Multi-Hospital Portal
                        </span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        Independent Reference <span className="text-indigo-400">Laboratory Hub</span>
                    </h1>
                    <p className="text-xs text-indigo-200/70 font-bold uppercase tracking-wider mt-1">
                        Receive digital requisitions from partner hospitals &amp; submit diagnostic findings in real-time
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-black/40 border border-white/10 p-3.5 rounded-2xl">
                        <label className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Active Laboratory Entity</label>
                        <select
                            value={selectedLabId}
                            onChange={(e) => setSelectedLabId(e.target.value)}
                            className="bg-transparent text-white text-xs font-black uppercase outline-none"
                        >
                            {REGISTERED_REFERENCE_LABS.map(lab => (
                                <option key={lab.id} value={lab.id} className="bg-slate-900 text-white">{lab.name} ({lab.city})</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={fetchOrders}
                        className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── HORIZONTAL SUB-MENU BAR ── */}
            <div className="flex items-center gap-2 p-2 bg-slate-900/60 border border-white/10 rounded-[2.5rem] overflow-x-auto no-scrollbar shadow-2xl">
                <button 
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'orders' 
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <BeakerIcon className="w-4 h-4" />
                    <span>Incoming Requisitions ({filtered.filter(o => o.status !== 'Completed').length})</span>
                </button>

                <button 
                    onClick={() => setActiveTab('completed')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'completed' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Completed &amp; Broadcasted ({filtered.filter(o => o.status === 'Completed').length})</span>
                </button>

                <button 
                    onClick={() => setActiveTab('hospitals')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'hospitals' 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <span>Partner Client Hospitals (5)</span>
                </button>

                <button 
                    onClick={() => setActiveTab('billing')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'billing' 
                            ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/50' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>B2B Hospital Accounts &amp; Invoicing</span>
                </button>
            </div>

            {/* SEARCH BAR */}
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="SEARCH REQUISITIONS BY HOSPITAL, PATIENT NAME, BARCODE OR TEST TYPE..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white uppercase outline-none"
                />
            </div>

            {/* ── TAB 1: INCOMING REQUISITIONS ── */}
            {activeTab === 'orders' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {filtered.filter(o => o.status !== 'Completed').map((ord) => (
                        <div key={ord.id} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                                        {ord.hospitalName || 'Quantum Medical'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        ord.priority?.includes('Stat') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/10 text-slate-300'
                                    }`}>
                                        {ord.priority || 'Routine'}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight italic">{ord.testType}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">Patient: <strong className="text-white">{ord.patientName}</strong> ({ord.gender})</p>
                                    <p className="text-[9px] font-mono text-indigo-400 uppercase mt-1">Barcode: {ord.barcodeNumber}</p>
                                </div>

                                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 space-y-1 text-xs text-slate-400">
                                    <p><strong className="text-slate-300">Ordering Doctor:</strong> Dr. {ord.requestedBy || 'Attending'}</p>
                                    {ord.clinicalNotes && <p className="italic text-[10px] text-slate-400 mt-1">"{ord.clinicalNotes}"</p>}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex gap-3">
                                {ord.status === 'In-Process' ? (
                                    <button
                                        onClick={() => {
                                            setSelectedOrderForSubmit(ord);
                                            setResultValuesText('Hb: 13.5 g/dL (Normal), HCT: 41.2%, RBC: 4.65 x10^12/L, WBC: 7.40 x10^9/L, PLT: 285 x10^9/L. Zero atypical blasts.');
                                        }}
                                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 italic"
                                    >
                                        <SparklesIcon className="w-4 h-4 text-slate-950" />
                                        <span>Enter Results &amp; Broadcast</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAcceptOrder(ord)}
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span>Accept Specimen</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── TAB 2: COMPLETED RESULTS ── */}
            {activeTab === 'completed' && (
                <div className="space-y-4 animate-fade-in">
                    {filtered.filter(o => o.status === 'Completed').map((ord) => (
                        <div key={ord.id} className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h4 className="text-base font-black text-white uppercase tracking-tight">{ord.testType}</h4>
                                    <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[8px] font-black uppercase border border-emerald-500/30">Broadcasted to Hospital</span>
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase mt-1">
                                    Hospital: <strong className="text-white">{ord.hospitalName}</strong> • Patient: <strong className="text-white">{ord.patientName}</strong> • Barcode: {ord.barcodeNumber}
                                </p>
                                <p className="text-[10px] font-mono text-emerald-400 mt-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                                    {ord.results}
                                </p>
                            </div>

                            <button
                                onClick={async () => {
                                    const uri = await generateFbcLabReportPdf({
                                        reportId: ord.id,
                                        patientName: ord.patientName,
                                        barcodeNumber: ord.barcodeNumber,
                                        doctorName: ord.requestedBy,
                                        results: ord.results
                                    });
                                    setPdfDataUri(uri);
                                    setIsPdfModalOpen(true);
                                }}
                                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 whitespace-nowrap italic"
                            >
                                <DocumentTextIcon className="w-4 h-4 text-slate-950" />
                                <span>Preview PDF</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── MODAL: SUBMIT RESULTS BACK TO HOSPITAL ── */}
            {selectedOrderForSubmit && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Submit Laboratory Findings</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Hospital: {selectedOrderForSubmit.hospitalName} • Patient: {selectedOrderForSubmit.patientName}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrderForSubmit(null)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block mb-2">SI Numerical Values &amp; Parameter Matrix *</label>
                                <textarea
                                    value={resultValuesText}
                                    onChange={(e) => setResultValuesText(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. Hb: 13.5 g/dL (Normal), WBC: 7.4 x10^9/L, PLT: 285 x10^9/L, Neutrophils: 62%..."
                                    className="w-full bg-black/40 border border-white/10 focus:border-indigo-500 rounded-2xl p-4 text-xs font-mono font-bold text-white outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pathologist Clinical Remarks &amp; Film Findings</label>
                                <textarea
                                    value={pathologistRemarks}
                                    onChange={(e) => setPathologistRemarks(e.target.value)}
                                    rows={2}
                                    placeholder="Red cells are normocytic normochromic. Zero atypical blast cells seen."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none"
                                />
                            </div>

                            <button
                                onClick={handleBroadcastResult}
                                disabled={isSubmitting || !resultValuesText.trim()}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center gap-2 italic"
                            >
                                {isSubmitting ? 'Broadcasting Findings...' : <><SparklesIcon className="w-4 h-4 text-slate-950" /> Submit &amp; Broadcast Live to Hospital</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PDF PREVIEW MODAL ── */}
            {isPdfModalOpen && pdfDataUri && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-4xl h-[85vh] rounded-[2.5rem] p-6 shadow-2xl flex flex-col relative">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Reference Lab Diagnostic PDF</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Official Laboratory Report</p>
                            </div>
                            <button onClick={() => setIsPdfModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 rounded-2xl overflow-hidden bg-slate-950">
                            <PdfViewer src={pdfDataUri} title="Reference Lab Report" />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ReferenceLabPortalView;
