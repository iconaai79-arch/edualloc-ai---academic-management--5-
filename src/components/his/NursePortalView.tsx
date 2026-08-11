import React, { useState, useEffect } from 'react';
import { UsersIcon } from '../icons/UsersIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BellIcon } from '../icons/BellIcon';
import { HeartIcon, ActivityIcon } from './HealthIcons';
import { SearchIcon } from '../icons/SearchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';
import { apiService } from '../../services/apiService';

interface NursePortalProps {
    institutionId?: string;
    userName?: string;
}

export function NursePortalView({ institutionId, userName }: NursePortalProps) {
    const [activeTab, setActiveTab] = useState<'tasks' | 'mar' | 'vitals' | 'ward'>('tasks');
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for adding nurse task or signing off
    const [selectedTaskForSign, setSelectedTaskForSign] = useState<any | null>(null);
    const [nurseSignNote, setNurseSignNote] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    // Modal state for quick doctor-to-nurse task creation
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        patientName: '',
        patientId: '',
        roomNo: 'Consultation Room 1',
        taskType: 'Injection (IM / IV)',
        description: 'Administer IV Ceftriaxone 1g STAT',
        priority: 'Urgent STAT',
        doctorName: userName || 'Dr. Attending'
    });

    const fetchNursingTasks = async () => {
        setIsLoading(true);
        try {
            const records = await apiService.fetchModuleRecords('his_nurse_tasks', institutionId);
            if (records && records.length > 0) {
                setTasks(records);
            } else {
                const sampleTasks = [
                    {
                        id: 'nt_101',
                        patientName: 'Jane Wanjiku',
                        patientId: 'pat_101',
                        roomNo: 'Treatment Room A',
                        taskType: 'Injection (IV)',
                        description: 'Administer IV Ceftriaxone 1g in 100ml NS over 30 mins STAT',
                        priority: 'Urgent STAT',
                        doctorName: 'Dr. Sarah Omondi',
                        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
                        status: 'Pending'
                    },
                    {
                        id: 'nt_102',
                        patientName: 'David Ochieng',
                        patientId: 'pat_102',
                        roomNo: 'Male Ward - Bed 04',
                        taskType: 'Wound Dressing',
                        description: 'Clean and dress post-op abdominal incision site with sterile gauze',
                        priority: 'Routine',
                        doctorName: 'Dr. John Smith',
                        createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
                        status: 'Pending'
                    },
                    {
                        id: 'nt_103',
                        patientName: 'Mary Muthoni',
                        patientId: 'pat_103',
                        roomNo: 'Treatment Room B',
                        taskType: 'Nebulization',
                        description: 'Nebulize with Ventolin 2.5mg + Atrovent 500mcg q4h',
                        priority: 'Urgent STAT',
                        doctorName: 'Dr. Peter Kamau',
                        createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
                        status: 'Completed',
                        administeredBy: 'Nurse Clara Wambui',
                        administeredAt: new Date(Date.now() - 30 * 60000).toISOString(),
                        nurseNotes: 'Patient tolerated nebulization well. SpO2 improved to 98% on room air.'
                    }
                ];
                setTasks(sampleTasks);
            }
        } catch (err) {
            console.error('Error fetching nurse tasks:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNursingTasks();
    }, [institutionId]);

    const handleSignTask = async () => {
        if (!selectedTaskForSign) return;
        setIsSigning(true);
        try {
            const updated = {
                ...selectedTaskForSign,
                status: 'Completed',
                administeredBy: userName || 'Staff Nurse',
                administeredAt: new Date().toISOString(),
                nurseNotes: nurseSignNote || 'Procedure administered as prescribed per physician order.'
            };
            await apiService.saveModuleRecord('his_nurse_tasks', updated);

            // Log event in Patient 360
            await apiService.saveModuleRecord('his_clinical_events', {
                id: `evt_nurse_${Date.now()}`,
                patientId: selectedTaskForSign.patientId || 'pat_101',
                institutionId,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                event: `Nursing Order Administered: ${selectedTaskForSign.taskType} - ${selectedTaskForSign.description}`,
                dept: 'Nursing Services',
                provider: userName || 'Staff Nurse',
                createdAt: new Date().toISOString()
            }).catch(() => null);

            alert(`✓ Task completed & signed off by ${userName || 'Nurse'}!`);
            setSelectedTaskForSign(null);
            setNurseSignNote('');
            fetchNursingTasks();
        } catch (err: any) {
            alert('Sign-off error: ' + (err.message || err));
        } finally {
            setIsSigning(false);
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.patientName || !newTask.description) return alert('Please enter patient name and description.');
        try {
            const record = {
                ...newTask,
                id: `nt_${Date.now()}`,
                institutionId,
                status: 'Pending',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('his_nurse_tasks', record);
            alert(`✓ Nursing Order assigned to Nurse Queue for ${newTask.patientName}`);
            setIsCreateModalOpen(false);
            fetchNursingTasks();
        } catch (err: any) {
            alert('Error creating task: ' + (err.message || err));
        }
    };

    const handleVoiceCallPatient = (task: any) => {
        const text = `Attention please. Patient ${task.patientName}, please proceed to ${task.roomNo || 'Treatment Room'} for medication.`;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
            alert(`🔊 Calling out: "${text}"`);
        } else {
            alert(text);
        }
    };

    const filtered = tasks.filter(t =>
        (t.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.taskType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.doctorName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 text-slate-900 dark:text-white animate-fade-in p-2 md:p-6">

            {/* ── HEADER BANNER ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Nursing Care &amp; Clinical Task Hub
                        </span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        Nurse <span className="text-indigo-400">Station &amp; MAR Portal</span>
                    </h1>
                    <p className="text-xs text-indigo-200/70 font-bold uppercase tracking-wider mt-1">
                        Execute physician orders, administer STAT injections, manage e-MAR charts &amp; triage vitals
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 italic"
                    >
                        <PlusIcon className="w-4 h-4 text-slate-950" />
                        <span>Assign New Nurse Task</span>
                    </button>
                </div>
            </div>

            {/* ── HORIZONTAL NAV SUB-MENU BAR ── */}
            <div className="flex items-center gap-2 p-2 bg-slate-900/60 border border-white/10 rounded-[2.5rem] overflow-x-auto no-scrollbar shadow-2xl">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'tasks'
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/50'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <ActivityIcon className="w-4 h-4" />
                    <span>Physician Directives &amp; Tasks ({filtered.filter(t => t.status === 'Pending').length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('mar')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'mar'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <SparklesIcon className="w-4 h-4" />
                    <span>e-MAR Medication Chart</span>
                </button>

                <button
                    onClick={() => setActiveTab('vitals')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'vitals'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/50'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <HeartIcon className="w-4 h-4" />
                    <span>Triage &amp; Vital Signs Log</span>
                </button>

                <button
                    onClick={() => setActiveTab('ward')}
                    className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === 'ward'
                            ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/50'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <UsersIcon className="w-4 h-4" />
                    <span>Inpatient Ward Bed Census</span>
                </button>
            </div>

            {/* SEARCH BAR */}
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="SEARCH NURSING ORDERS BY PATIENT NAME, DRUG, INJECTION OR DOCTOR..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white uppercase outline-none"
                />
            </div>

            {/* ── TAB 1: PHYSICIAN DIRECTIVES & TASKS ── */}
            {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {filtered.map((t) => (
                        <div key={t.id} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                                        {t.taskType}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        t.priority?.includes('STAT') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' : 'bg-white/10 text-slate-300'
                                    }`}>
                                        {t.priority || 'Routine'}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight italic">{t.patientName}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">Location: <strong className="text-indigo-400">{t.roomNo}</strong></p>
                                </div>

                                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                                    <label className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Physician Directive / Order:</label>
                                    <p className="text-xs font-bold text-white leading-relaxed">{t.description}</p>
                                    <p className="text-[9px] text-slate-400 mt-2">Prescribed by: <strong className="text-slate-200">Dr. {t.doctorName}</strong></p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-2">
                                {t.status === 'Completed' ? (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[9px] font-bold text-emerald-300 flex items-center justify-between">
                                        <span>✓ Administered by {t.administeredBy}</span>
                                        <span>{t.administeredAt?.substring(11, 16)}</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleVoiceCallPatient(t)}
                                            className="py-3 bg-white/10 hover:bg-white/20 text-white font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-1 border border-white/10"
                                        >
                                            <BellIcon className="w-3.5 h-3.5 text-indigo-300" />
                                            <span>Voice Call</span>
                                        </button>

                                        <button
                                            onClick={() => setSelectedTaskForSign(t)}
                                            className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-1 italic"
                                        >
                                            <CheckCircleIcon className="w-3.5 h-3.5 text-slate-950" />
                                            <span>Administer &amp; Sign</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── TAB 2: e-MAR MEDICATION CHART ── */}
            {activeTab === 'mar' && (
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight italic">24-Hour Electronic Medication Administration Record (e-MAR)</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Scheduled Dose Verification Matrix</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[9px] font-black uppercase text-indigo-300 tracking-widest bg-white/5">
                                    <th className="p-4">Patient &amp; Bed #</th>
                                    <th className="p-4">Prescribed Drug &amp; Route</th>
                                    <th className="p-4">Dosage</th>
                                    <th className="p-4">08:00 Dose</th>
                                    <th className="p-4">14:00 Dose</th>
                                    <th className="p-4">20:00 Dose</th>
                                    <th className="p-4 text-right">Nurse Sign-Off</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs font-bold">
                                <tr>
                                    <td className="p-4 text-white">Jane Wanjiku <span className="block text-[9px] text-slate-400 font-mono">Bed 01 • Female Ward</span></td>
                                    <td className="p-4 text-indigo-300">IV Ceftriaxone (Infusion)</td>
                                    <td className="p-4 text-slate-300">1.0g STAT</td>
                                    <td className="p-4"><span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[8px] font-black border border-emerald-500/30">✓ Given 08:15</span></td>
                                    <td className="p-4"><span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[8px] font-black border border-amber-500/30">⏳ Scheduled</span></td>
                                    <td className="p-4"><span className="px-3 py-1 bg-white/10 text-slate-400 rounded-full text-[8px] font-black">Scheduled</span></td>
                                    <td className="p-4 text-right text-emerald-400 text-[10px]">Nurse Clara W.</td>
                                </tr>
                                <tr>
                                    <td className="p-4 text-white">David Ochieng <span className="block text-[9px] text-slate-400 font-mono">Bed 04 • Male Ward</span></td>
                                    <td className="p-4 text-indigo-300">IM Paracetamol Injection</td>
                                    <td className="p-4 text-slate-300">600mg PRN</td>
                                    <td className="p-4"><span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[8px] font-black border border-emerald-500/30">✓ Given 08:30</span></td>
                                    <td className="p-4"><span className="px-3 py-1 bg-white/10 text-slate-400 rounded-full text-[8px] font-black">Not Due</span></td>
                                    <td className="p-4"><span className="px-3 py-1 bg-white/10 text-slate-400 rounded-full text-[8px] font-black">Not Due</span></td>
                                    <td className="p-4 text-right text-emerald-400 text-[10px]">Nurse Mercy N.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── MODAL: ADMINISTER & SIGN TASK ── */}
            {selectedTaskForSign && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Administer &amp; Sign Nurse Order</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Patient: {selectedTaskForSign.patientName} • Location: {selectedTaskForSign.roomNo}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTaskForSign(null)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl space-y-1 text-xs">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Prescribed Order:</span>
                            <p className="font-bold text-white leading-relaxed">{selectedTaskForSign.description}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nurse Clinical Notes &amp; Observations</label>
                                <textarea
                                    value={nurseSignNote}
                                    onChange={(e) => setNurseSignNote(e.target.value)}
                                    rows={3}
                                    placeholder="Patient tolerated injection well. Vital signs stable post-administration..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none"
                                />
                            </div>

                            <button
                                onClick={handleSignTask}
                                disabled={isSigning}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 italic"
                            >
                                {isSigning ? 'Signing Off Task...' : <><CheckCircleIcon className="w-4 h-4 text-slate-950" /> Confirm Administration &amp; Sign Off</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: CREATE DOCTOR TASK ── */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-5">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Assign Physician Order to Nurse</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Issue clinical directive for patient care</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patient Name *</label>
                                <input
                                    type="text"
                                    value={newTask.patientName}
                                    onChange={(e) => setNewTask({ ...newTask, patientName: e.target.value })}
                                    placeholder="e.g. Jane Wanjiku"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs font-bold text-white outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Task Category</label>
                                    <select
                                        value={newTask.taskType}
                                        onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none uppercase"
                                    >
                                        <option>Injection (IM / IV)</option>
                                        <option>Oral Medication</option>
                                        <option>Wound Dressing</option>
                                        <option>Nebulization</option>
                                        <option>Catheter Insertion</option>
                                        <option>Vital Signs Check</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none uppercase"
                                    >
                                        <option>Urgent STAT</option>
                                        <option>Routine</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Order Directive / Drug Instructions *</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    rows={3}
                                    placeholder="e.g. Give IM Paracetamol 600mg STAT..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none"
                                />
                            </div>

                            <button
                                onClick={handleCreateTask}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-950/50"
                            >
                                Dispatch Nursing Directive →
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default NursePortalView;
