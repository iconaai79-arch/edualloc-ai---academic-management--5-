
import React, { useState } from 'react';
import type { DisciplineIncident, User } from '../../types';
import { ShieldExclamationIcon } from '../icons/ShieldExclamationIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface DisciplineManagerProps {
    incidents: DisciplineIncident[];
    students: User[];
    onAddIncident: (incident: Omit<DisciplineIncident, 'id' | 'institutionId' | 'timestamp' | 'recordedBy'>) => Promise<void>;
}

export const DisciplineManager: React.FC<DisciplineManagerProps> = ({
    incidents,
    students,
    onAddIncident
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newIncident, setNewIncident] = useState({
        studentId: '',
        incidentType: '',
        severity: 'Medium' as any,
        description: '',
        actionTaken: '',
        status: 'Pending' as any
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.id === newIncident.studentId);
        await onAddIncident({
            ...newIncident,
            studentName: student?.name || 'Unknown Student'
        });
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-900">Behavioral Registry</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Student Discipline & Incident Tracking</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                    <PlusIcon className="w-4 h-4" />
                    Record Incident
                </button>
            </div>

            {isAdding && (
                <div className="bg-rose-50 p-8 rounded-[3rem] border border-rose-100 animate-in slide-in-from-top duration-500">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 px-1">Select Student</label>
                            <select 
                                required
                                value={newIncident.studentId}
                                onChange={e => setNewIncident({...newIncident, studentId: e.target.value})}
                                className="w-full p-4 bg-white rounded-2xl border border-rose-100 font-bold text-slate-700 outline-none focus:ring-2 ring-rose-500/20"
                            >
                                <option value="">Select Student...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 px-1">Incident Category</label>
                            <select 
                                required
                                value={newIncident.incidentType}
                                onChange={e => setNewIncident({...newIncident, incidentType: e.target.value})}
                                className="w-full p-4 bg-white rounded-2xl border border-rose-100 font-bold text-slate-700 outline-none focus:ring-2 ring-rose-500/20"
                            >
                                <option value="">Select Type...</option>
                                <option value="Bullying">Bullying</option>
                                <option value="Academic Dishonesty">Academic Dishonesty</option>
                                <option value="Truancy">Truancy</option>
                                <option value="Dress Code">Dress Code</option>
                                <option value="Disrespect">Disrespect</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 px-1">Detailed Description</label>
                            <textarea 
                                required
                                value={newIncident.description}
                                onChange={e => setNewIncident({...newIncident, description: e.target.value})}
                                className="w-full p-6 bg-white rounded-[2rem] border border-rose-100 font-bold text-slate-700 outline-none focus:ring-2 ring-rose-500/20 min-h-[120px]"
                                placeholder="Describe the incident in detail..."
                            />
                        </div>
                        <div className="flex gap-4 md:col-span-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 font-black uppercase tracking-widest text-rose-400 hover:text-rose-600">Cancel</button>
                            <button type="submit" className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700">Save Incident Record</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {incidents.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] text-center border border-slate-100">
                        <SparklesIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">All Clear</h4>
                        <p className="text-slate-400 text-sm font-medium mt-1">No disciplinary incidents have been recorded.</p>
                    </div>
                ) : (
                    incidents.map((incident, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                        incident.severity === 'Critical' || incident.severity === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                        <ShieldExclamationIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-slate-900">{incident.studentName}</h4>
                                            <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase rounded-full text-slate-400">{incident.status}</span>
                                        </div>
                                        <p className="text-slate-600 text-sm font-bold mt-0.5">{incident.incidentType}</p>
                                        <p className="text-slate-400 text-xs font-medium mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">{incident.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pl-16 md:pl-0">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Severity</p>
                                        <p className={`text-xs font-black uppercase tracking-widest ${
                                            incident.severity === 'Critical' || incident.severity === 'High' ? 'text-rose-600' : 'text-amber-600'
                                        }`}>{incident.severity}</p>
                                    </div>
                                    <div className="h-10 w-[1px] bg-slate-100 mx-2" />
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Recorded On</p>
                                        <p className="text-xs font-black text-slate-900">{new Date(incident.timestamp).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
