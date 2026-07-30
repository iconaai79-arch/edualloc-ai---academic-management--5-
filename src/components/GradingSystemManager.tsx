import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, GradeDefinition, GradingSystem } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface GradingSystemManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    courses?: any[];
    users?: any[];
    subjects?: any[];
    academicLevels?: any[];
}

export interface TreeGradingNode {
    id: string;
    label: string; // e.g. "Main grading system (default)", "Form 3", "Overall", "101 English"
    title: string; // e.g. "FORM 3 ENGLISH"
    type: 'root' | 'class' | 'overall' | 'subject';
    classId?: string;
    subjectId?: string;
    definitions: GradeDefinition[];
}

export const defaultCbeDefinitions: GradeDefinition[] = [
    { id: 'g_ee', grade: 'EE', minScore: 80, maxScore: 100, points: 4.0, comment: 'Exceeding Expectations (EE)' },
    { id: 'g_me', grade: 'ME', minScore: 65, maxScore: 79, points: 3.0, comment: 'Meeting Expectations (ME)' },
    { id: 'g_ae', grade: 'AE', minScore: 50, maxScore: 64, points: 2.0, comment: 'Approaching Expectations (AE)' },
    { id: 'g_be', grade: 'BE', minScore: 0, maxScore: 49, points: 1.0, comment: 'Below Expectations (BE)' }
];

export const defaultDefinitions: GradeDefinition[] = [
    { id: 'g_a', grade: 'A', minScore: 80, maxScore: 100, points: 12.0, comment: 'EXCELLENT' },
    { id: 'g_a_minus', grade: 'A-', minScore: 75, maxScore: 79, points: 11.0, comment: 'EXCELLENT' },
    { id: 'g_b_plus', grade: 'B+', minScore: 70, maxScore: 74, points: 10.0, comment: 'VERY GOOD' },
    { id: 'g_b', grade: 'B', minScore: 65, maxScore: 69, points: 9.0, comment: 'VERY GOOD' },
    { id: 'g_b_minus', grade: 'B-', minScore: 60, maxScore: 64, points: 8.0, comment: 'GOOD' },
    { id: 'g_c_plus', grade: 'C+', minScore: 55, maxScore: 59, points: 7.0, comment: 'AVERAGE' },
    { id: 'g_c', grade: 'C', minScore: 50, maxScore: 54, points: 6.0, comment: 'AVERAGE' },
    { id: 'g_c_minus', grade: 'C-', minScore: 45, maxScore: 49, points: 5.0, comment: 'AVERAGE' },
    { id: 'g_d_plus', grade: 'D+', minScore: 40, maxScore: 44, points: 4.0, comment: 'PUT MORE EFFORT' },
    { id: 'g_d', grade: 'D', minScore: 35, maxScore: 39, points: 3.0, comment: 'POOR' },
    { id: 'g_d_minus', grade: 'D-', minScore: 30, maxScore: 34, points: 2.0, comment: 'POOR' },
    { id: 'g_e', grade: 'E', minScore: 0, maxScore: 29, points: 1.0, comment: 'VERY POOR' }
];

