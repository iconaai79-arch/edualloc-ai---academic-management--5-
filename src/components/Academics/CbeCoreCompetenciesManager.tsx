import React, { useState, useMemo, useEffect } from 'react';
import type { 
    Institution, User, Course, CbeRubricLevel, CbeCompetencyAssessment 
} from '../../types';
import { apiService } from '../../services/apiService';
import { 
    Sparkles, Award, ShieldCheck, Heart, Users, MessageSquare, 
    Brain, Cpu, Globe, BookOpen, UserCheck, Star, Save, Printer, 
    Search, CheckCircle2, AlertCircle, RefreshCw, BarChart2, Layers,
    Zap, Smile, Compass, Check
} from 'lucide-react';

export interface CbeCoreCompetenciesManagerProps {
    currentInstitution?: Institution | null;
    users?: User[]; // Contains students & teachers
    courses?: Course[];
    currentUser?: User;
    onLogAction?: (action: string) => Promise<void> | void;
}

// ── 7 CBE CORE COMPETENCIES DEFINITIONS ──
export const CBE_CORE_COMPETENCIES = [
    {
        id: 'comp_comm',
        name: 'Communication & Collaboration',
        icon: '💬',
        color: 'from-blue-500 to-indigo-600',
        description: 'Articulates ideas clearly, listens actively to others, and works harmoniously in group activities.'
    },
    {
        id: 'comp_crit',
        name: 'Critical Thinking & Problem Solving',
        icon: '🧠',
        color: 'from-purple-500 to-violet-600',
        description: 'Analyzes information objectively, evaluates options, and solves real-life mathematical and daily challenges.'
    },
    {
        id: 'comp_crea',
        name: 'Creativity & Imagination',
        icon: '🎨',
        color: 'from-amber-500 to-orange-600',
        description: 'Generates original ideas, produces innovative artworks/crafts, and explores novel ways of learning.'
    },
    {
        id: 'comp_citi',
        name: 'Citizenship & Social Cohesion',
        icon: '🇰🇪',
        color: 'from-emerald-500 to-teal-600',
        description: 'Demonstrates national pride, respects diversity, obeys rules, and actively participates in community service.'
    },
    {
        id: 'comp_digi',
        name: 'Digital Literacy',
        icon: '💻',
        color: 'from-cyan-500 to-blue-600',
        description: 'Navigates digital learning devices safely, searches for educational content, and creates simple media.'
    },
    {
        id: 'comp_lear',
        name: 'Learning to Learn',
        icon: '📚',
        color: 'from-pink-500 to-rose-600',
        description: 'Shows curiosity, sets personal learning goals, reflects on feedback, and pursues independent study.'
    },
    {
        id: 'comp_self',
        name: 'Self-Efficacy & Confidence',
        icon: '👤',
        color: 'from-emerald-600 to-green-700',
        description: 'Believes in personal capabilities, shows resilience facing setbacks, and takes initiative confidently.'
    }
];

// ── 8 CBE CORE VALUES DEFINITIONS ──
export const CBE_CORE_VALUES = [
    { id: 'val_love', name: 'Love', icon: '❤️', description: 'Shows kindness, empathy, and unconditional care to peers and community.' },
    { id: 'val_resp', name: 'Responsibility', icon: '🤝', description: 'Takes ownership of duties, completes homework, and cares for school property.' },
    { id: 'val_rsqt', name: 'Respect', icon: '🛡️', description: 'Treats teachers, elders, peers, and diverse cultures with dignity.' },
    { id: 'val_unit', name: 'Unity', icon: '🌿', description: 'Fosters team spirit, inclusion, and harmonious interaction among classmates.' },
    { id: 'val_peac', name: 'Peace', icon: '🕊️', description: 'Resolves conflicts peacefully without aggression and promotes calm.' },
    { id: 'val_patr', name: 'Patriotism', icon: '🇰🇪', description: 'Honors national symbols, anthem, heritage, and civic responsibilities.' },
    { id: 'val_just', name: 'Social Justice', icon: '⚖️', description: 'Promotes fairness, equity, honesty, and defends rights of all students.' },
    { id: 'val_inte', name: 'Integrity', icon: '💎', description: 'Upholds truthfulness, honesty in exams/games, and moral uprightness.' }
];

