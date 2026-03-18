import React, { useState, useEffect } from 'react';
import { 
    BeakerIcon, 
    PlusIcon, 
    ArrowPathIcon, 
    SearchIcon,
    ChevronRightIcon,
    UsersIcon,
    SparklesIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentTextIcon
} from '../icons/index';
import { apiService } from '../../services/apiService';

interface LabDiagnosticsViewProps {
    institutionId?: string;
    activeRole?: string;
    userName?: string;
}

export const LabDiagnosticsView: React.FC<LabDiagnosticsViewProps> = ({ institutionId, activeRole, userName }) => {
    const isLabTech = activeRole === 'admin' || activeRole === 'staff'; // Or specialized role
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

    const fetchLabs = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords('his_lab_requests', institutionId);
            setRequests(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLabs();
    }, [institutionId]);

    const filteredRequests = requests.filter(r => 
        r.testType?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in-up space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Diagnostics <span className="text-blue-400">Hub</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Unified Laboratory & Imaging Registry</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchLabs} className="glass-morphism px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync
                    </button>
                    <button 
                        onClick={() => setIsRequestModalOpen(true)}
                        className="bg-blue-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                    >
                        <PlusIcon className="w-4 h-4" /> New Lab Order
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden min-h-[500px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Specification</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority / Note</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Tech</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase</th>
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
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                                    <BeakerIcon className="w-5 h-5 transition-transform group-hover:rotate-12" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tight italic">{r.testType}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">ID: {r.id?.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-rose-500/20 text-rose-500 bg-rose-500/5 ${r.priority === 'Urgent' ? 'animate-pulse' : ''}`}>{r.priority || 'Routine'}</span>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-2 truncate max-w-[150px] italic">"{r.clinicalNotes || 'No notes'}"</p>
                                        </td>
                                        <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {r.technicianId || 'Awaiting Node...'}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${
                                                r.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                                            }`}>
                                                {r.status === 'Completed' ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                                                {r.status || 'Pending'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {r.status !== 'Completed' ? (
                                                <button 
                                                    onClick={() => { setSelectedRequest(r); setIsResultModalOpen(true); }}
                                                    className="bg-blue-600/10 text-blue-400 p-2.5 px-5 rounded-xl text-[9px] font-black uppercase border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                                                >
                                                    Capture Result
                                                </button>
                                            ) : (
                                                <button className="p-2.5 text-slate-400 hover:text-blue-500 bg-slate-100 dark:bg-white/5 rounded-xl transition-all">
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center opacity-30 grayscale italic">
                                            <BeakerIcon className="w-16 h-16 mx-auto mb-6 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Diagnostic Signals <br/>Waiting for Lab Orders</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent shadow-xl">
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-8 italic">Device Health Status</p>
                        <div className="space-y-6">
                            {[
                                { name: 'Optima PCR', status: 'Calibration Valid', color: 'text-emerald-400' },
                                { name: 'Full Blood Scan', status: 'Maintenance Due', color: 'text-amber-400' },
                                { name: 'Imaging / X-Ray', status: 'Online', color: 'text-blue-400' }
                            ].map((dev, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div><p className="text-xs font-black italic">{dev.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-60">ID: DIAG-{i+200}</p></div>
                                    <div className={`text-[9px] font-black uppercase tracking-widest ${dev.color} italic underline underline-offset-4`}>{dev.status}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-blue-600 shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                        <DocumentTextIcon className="w-10 h-10 mb-6 opacity-40 group-hover:rotate-12 transition-transform" />
                        <h4 className="text-xl font-black mb-2 italic">Global Directive</h4>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Diagnostic Integrity Code</p>
                        <p className="text-[11px] font-bold mt-6 opacity-80 leading-relaxed italic">"All results must be verified by the Clinical Director before transmission to Patient 360 portfolios."</p>
                    </div>
                </div>
            </div>

            <AddLabRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} onAdd={async (data: any) => {
                await apiService.saveModuleRecord('his_lab_requests', { ...data, institutionId, requestedBy: userName || 'DR. JANE', id: `lab_${Date.now()}` });
                fetchLabs();
            }} />

            <UpdateLabResultModal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} request={selectedRequest} onUpdate={async (data: any) => {
                const completeData = { ...selectedRequest, ...data, status: 'Completed', technicianId: userName || 'TECH_SYS', completedAt: new Date().toISOString() };
                await apiService.saveModuleRecord('his_lab_requests', completeData);
                
                // Transmit back to Doctor's clinical timeline
                await apiService.saveModuleRecord('his_clinical_events', {
                    id: `evt_lab_${Date.now()}`,
                    patientId: selectedRequest.patientId,
                    institutionId: institutionId,
                    date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                    event: `Lab Result: ${selectedRequest.testType} - Result: ${data.results.substring(0, 30)}...`,
                    dept: 'Laboratory',
                    provider: userName || 'Lab Technician'
                });

                fetchLabs();
            }} />
        </div>
    );
};

// Internal Modals for Speed (Wait! I'll break them out for clarity)
const AddLabRequestModal = ({ isOpen, onClose, onAdd }: any) => {
    const [formData, setFormData] = useState({ testType: 'Full Blood Count (FBC)', priority: 'Routine', clinicalNotes: '', patientId: 'p_12345' });
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] p-12 relative shadow-2xl animate-zoom-in">
                <button onClick={onClose} className="absolute top-10 right-10 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"><XIcon className="w-6 h-6" /></button>
                <div className="mb-10"><h3 className="text-2xl font-black uppercase tracking-tight italic">Initiate <span className="text-blue-500">Lab Order</span></h3><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Diagnostic Signaling Protocol</p></div>
                <div className="space-y-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-4">Specimen / Test Type</label><select value={formData.testType} onChange={e => setFormData({ ...formData, testType: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-blue-500/50 rounded-2xl px-6 py-5 text-sm font-black outline-none transition-all dark:text-white appearance-none uppercase tracking-widest whitespace-nowrap"><option>Full Blood Count (FBC)</option><option>Liver Function Test (LFT)</option><option>Urinalysis (Micro & Macro)</option><option>Blood Group & Crossmatch</option><option>Electrolytes & Creatinine</option><option>Chest X-Ray / CT Hub</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-4">Diagnostic Priority</label><div className="flex gap-4"><button type="button" onClick={() => setFormData({ ...formData, priority: 'Routine' })} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.priority === 'Routine' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 border-white/5 text-slate-500 hover:border-blue-400'}`}>Routine</button><button type="button" onClick={() => setFormData({ ...formData, priority: 'Urgent' })} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.priority === 'Urgent' ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white/5 border-white/5 text-slate-500 hover:border-rose-400'}`}>Urgent</button></div></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-4">Clinical Observations</label><textarea value={formData.clinicalNotes} onChange={e => setFormData({ ...formData, clinicalNotes: e.target.value })} placeholder="SPECIFIC MARKERS TO OBSERVE..." className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-blue-500/50 rounded-2xl px-6 py-5 text-[10px] font-bold outline-none transition-all dark:text-white uppercase tracking-[0.2em] h-32"></textarea></div>
                </div>
                <button onClick={() => onAdd(formData)} className="w-full mt-10 py-6 bg-blue-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-2xl shadow-blue-600/30 italic">Commit Order to Node</button>
            </div>
        </div>
    );
};

const UpdateLabResultModal = ({ isOpen, onClose, request, onUpdate }: any) => {
    const [result, setResult] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] p-12 relative shadow-2xl animate-zoom-in">
                <button onClick={onClose} className="absolute top-10 right-10 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"><XIcon className="w-6 h-6" /></button>
                <div className="mb-10 text-emerald-500"><h3 className="text-2xl font-black uppercase tracking-tight italic">Capture <span className="text-slate-900 dark:text-white">Diagnostic Result</span></h3><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{request?.testType} for Registry ID {request?.id?.substring(0, 8)}</p></div>
                <div className="space-y-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-4">Diagnostic Outcome / Values</label><textarea value={result} onChange={e => setResult(e.target.value)} placeholder="ENTER QUANTITATIVE & QUALITATIVE DATA..." className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-emerald-500/50 rounded-2xl px-6 py-5 text-[10px] font-bold outline-none transition-all dark:text-white uppercase tracking-[0.2em] h-48"></textarea></div>
                </div>
                <button onClick={() => onUpdate({ results: result })} className="w-full mt-10 py-6 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-2xl shadow-emerald-600/30 italic">Broadcast Result back to Portfolio</button>
            </div>
        </div>
    );
};

// Help icons from HealthIcons or from elsewhere
const XIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