export const GradingSystemManager: React.FC<GradingSystemManagerProps> = ({ 
    currentInstitution, 
    onUpdateInstitution,
    courses = [],
    users = [],
    subjects = [],
    academicLevels = []
}) => {
    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || type === 'primary_school' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution]);

    const activeDefaultDefinitions = isPrimarySchool ? defaultCbeDefinitions : defaultDefinitions;

    // Dynamically compute configured classes from all available sources
    const configuredClasses = useMemo(() => {
        const set = new Set<string>();

        // 1. From academicLevels prop
        if (academicLevels && academicLevels.length > 0) {
            academicLevels.forEach(l => {
                const name = typeof l === 'string' ? l : (l.name || l.title || l.code);
                if (name) set.add(name);
            });
        }

        // 2. From courses prop
        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
                if (name) set.add(name);
            });
        }

        // 3. From users prop
        if (users && users.length > 0) {
            users.forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    set.add(cl.trim());
                }
            });
        }

        // 4. From currentInstitution object properties
        if (currentInstitution) {
            if ((currentInstitution as any).classes && Array.isArray((currentInstitution as any).classes)) {
                (currentInstitution as any).classes.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : c.name;
                    if (name) set.add(name);
                });
            }
            if ((currentInstitution as any).courses && Array.isArray((currentInstitution as any).courses)) {
                (currentInstitution as any).courses.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : (c.name || c.title);
                    if (name) set.add(name);
                });
            }
        }

        // 5. From LocalStorage cached registered classes
        try {
            const instId = currentInstitution?.id || 'default_inst';
            const savedClasses = localStorage.getItem(`eduai_registered_classes_${instId}`);
            if (savedClasses) {
                const parsed = JSON.parse(savedClasses);
                if (Array.isArray(parsed)) parsed.forEach(c => set.add(c));
            }
        } catch(e) {}

        // 6. Fallback defaults if no custom classes registered yet
        if (set.size === 0) {
            if (isPrimarySchool) {
                ['Grade 1 Central', 'Grade 2 Central', 'Grade 3 Central', 'Grade 4 Central', 'Grade 5 Central', 'Grade 6 Central', 'Grade 7 Central', 'Grade 8 Central'].forEach(c => set.add(c));
            } else {
                ['Form 1 Central', 'Form 2 Central', 'Form 3 Central', 'Form 4 Central'].forEach(c => set.add(c));
            }
        }

        const standaloneStreams = new Set(['east', 'west', 'north', 'south', 'central', 'red', 'blue', 'green', 'yellow', 'stream a', 'stream b', 'stream c']);
        return Array.from(set).filter(cName => !standaloneStreams.has(cName.trim().toLowerCase()));
    }, [academicLevels, courses, users, currentInstitution, isPrimarySchool]);

    // Collapsible tree node expand state
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = { 'root_main': true };
        configuredClasses.forEach(c => {
            initial[`class_${c}`] = true;
        });
        return initial;
    });

    // Selected tree node ID
    const [selectedNodeId, setSelectedNodeId] = useState<string>('root_main');

    // Tree nodes grading data dictionary
    const [gradingNodes, setGradingNodes] = useState<Record<string, TreeGradingNode>>(() => {
        const initialNodes: Record<string, TreeGradingNode> = {
            'root_main': {
                id: 'root_main',
                label: `Main grading system (default)`,
                title: `MAIN DEFAULT GRADING SYSTEM (${isPrimarySchool ? 'CBE 4-Level' : '8-4-4 12-Point'})`,
                type: 'root',
                definitions: activeDefaultDefinitions
            }
        };

        configuredClasses.forEach(cName => {
            const classKey = `class_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            initialNodes[`${classKey}_overall`] = {
                id: `${classKey}_overall`,
                label: `${cName} Overall`,
                title: `${cName.toUpperCase()} OVERALL GRADING SYSTEM`,
                type: 'overall',
                classId: cName,
                definitions: activeDefaultDefinitions
            };
        });

        return initialNodes;
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync saved data from currentInstitution AND dynamically populate configuredClasses nodes
    useEffect(() => {
        const savedNodes = (currentInstitution as any)?.treeGradingNodes;
        
        setGradingNodes(prev => {
            const base = (savedNodes && Object.keys(savedNodes).length > 0) ? { ...savedNodes } : { ...prev };
            
            if (!base['root_main']) {
                base['root_main'] = {
                    id: 'root_main',
                    label: 'Main grading system (default)',
                    title: `MAIN DEFAULT GRADING SYSTEM (${isPrimarySchool ? 'CBE 4-Level' : '8-4-4 12-Point'})`,
                    type: 'root',
                    definitions: activeDefaultDefinitions
                };
            }

            configuredClasses.forEach(cName => {
                const classKey = `class_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                const overallId = `${classKey}_overall`;

                if (!base[overallId]) {
                    base[overallId] = {
                        id: overallId,
                        label: `${cName} Overall`,
                        title: `${cName.toUpperCase()} OVERALL GRADING SYSTEM`,
                        type: 'overall',
                        classId: cName,
                        definitions: activeDefaultDefinitions
                    };
                }
            });

            return base;
        });
    }, [currentInstitution, configuredClasses, isPrimarySchool, activeDefaultDefinitions]);

    const activeNode = useMemo(() => {
        if (gradingNodes[selectedNodeId]) return gradingNodes[selectedNodeId];
        const firstClassKey = configuredClasses[0] ? `class_${configuredClasses[0].toLowerCase().replace(/[^a-z0-9]/g, '_')}_overall` : null;
        if (firstClassKey && gradingNodes[firstClassKey]) return gradingNodes[firstClassKey];
        if (gradingNodes['root_main']) return gradingNodes['root_main'];
        return Object.values(gradingNodes)[0] || {
            id: 'root_main',
            label: 'Main grading system (default)',
            title: `MAIN DEFAULT GRADING SYSTEM (${isPrimarySchool ? 'CBE 4-Level' : '8-4-4 12-Point'})`,
            type: 'root' as const,
            definitions: activeDefaultDefinitions
        };
    }, [gradingNodes, selectedNodeId, configuredClasses, isPrimarySchool, activeDefaultDefinitions]);

    const toggleExpand = (key: string) => {
        setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Grade row value changes
    const handleGradeRowChange = (gradeId: string, field: keyof GradeDefinition, value: any) => {
        setGradingNodes(prev => {
            const target = prev[selectedNodeId] || prev['node_f3_101'];
            if (!target) return prev;

            const updatedDefs = target.definitions.map(g => {
                if (g.id === gradeId) {
                    return { ...g, [field]: value };
                }
                return g;
            });

            return {
                ...prev,
                [selectedNodeId]: {
                    ...target,
                    definitions: updatedDefs
                }
            };
        });
    };

    // Add new grade row
    const handleAddGradeRow = () => {
        const newGradeObj: GradeDefinition = {
            id: `g_${Date.now()}`,
            grade: 'C',
            points: 6.0,
            minScore: 50,
            maxScore: 54,
            comment: 'AVERAGE'
        };

        setGradingNodes(prev => {
            const target = prev[selectedNodeId] || prev['node_f3_101'];
            if (!target) return prev;
            return {
                ...prev,
                [selectedNodeId]: {
                    ...target,
                    definitions: [...target.definitions, newGradeObj]
                }
            };
        });
    };

    // Delete grade row
    const handleDeleteGradeRow = (gradeId: string) => {
        setGradingNodes(prev => {
            const target = prev[selectedNodeId] || prev['node_f3_101'];
            if (!target) return prev;
            return {
                ...prev,
                [selectedNodeId]: {
                    ...target,
                    definitions: target.definitions.filter(g => g.id !== gradeId)
                }
            };
        });
    };

    // Add New Grading System handler
    const handleAddNewGradingSystem = () => {
        const name = prompt('Enter New Grading System Name:');
        if (!name || !name.trim()) return;

        const newId = `node_custom_${Date.now()}`;
        const newNode: TreeGradingNode = {
            id: newId,
            label: name.trim(),
            title: name.trim().toUpperCase(),
            type: 'overall',
            definitions: defaultDefinitions
        };

        setGradingNodes(prev => ({
            ...prev,
            [newId]: newNode
        }));
        setSelectedNodeId(newId);
    };

    // Save changes
    const handleSaveGradingNodes = async () => {
        if (!currentInstitution || !onUpdateInstitution) return;
        setSaveStatus('saving');
        try {
            await onUpdateInstitution(currentInstitution.id, {
                treeGradingNodes: gradingNodes
            } as any);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('[GradingSystemManager] Failed to save grading systems:', err);
            setSaveStatus('idle');
        }
    };

    return (
        <div className="space-y-4 animate-fade-in max-w-6xl">
            {/* Top Bar: New Grading System Primary Blue Button */}
            <div className="flex justify-between items-center pb-2">
                <button
                    type="button"
                    onClick={handleAddNewGradingSystem}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                    New Grading System
                </button>

                <button
                    type="button"
                    onClick={handleSaveGradingNodes}
                    disabled={saveStatus === 'saving'}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                >
                    {saveStatus === 'saving' ? 'Saving Grading Rules...' : saveStatus === 'saved' ? 'Grading System Saved!' : 'Save Grading Boundaries'}
                </button>
            </div>

            {/* Main Layout Grid matching screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {/* Left Panel: Tree Structure */}
                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-3 p-3">
                    {/* Action Buttons: Edit | Delete */}
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                const newLabel = prompt('Rename selected grading system:', activeNode.label);
                                if (newLabel && newLabel.trim()) {
                                    setGradingNodes(prev => ({
                                        ...prev,
                                        [selectedNodeId]: { ...activeNode, label: newLabel.trim(), title: newLabel.trim().toUpperCase() }
                                    }));
                                }
                            }}
                            className="py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this grading system node?')) {
                                    setGradingNodes(prev => {
                                        const copy = { ...prev };
                                        delete copy[selectedNodeId];
                                        return copy;
                                    });
                                    setSelectedNodeId('node_f3_101');
                                }
                            }}
                            className="py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center"
                        >
                            Delete
                        </button>
                    </div>

                    {/* Tree Hierarchy */}
                    <div className="space-y-1 select-none text-xs font-medium">
                        {/* Root Node: Main grading system (default) */}
                        <div className="space-y-1">
                            <div
                                onClick={() => toggleExpand('root_main')}
                                className="flex items-center gap-1 text-slate-800 dark:text-slate-200 cursor-pointer py-1 font-bold"
                            >
                                {expandedNodes['root_main'] ? (
                                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                    <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <span>Main grading system (default)</span>
                            </div>

                            {expandedNodes['root_main'] && (
                                <div className="pl-4 space-y-2 border-l border-slate-200 dark:border-slate-800 ml-1 pt-1">
                                    {configuredClasses.map(cName => {
                                        const classKey = `class_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                                        const isExp = expandedNodes[classKey] ?? true;
                                        const overallNodeId = `${classKey}_overall`;

                                        return (
                                            <div key={classKey} className="space-y-1">
                                                <div
                                                    onClick={() => toggleExpand(classKey)}
                                                    className="flex items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer py-1 font-bold hover:text-blue-600"
                                                >
                                                    {isExp ? (
                                                        <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                                                    ) : (
                                                        <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                                                    )}
                                                    <span>{cName}</span>
                                                </div>

                                                {isExp && (
                                                    <div className="pl-4 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-1">
                                                        <div
                                                            onClick={() => setSelectedNodeId(overallNodeId)}
                                                            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                                selectedNodeId === overallNodeId ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                            }`}
                                                        >
                                                            Overall
                                                        </div>
                                                        {(subjects || []).map(s => {
                                                            const subName = s.name || s.title || s;
                                                            const subCode = s.code || '';
                                                            const subNodeId = `${classKey}_sub_${(subName || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                                                            return (
                                                                <div
                                                                    key={subNodeId}
                                                                    onClick={() => setSelectedNodeId(subNodeId)}
                                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                                        selectedNodeId === subNodeId ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                                    }`}
                                                                >
                                                                    {subCode ? `${subCode} ` : ''}{subName}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Grading Table matching screenshot */}
                <div className="md:col-span-3 space-y-4">
                    {/* Header Title with Add New Grade & Preload Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-wider">
                                {activeNode?.title || 'OVERALL GRADING SYSTEM'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {isPrimarySchool ? '🎯 CBE Primary 4-Level Standards' : '📜 8-4-4 KCSE 12-Point Standards'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    setGradingNodes(prev => ({
                                        ...prev,
                                        [selectedNodeId]: {
                                            ...(prev[selectedNodeId] || activeNode),
                                            definitions: defaultCbeDefinitions
                                        }
                                    }));
                                }}
                                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                                title="Pre-load CBE 4-Level Grading (EE, ME, AE, BE) with Comments"
                            >
                                Preload CBE Primary (EE/ME/AE/BE)
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setGradingNodes(prev => ({
                                        ...prev,
                                        [selectedNodeId]: {
                                            ...(prev[selectedNodeId] || activeNode),
                                            definitions: defaultDefinitions
                                        }
                                    }));
                                }}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer"
                                title="Pre-load 8-4-4 KCSE 12-Point Grading (A to E) with Comments"
                            >
                                Preload 8-4-4 KCSE (A to E)
                            </button>

                            <button
                                type="button"
                                onClick={handleAddGradeRow}
                                className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                            >
                                <PlusIcon className="w-3.5 h-3.5" /> Add Grade
                            </button>
                        </div>
                    </div>

                    {/* Table matching screenshot */}
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold w-24">Grade</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold w-24">Points</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold w-24">Minimum</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold w-24">Maximum</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold">Comment</th>
                                    <th className="px-4 py-3 text-center w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {(activeNode?.definitions || []).map(g => (
                                    <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        {/* Grade Input */}
                                        <td className="px-4 py-2.5">
                                            <input
                                                type="text"
                                                value={g.grade}
                                                onChange={e => handleGradeRowChange(g.id, 'grade', e.target.value)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                                            />
                                        </td>

                                        {/* Points Input */}
                                        <td className="px-4 py-2.5">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={g.points}
                                                onChange={e => handleGradeRowChange(g.id, 'points', parseFloat(e.target.value) || 0)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                                            />
                                        </td>

                                        {/* Minimum Input */}
                                        <td className="px-4 py-2.5">
                                            <input
                                                type="number"
                                                value={g.minScore}
                                                onChange={e => handleGradeRowChange(g.id, 'minScore', parseInt(e.target.value) || 0)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                                            />
                                        </td>

                                        {/* Maximum Input */}
                                        <td className="px-4 py-2.5">
                                            <input
                                                type="number"
                                                value={g.maxScore}
                                                onChange={e => handleGradeRowChange(g.id, 'maxScore', parseInt(e.target.value) || 0)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                                            />
                                        </td>

                                        {/* Comment Input */}
                                        <td className="px-6 py-2.5">
                                            <input
                                                type="text"
                                                value={g.comment || ''}
                                                onChange={e => handleGradeRowChange(g.id, 'comment', e.target.value)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                                                placeholder="Comment e.g. EXCELLENT"
                                            />
                                        </td>

                                        {/* Delete Icon Button */}
                                        <td className="px-4 py-2.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteGradeRow(g.id)}
                                                className="p-1.5 text-blue-600 hover:text-red-600 transition-colors"
                                                title="Delete grade row"
                                            >
                                                <XIcon className="w-4 h-4 stroke-[2.5]" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