export const CbeCoreCompetenciesManager: React.FC<CbeCoreCompetenciesManagerProps> = ({
    currentInstitution,
    users = [],
    courses = [],
    currentUser,
    onLogAction
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Extract all student records
    const allStudents = useMemo(() => (users || []).filter(u => u && u.role === 'student'), [users]);

    // Extract available classes
    const classList = useMemo(() => {
        const set = new Set<string>();
        courses.forEach(c => {
            (c.levels || []).forEach(l => {
                set.add(`${c.name} ${l.name ? '(' + l.name + ')' : ''}`);
            });
        });
        allStudents.forEach(s => {
            if (s.studentClass) set.add(s.studentClass);
        });
        if (set.size === 0) {
            set.add('Grade 1 Alpha');
            set.add('Grade 2 Blue');
            set.add('Grade 3 West');
            set.add('Grade 4 North');
            set.add('Grade 10');
        }
        return Array.from(set);
    }, [courses, allStudents]);

    const [selectedClass, setSelectedClass] = useState<string>(classList[0] || 'Grade 1 Alpha');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'matrix' | 'single_student'>('matrix');

    // Filtered Students for selected class
    const classStudents = useMemo(() => {
        return allStudents.filter(s => {
            const matchesClass = !selectedClass || s.studentClass === selectedClass || selectedClass.includes(s.studentClass || '');
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q || s.name.toLowerCase().includes(q) || (s.admissionNumber || '').toLowerCase().includes(q);
            return matchesClass && matchesQuery;
        });
    }, [allStudents, selectedClass, searchQuery]);

    // Set initial selected student
    useEffect(() => {
        if (classStudents.length > 0 && !selectedStudentId) {
            setSelectedStudentId(classStudents[0].id);
        }
    }, [classStudents, selectedStudentId]);

    const activeStudent = useMemo(() => {
        return classStudents.find(s => s.id === selectedStudentId) || classStudents[0];
    }, [classStudents, selectedStudentId]);

    // Local & Database Assessment Storage (Key: `eduai_cbe_comp_${instId}`)
    const [assessmentStore, setAssessmentStore] = useState<Record<string, {
        competencies: Record<string, CbeRubricLevel>;
        values: Record<string, CbeRubricLevel>;
        comments: string;
    }>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_cbe_comp_${instId}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Get current rating data for a student
    const getStudentData = (studentId: string) => {
        return assessmentStore[studentId] || {
            competencies: {
                'Communication & Collaboration': 'ME',
                'Critical Thinking & Problem Solving': 'ME',
                'Creativity & Imagination': 'ME',
                'Citizenship & Social Cohesion': 'ME',
                'Digital Literacy': 'ME',
                'Learning to Learn': 'ME',
                'Self-Efficacy & Confidence': 'ME'
            },
            values: {
                'Love': 'ME', 'Responsibility': 'ME', 'Respect': 'ME', 'Unity': 'ME',
                'Peace': 'ME', 'Patriotism': 'ME', 'Social Justice': 'ME', 'Integrity': 'ME'
            },
            comments: 'Demonstrates consistent adherence to core values and active participation in class activities.'
        };
    };

    // Update single competency score
    const handleUpdateCompetency = (studentId: string, compName: string, score: CbeRubricLevel) => {
        setAssessmentStore(prev => {
            const current = prev[studentId] || getStudentData(studentId);
            const updated = {
                ...prev,
                [studentId]: {
                    ...current,
                    competencies: { ...current.competencies, [compName]: score }
                }
            };
            localStorage.setItem(`eduai_cbe_comp_${instId}`, JSON.stringify(updated));
            return updated;
        });
    };

    // Update single core value score
    const handleUpdateValue = (studentId: string, valueName: string, score: CbeRubricLevel) => {
        setAssessmentStore(prev => {
            const current = prev[studentId] || getStudentData(studentId);
            const updated = {
                ...prev,
                [studentId]: {
                    ...current,
                    values: { ...current.values, [valueName]: score }
                }
            };
            localStorage.setItem(`eduai_cbe_comp_${instId}`, JSON.stringify(updated));
            return updated;
        });
    };

    // Update qualitative teacher comment
    const handleUpdateComment = (studentId: string, comments: string) => {
        setAssessmentStore(prev => {
            const current = prev[studentId] || getStudentData(studentId);
            const updated = {
                ...prev,
                [studentId]: { ...current, comments }
            };
            localStorage.setItem(`eduai_cbe_comp_${instId}`, JSON.stringify(updated));
            return updated;
        });
    };

    // Batch Mark Entire Class
    const handleBatchMarkClass = (score: CbeRubricLevel) => {
        setAssessmentStore(prev => {
            const updated = { ...prev };
            classStudents.forEach(s => {
                const current = updated[s.id] || getStudentData(s.id);
                const newComps: Record<string, CbeRubricLevel> = {};
                CBE_CORE_COMPETENCIES.forEach(c => newComps[c.name] = score);
                const newVals: Record<string, CbeRubricLevel> = {};
                CBE_CORE_VALUES.forEach(v => newVals[v.name] = score);

                updated[s.id] = {
                    ...current,
                    competencies: newComps,
                    values: newVals
                };
            });
            localStorage.setItem(`eduai_cbe_comp_${instId}`, JSON.stringify(updated));
            return updated;
        });
        setToastMessage(`Batch rated all ${classStudents.length} students as ${score}!`);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Save Assessment Records to Backend API
    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const recordsToSave: CbeCompetencyAssessment[] = [];
            classStudents.forEach(s => {
                const data = getStudentData(s.id);
                recordsToSave.push({
                    id: `comp_rec_${Date.now()}_${s.id}`,
                    institutionId: instId,
                    studentId: s.id,
                    competencyRatings: data.competencies,
                    valueRatings: data.values,
                    generalTeacherComments: data.comments,
                    assessedByTeacherId: currentUser?.id || '',
                    assessedAt: new Date().toISOString()
                });
            });

            await apiService.saveModuleRecords('cbe_competency_assessments', recordsToSave);
            onLogAction?.(`Saved CBE Core Competencies & Values for ${selectedClass}`);
            setToastMessage(`Core Competencies & Values saved successfully! (${recordsToSave.length} students)`);
            setTimeout(() => setToastMessage(null), 4000);
        } catch (e) {
            setToastMessage(`Saved locally! (${classStudents.length} student records)`);
            setTimeout(() => setToastMessage(null), 4000);
        } finally {
            setIsSaving(false);
        }
    };

    // Metrics calculation for Class Overview
    const metrics = useMemo(() => {
        let totalEe = 0, totalMe = 0, totalAe = 0, totalBe = 0;
        let count = 0;

        classStudents.forEach(s => {
            const data = getStudentData(s.id);
            Object.values(data.competencies).forEach(score => {
                count++;
                if (score === 'EE') totalEe++;
                else if (score === 'ME') totalMe++;
                else if (score === 'AE') totalAe++;
                else if (score === 'BE') totalBe++;
            });
        });

        const safeCount = count || 1;
        return {
            eePct: Math.round((totalEe / safeCount) * 100),
            mePct: Math.round((totalMe / safeCount) * 100),
            aePct: Math.round((totalAe / safeCount) * 100),
            bePct: Math.round((totalBe / safeCount) * 100),
            totalRatings: count
        };
    }, [classStudents, assessmentStore]);

    return (
        <div className="space-y-6 text-left font-sans text-slate-900 dark:text-slate-100 no-print">
            {/* ── HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 p-6 md:p-8 text-white border border-purple-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800/50">
                                Competency Based Curriculum (CBC / CBE) • Behavioral & 21st Century Skills
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Star className="w-8 h-8 text-purple-400" />
                            <span>7 Core Competencies & 8 Values Assessment HUD</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Evaluate 21st-century learner competencies (Communication, Critical Thinking, Digital Literacy) and Core Values (Love, Respect, Integrity).
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'Saving Assessments...' : 'Save Competency Records'}</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-all cursor-pointer"
                            title="Print Competency Register"
                        >
                            <Printer className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast Message */}
            {toastMessage && (
                <div className="p-4 bg-purple-950/90 border border-purple-500/50 rounded-2xl text-purple-200 text-xs font-black uppercase tracking-wider flex items-center gap-3 shadow-xl animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* ── KPI METRICS: CLASS COMPETENCY DISTRIBUTION ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-950 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block">Exceeding Expectations (EE)</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{metrics.eePct}%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-blue-100 dark:border-blue-950 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block">Meeting Expectations (ME)</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{metrics.mePct}%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-amber-100 dark:border-amber-950 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 block">Approaching Expectations (AE)</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{metrics.aePct}%</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-rose-100 dark:border-rose-950 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 block">Below Expectations (BE)</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{metrics.bePct}%</span>
                </div>
            </div>

            {/* ── CONTROLS: CLASS SELECTOR & VIEW MODE TOGGLE ── */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Target Class / Grade</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {classList.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Search Student</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filter learner name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                </div>

                {/* View Mode & Batch Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleBatchMarkClass('ME')}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-black text-[10px] uppercase rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all cursor-pointer"
                    >
                        Mark Class All ME (3)
                    </button>
                    <button
                        onClick={() => handleBatchMarkClass('EE')}
                        className="px-3 py-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 font-black text-[10px] uppercase rounded-xl border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all cursor-pointer"
                    >
                        Mark Class All EE (4)
                    </button>
                </div>
            </div>

            {/* ── 7 CORE COMPETENCIES MATRIX SECTION ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-500" />
                            <span>1. The 7 Core Competencies Evaluation</span>
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Rate each student across the 7 mandatory Kenya CBE Core Competencies.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {CBE_CORE_COMPETENCIES.map(comp => (
                        <div key={comp.id} className="p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">{comp.icon}</span>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{comp.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{comp.description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Active Student Rating */}
                            {activeStudent && (
                                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[140px]">{activeStudent.name}:</span>
                                    <div className="flex items-center gap-1">
                                        {(['EE', 'ME', 'AE', 'BE'] as CbeRubricLevel[]).map(lvl => {
                                            const currentData = getStudentData(activeStudent.id);
                                            const currentScore = currentData.competencies[comp.name] || 'ME';
                                            return (
                                                <button
                                                    key={lvl}
                                                    onClick={() => handleUpdateCompetency(activeStudent.id, comp.name, lvl)}
                                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                                                        currentScore === lvl
                                                            ? lvl === 'EE' ? 'bg-emerald-500 text-white shadow-md' :
                                                              lvl === 'ME' ? 'bg-blue-600 text-white shadow-md' :
                                                              lvl === 'AE' ? 'bg-amber-500 text-white shadow-md' : 'bg-rose-600 text-white shadow-md'
                                                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {lvl}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 8 CORE VALUES MATRIX SECTION ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Heart className="w-5 h-5 text-rose-500" />
                            <span>2. The 8 Core Values Evaluation</span>
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Evaluate character building, patriotism, integrity, and ethical values.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {CBE_CORE_VALUES.map(val => (
                        <div key={val.id} className="p-4 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-2">
                            <span className="text-2xl block">{val.icon}</span>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{val.name}</h4>
                            <p className="text-[9px] text-slate-400 line-clamp-2">{val.description}</p>

                            {activeStudent && (
                                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-center gap-1">
                                    {(['EE', 'ME', 'AE', 'BE'] as CbeRubricLevel[]).map(lvl => {
                                        const currentData = getStudentData(activeStudent.id);
                                        const currentScore = currentData.values[val.name] || 'ME';
                                        return (
                                            <button
                                                key={lvl}
                                                onClick={() => handleUpdateValue(activeStudent.id, val.name, lvl)}
                                                className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black transition-all cursor-pointer ${
                                                    currentScore === lvl
                                                        ? 'bg-purple-600 text-white shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-900'
                                                }`}
                                            >
                                                {lvl}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── QUALITATIVE TEACHER COMMENT & STUDENT SELECTOR MATRIX ── */}
            {activeStudent && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <span>Qualitative Teacher Remarks for {activeStudent.name} ({activeStudent.admissionNumber || 'ADM'})</span>
                    </h3>

                    <textarea
                        rows={3}
                        value={getStudentData(activeStudent.id).comments}
                        onChange={e => handleUpdateComment(activeStudent.id, e.target.value)}
                        placeholder="Write personalized qualitative remarks on student behavior, digital skills, and core values..."
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            )}
        </div>
    );
};
