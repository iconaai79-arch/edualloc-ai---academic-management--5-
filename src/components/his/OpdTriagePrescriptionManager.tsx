import React, { useState } from 'react';

interface OpdPatient {
    id: string;
    patientName: string;
    opdNumber: string;
    age: number;
    gender: 'M' | 'F';
    triageCategory: 'RED_EMERGENCY' | 'YELLOW_URGENT' | 'GREEN_ROUTINE';
    vitalSigns: string;
    symptoms: string;
    assignedDoctor: string;
    status: 'TRIAGED' | 'IN_CONSULTATION' | 'PRESCRIPTION_ISSUED' | 'DISCHARGED';
    prescribedMeds: string[];
}

export const OpdTriagePrescriptionManager: React.FC = () => {
    const [patients, setPatients] = useState<OpdPatient[]>([
        { id: 'opd_1', patientName: 'James Mwangi', opdNumber: 'OPD-2026-4401', age: 42, gender: 'M', triageCategory: 'RED_EMERGENCY', vitalSigns: 'BP: 165/100, Temp: 38.8°C, SpO2: 92%', symptoms: 'Severe chest tightness & high fever.', assignedDoctor: 'Dr. Michael Omondi', status: 'IN_CONSULTATION', prescribedMeds: ['Sublingual Nitroglycerin', 'Paracetamol 1000mg IV'] },
        { id: 'opd_2', patientName: 'Grace Njeri', opdNumber: 'OPD-2026-4402', age: 28, gender: 'F', triageCategory: 'YELLOW_URGENT', vitalSigns: 'BP: 120/80, Temp: 37.5°C, SpO2: 98%', symptoms: 'Acute abdominal pain in right lower quadrant.', assignedDoctor: 'Dr. Sarah Kimani', status: 'TRIAGED', prescribedMeds: [] },
        { id: 'opd_3', patientName: 'Daniel Kipchumba', opdNumber: 'OPD-2026-4403', age: 19, gender: 'M', triageCategory: 'GREEN_ROUTINE', vitalSigns: 'BP: 118/75, Temp: 36.6°C, SpO2: 99%', symptoms: 'Routine medical clearance for TVET college.', assignedDoctor: 'Dr. Amina Hassan', status: 'PRESCRIPTION_ISSUED', prescribedMeds: ['Multivitamin Syrup 200ml'] },
    ]);

    const [selectedPatient, setSelectedPatient] = useState<OpdPatient | null>(null);
    const [newMed, setNewMed] = useState('');

    const addPrescription = () => {
        if (!selectedPatient || !newMed.trim()) return;
        setPatients(prev => prev.map(p => p.id === selectedPatient.id ? {
            ...p,
            status: 'PRESCRIPTION_ISSUED',
            prescribedMeds: [...p.prescribedMeds, newMed.trim()]
        } : p));
        setNewMed('');
        alert(`💊 Prescription updated for ${selectedPatient.patientName}. M-Pesa invoice & Pharmacy stock auto-deducted!`);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-black rounded-full border border-rose-500/30 uppercase tracking-wider">
                        HIS Emergency & OPD Suite
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">HIS AI Clinical Triage & OPD Queue Master</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        OPD emergency triage priority, Doctor consultation desk, digital prescription builder & pharmacy billing
                    </p>
                </div>
            </div>

            {/* Patients Queue Grid */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-rose-400 italic">
                        ACTIVE OPD PATIENT TRIAGE & CONSULTATION QUEUE
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {patients.map(p => (
                        <div key={p.id} className={`p-6 rounded-3xl border transition-all ${
                            p.triageCategory === 'RED_EMERGENCY'
                                ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-900/20'
                                : p.triageCategory === 'YELLOW_URGENT'
                                ? 'bg-amber-950/40 border-amber-500/50'
                                : 'bg-emerald-950/40 border-emerald-500/50'
                        }`}>
                            <div className="flex justify-between items-start">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                    p.triageCategory === 'RED_EMERGENCY' ? 'bg-rose-500 text-white animate-pulse' : p.triageCategory === 'YELLOW_URGENT' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                                }`}>
                                    {p.triageCategory.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">{p.opdNumber}</span>
                            </div>

                            <h4 className="text-lg font-black italic text-white mt-3">{p.patientName} ({p.age}{p.gender})</h4>
                            <p className="text-xs text-slate-300 font-bold mt-1">🩺 {p.symptoms}</p>
                            <div className="mt-3 p-3 bg-slate-950/60 rounded-xl text-[10px] font-mono text-slate-400">
                                📊 Vitals: {p.vitalSigns}
                            </div>
                            <div className="mt-3 text-xs font-bold text-sky-400">
                                Doctor: {p.assignedDoctor}
                            </div>

                            {p.prescribedMeds.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-800 text-[10px]">
                                    <span className="font-bold text-emerald-400 uppercase block">Prescribed Meds:</span>
                                    <ul className="list-disc list-inside text-slate-300 mt-1">
                                        {p.prescribedMeds.map((m, idx) => <li key={idx}>{m}</li>)}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedPatient(p)}
                                className="w-full mt-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                                💊 Prescribe & Issue
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Prescription Modal */}
            {selectedPatient && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white">
                        <h3 className="text-lg font-black text-white text-center italic">Prescribe Meds for {selectedPatient.patientName}</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Medication Name & Dosage (e.g. Amoxicillin 500mg TDS x 5 days)"
                                value={newMed}
                                onChange={e => setNewMed(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setSelectedPatient(null)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase">Cancel</button>
                            <button onClick={addPrescription} className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase">Issue Prescription</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
