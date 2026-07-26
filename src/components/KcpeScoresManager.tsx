import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, User } from '../types';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';

export interface KcpeScoreRecord {
    id: string;
    studentId?: string;
    indexNumber: string;
    studentName: string;
    math: number;
    english: number;
    kiswahili: number;
    science: number;
    socialStudiesRe: number;
    totalScore: number;
    gradeBand: 'A (400-500)' | 'B (300-399)' | 'C (200-299)' | 'D (100-199)' | 'E (<100)';
    academicYear?: string;
    createdAt?: string;
}

interface KcpeScoresManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    users?: User[];
}

export const KcpeScoresManager: React.FC<KcpeScoresManagerProps> = ({
    currentInstitution,
    onUpdateInstitution,
    users = []
}) => {
    // Check 8-4-4 curriculum system
    const is844Curriculum = useMemo(() => {
        const curr = (currentInstitution as any)?.curriculumType || (currentInstitution as any)?.curriculum || '';
        const prof = (currentInstitution as any)?.scheduleProfileId || '';
        const system = (currentInstitution as any)?.educationSystem || '';
        return curr.includes('8-4-4') || curr.includes('844') || prof.includes('844') || system.includes('8-4-4') || system.includes('844');
    }, [currentInstitution]);

    const [curriculumOverride, setCurriculumOverride] = useState<boolean>(false);

    // Initial default demo KCPE candidate records
    const initialRecords: KcpeScoreRecord[] = useMemo(() => [
        { id: 'kcpe_1', indexNumber: '20401001001', studentName: 'Kevin Maina', math: 88, english: 82, kiswahili: 79, science: 85, socialStudiesRe: 84, totalScore: 418, gradeBand: 'A (400-500)', academicYear: '2023' },
        { id: 'kcpe_2', indexNumber: '20401001002', studentName: 'Faith Wanjiru', math: 76, english: 84, kiswahili: 88, science: 79, socialStudiesRe: 81, totalScore: 408, gradeBand: 'A (400-500)', academicYear: '2023' },
        { id: 'kcpe_3', indexNumber: '20401001003', studentName: 'Brian Otieno', math: 72, english: 68, kiswahili: 70, science: 74, socialStudiesRe: 69, totalScore: 353, gradeBand: 'B (300-399)', academicYear: '2023' },
        { id: 'kcpe_4', indexNumber: '20401001004', studentName: 'Amina Mohamed', math: 80, english: 79, kiswahili: 82, science: 75, socialStudiesRe: 78, totalScore: 394, gradeBand: 'B (300-399)', academicYear: '2023' },
        { id: 'kcpe_5', indexNumber: '20401001005', studentName: 'Daniel Kipchirchir', math: 65, english: 62, kiswahili: 60, science: 64, socialStudiesRe: 61, totalScore: 312, gradeBand: 'B (300-399)', academicYear: '2023' }
    ], []);

    const [records, setRecords] = useState<KcpeScoreRecord[]>(initialRecords);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvParsingMessage, setCsvParsingMessage] = useState<string | null>(null);

    // Form state for single score entry
    const [form, setForm] = useState<{
        indexNumber: string;
        studentName: string;
        math: number;
        english: number;
        kiswahili: number;
        science: number;
        socialStudiesRe: number;
    }>({
        indexNumber: '',
        studentName: '',
        math: 70,
        english: 70,
        kiswahili: 70,
        science: 70,
        socialStudiesRe: 70
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync saved KCPE scores from institution profile if available
    useEffect(() => {
        if ((currentInstitution as any)?.kcpeScoresRecords && Array.isArray((currentInstitution as any).kcpeScoresRecords)) {
            setRecords((currentInstitution as any).kcpeScoresRecords);
        }
    }, [currentInstitution]);

    const calculateGradeBand = (total: number): KcpeScoreRecord['gradeBand'] => {
        if (total >= 400) return 'A (400-500)';
        if (total >= 300) return 'B (300-399)';
        if (total >= 200) return 'C (200-299)';
        if (total >= 100) return 'D (100-199)';
        return 'E (<100)';
    };

    const handleAddRecord = () => {
        if (!form.indexNumber.trim() || !form.studentName.trim()) {
            alert('Please provide candidate Index Number and Student Name.');
            return;
        }

        const total = Number(form.math) + Number(form.english) + Number(form.kiswahili) + Number(form.science) + Number(form.socialStudiesRe);
        const newRecord: KcpeScoreRecord = {
            id: `kcpe_${Date.now()}`,
            indexNumber: form.indexNumber.trim(),
            studentName: form.studentName.trim(),
            math: Number(form.math) || 0,
            english: Number(form.english) || 0,
            kiswahili: Number(form.kiswahili) || 0,
            science: Number(form.science) || 0,
            socialStudiesRe: Number(form.socialStudiesRe) || 0,
            totalScore: total,
            gradeBand: calculateGradeBand(total),
            academicYear: new Date().getFullYear().toString()
        };

        const updated = [newRecord, ...records];
        setRecords(updated);
        persistKcpeRecords(updated);

        setIsAddModalOpen(false);
        setForm({ indexNumber: '', studentName: '', math: 70, english: 70, kiswahili: 70, science: 70, socialStudiesRe: 70 });
    };

    const handleDeleteRecord = (id: string) => {
        if (!confirm('Are you sure you want to delete this KCPE score record?')) return;
        const updated = records.filter(r => r.id !== id);
        setRecords(updated);
        persistKcpeRecords(updated);
    };

    const persistKcpeRecords = async (updated: KcpeScoreRecord[]) => {
        if (!currentInstitution || !onUpdateInstitution) return;
        setSaveStatus('saving');
        try {
            await onUpdateInstitution(currentInstitution.id, {
                kcpeScoresRecords: updated
            } as any);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('[KcpeScoresManager] Error saving KCPE scores:', err);
            setSaveStatus('idle');
        }
    };

    // CSV Parse Logic
    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) return;

                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length <= 1) {
                    setCsvParsingMessage('CSV file appears empty or missing data rows.');
                    return;
                }

                const parsed: KcpeScoreRecord[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
                    if (parts.length >= 7) {
                        const indexNo = parts[0];
                        const sName = parts[1];
                        const math = parseFloat(parts[2]) || 0;
                        const eng = parseFloat(parts[3]) || 0;
                        const kisw = parseFloat(parts[4]) || 0;
                        const sci = parseFloat(parts[5]) || 0;
                        const ssre = parseFloat(parts[6]) || 0;
                        const total = parts[7] ? parseFloat(parts[7]) : (math + eng + kisw + sci + ssre);

                        if (indexNo && sName) {
                            parsed.push({
                                id: `kcpe_csv_${Date.now()}_${i}`,
                                indexNumber: indexNo,
                                studentName: sName,
                                math,
                                english: eng,
                                kiswahili: kisw,
                                science: sci,
                                socialStudiesRe: ssre,
                                totalScore: total,
                                gradeBand: calculateGradeBand(total),
                                academicYear: new Date().getFullYear().toString()
                            });
                        }
                    }
                }

                if (parsed.length > 0) {
                    const combined = [...parsed, ...records];
                    setRecords(combined);
                    persistKcpeRecords(combined);
                    setCsvParsingMessage(`Successfully imported ${parsed.length} candidate KCPE scores!`);
                    setTimeout(() => {
                        setIsCsvModalOpen(false);
                        setCsvParsingMessage(null);
                        setCsvFile(null);
                    }, 1500);
                } else {
                    setCsvParsingMessage('Could not parse any valid student score rows from CSV.');
                }
            } catch (err: any) {
                setCsvParsingMessage('Failed to parse CSV file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const header = "index_number,student_name,mathematics,english,kiswahili,science,social_studies_re,total_kcpe_marks\n";
        const sample1 = "20401001010,John Kamau,85,80,78,82,80,405\n";
        const sample2 = "20401001011,Mary Akinyi,72,75,79,70,74,370\n";
        const blob = new Blob([header + sample1 + sample2], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "kcpe_scores_upload_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Filtered records
    const filteredRecords = useMemo(() => {
        if (!searchQuery.trim()) return records;
        const q = searchQuery.toLowerCase();
        return records.filter(r =>
            r.indexNumber.toLowerCase().includes(q) ||
            r.studentName.toLowerCase().includes(q) ||
            r.gradeBand.toLowerCase().includes(q)
        );
    }, [records, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        if (records.length === 0) return { count: 0, mean: 0, highest: 0, lowest: 0, topA: 0 };
        const totals = records.map(r => r.totalScore);
        const mean = Math.round(totals.reduce((a, b) => a + b, 0) / records.length);
        const highest = Math.max(...totals);
        const lowest = Math.min(...totals);
        const topA = records.filter(r => r.totalScore >= 400).length;
        return { count: records.length, mean, highest, lowest, topA };
    }, [records]);

    const activeCurriculum = is844Curriculum || curriculumOverride;

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl">
            {/* Curriculum Engine Guard Banner */}
            {!activeCurriculum ? (
                <div className="p-8 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-900/40 rounded-[2.5rem] space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl">
                            <ExclamationTriangleIcon className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">
                                8-4-4 Curriculum Module Constraint
                            </h3>
                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                                On academics under settings, the KCPE Scores tab is responsible for uploading KCPE scores and it is only active for schools on the 8-4-4 curriculum system. Your current institution profile is set to another curriculum track.
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setCurriculumOverride(true)}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-200 dark:shadow-none flex items-center gap-2"
                        >
                            <SparklesIcon className="w-4 h-4" /> Enable 8-4-4 KCPE Module Mode
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider">
                            8-4-4 Curriculum System Active — KCPE Candidate Entrance Scores Portal Enabled
                        </span>
                    </div>
                    {curriculumOverride && (
                        <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 px-3 py-1 rounded-lg uppercase tracking-widest">
                            Manual Override Active
                        </span>
                    )}
                </div>
            )}

            {/* Header & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Enrolled Candidates</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.count}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Uploaded KCPE Records</p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Mean Score (/500)</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.mean}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Institutional Average</p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Top Score Marks</p>
                    <p className="text-3xl font-black text-amber-500">{stats.highest}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Highest Entrance Score</p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">400+ Marks Candidates</p>
                    <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats.topA}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Grade Band A Honors</p>
                </div>
            </div>

            {/* Controls & Action Bar */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <AcademicCapIcon className="w-6 h-6 text-indigo-600" />
                            KCPE Candidate Scores Registry
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Manage and upload KCPE examination scores for candidate student admissions
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setIsCsvModalOpen(true)}
                            className="px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                        >
                            <ArrowUpTrayIcon className="w-4 h-4 text-indigo-400" /> Upload CSV Batch
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Candidate Score
                        </button>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="w-full sm:w-80">
                        <input
                            type="text"
                            placeholder="Search Index No, Student Name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Showing {filteredRecords.length} of {records.length} Student Scores
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Index Number</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Name</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">MATH</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">ENG</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">KISW</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">SCI</th>
                                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">S/ST</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Total (/500)</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Band</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredRecords.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.indexNumber}</td>
                                    <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white uppercase">{r.studentName}</td>
                                    <td className="px-4 py-4 text-center font-bold text-xs">{r.math}</td>
                                    <td className="px-4 py-4 text-center font-bold text-xs">{r.english}</td>
                                    <td className="px-4 py-4 text-center font-bold text-xs">{r.kiswahili}</td>
                                    <td className="px-4 py-4 text-center font-bold text-xs">{r.science}</td>
                                    <td className="px-4 py-4 text-center font-bold text-xs">{r.socialStudiesRe}</td>
                                    <td className="px-6 py-4 text-center font-black text-sm text-indigo-600 dark:text-indigo-400">{r.totalScore}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            r.totalScore >= 400 ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' :
                                            r.totalScore >= 300 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {r.gradeBand}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteRecord(r.id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                            title="Delete Record"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRecords.length === 0 && (
                        <div className="py-16 text-center text-slate-400 space-y-2">
                            <AcademicCapIcon className="w-12 h-12 mx-auto opacity-30" />
                            <p className="text-xs font-black uppercase tracking-widest">No KCPE candidate score records found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Single Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 animate-scale-in">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">Add Candidate KCPE Scores</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Index Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 20401001015"
                                    value={form.indexNumber}
                                    onChange={e => setForm({ ...form, indexNumber: e.target.value })}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Candidate Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Samuel Kipkorir"
                                    value={form.studentName}
                                    onChange={e => setForm({ ...form, studentName: e.target.value })}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Mathematics (/100)</label>
                                    <input type="number" min="0" max="100" value={form.math} onChange={e => setForm({ ...form, math: Number(e.target.value) })} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">English (/100)</label>
                                    <input type="number" min="0" max="100" value={form.english} onChange={e => setForm({ ...form, english: Number(e.target.value) })} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Kiswahili (/100)</label>
                                    <input type="number" min="0" max="100" value={form.kiswahili} onChange={e => setForm({ ...form, kiswahili: Number(e.target.value) })} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Science (/100)</label>
                                    <input type="number" min="0" max="100" value={form.science} onChange={e => setForm({ ...form, science: Number(e.target.value) })} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Social Studies & RE (/100)</label>
                                    <input type="number" min="0" max="100" value={form.socialStudiesRe} onChange={e => setForm({ ...form, socialStudiesRe: Number(e.target.value) })} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold" />
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Total Aggregate KCPE Score</span>
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                    {Number(form.math) + Number(form.english) + Number(form.kiswahili) + Number(form.science) + Number(form.socialStudiesRe)} / 500
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest">Cancel</button>
                            <button onClick={handleAddRecord} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">Save Candidate Score</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Batch Upload Modal */}
            {isCsvModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] max-w-lg w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6 animate-scale-in">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">Bulk Upload KCPE Scores (CSV)</h3>
                            <button onClick={() => setIsCsvModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">
                                Import candidate KCPE entrance scores using a standard CSV spreadsheet file.
                            </p>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-3">
                                <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-indigo-500" />
                                <div>
                                    <label className="cursor-pointer text-xs font-black text-indigo-600 hover:underline uppercase tracking-wider">
                                        Choose KCPE CSV File
                                        <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">.csv spreadsheet files only</p>
                                </div>
                            </div>

                            {csvParsingMessage && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold">
                                    {csvParsingMessage}
                                </div>
                            )}

                            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-wider flex items-center gap-1"
                                >
                                    📥 Download Sample CSV Template
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => setIsCsvModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
