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

const defaultDefinitions: GradeDefinition[] = [
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

export const GradingSystemManager: React.FC<GradingSystemManagerProps> = ({ currentInstitution, onUpdateInstitution }) => {
    // Collapsible tree node expand state
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
        'root_main': true,
        'class_form_3': true,
        'class_form_4': true
    });

    // Selected tree node ID
    const [selectedNodeId, setSelectedNodeId] = useState<string>('node_f3_101');

    // Tree nodes grading data dictionary
    const [gradingNodes, setGradingNodes] = useState<Record<string, TreeGradingNode>>({
        'root_main': {
            id: 'root_main',
            label: 'Main grading system (default)',
            title: 'MAIN DEFAULT GRADING SYSTEM',
            type: 'root',
            definitions: defaultDefinitions
        },
        'f3_overall': {
            id: 'f3_overall',
            label: 'Overall',
            title: 'FORM 3 OVERALL',
            type: 'overall',
            classId: 'form_3',
            definitions: defaultDefinitions
        },
        'node_f3_101': {
            id: 'node_f3_101',
            label: '101 English',
            title: 'FORM 3 ENGLISH',
            type: 'subject',
            classId: 'form_3',
            subjectId: '101',
            definitions: defaultDefinitions
        },
        'node_f3_102': {
            id: 'node_f3_102',
            label: '102 Swahili',
            title: 'FORM 3 SWAHILI',
            type: 'subject',
            classId: 'form_3',
            subjectId: '102',
            definitions: defaultDefinitions
        },
        'node_f3_121': {
            id: 'node_f3_121',
            label: '121 MATHS',
            title: 'FORM 3 MATHS',
            type: 'subject',
            classId: 'form_3',
            subjectId: '121',
            definitions: defaultDefinitions
        },
        'node_f3_231': {
            id: 'node_f3_231',
            label: '231 Biology',
            title: 'FORM 3 BIOLOGY',
            type: 'subject',
            classId: 'form_3',
            subjectId: '231',
            definitions: defaultDefinitions
        },
        'node_f3_232': {
            id: 'node_f3_232',
            label: '232 Physics',
            title: 'FORM 3 PHYSICS',
            type: 'subject',
            classId: 'form_3',
            subjectId: '232',
            definitions: defaultDefinitions
        },
        'node_f3_233': {
            id: 'node_f3_233',
            label: '233 Chemistry',
            title: 'FORM 3 CHEMISTRY',
            type: 'subject',
            classId: 'form_3',
            subjectId: '233',
            definitions: defaultDefinitions
        },
        'node_f3_311': {
            id: 'node_f3_311',
            label: '311 History and GOVERNMENT',
            title: 'FORM 3 HISTORY AND GOVERNMENT',
            type: 'subject',
            classId: 'form_3',
            subjectId: '311',
            definitions: defaultDefinitions
        },
        'f4_overall': {
            id: 'f4_overall',
            label: 'Overall',
            title: 'FORM 4 OVERALL',
            type: 'overall',
            classId: 'form_4',
            definitions: defaultDefinitions
        },
        'node_f4_101': {
            id: 'node_f4_101',
            label: '101 English',
            title: 'FORM 4 ENGLISH',
            type: 'subject',
            classId: 'form_4',
            subjectId: '101',
            definitions: defaultDefinitions
        },
        'node_f4_121': {
            id: 'node_f4_121',
            label: '121 MATHS',
            title: 'FORM 4 MATHS',
            type: 'subject',
            classId: 'form_4',
            subjectId: '121',
            definitions: defaultDefinitions
        }
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync saved data from currentInstitution
    useEffect(() => {
        if ((currentInstitution as any)?.treeGradingNodes) {
            setGradingNodes((currentInstitution as any).treeGradingNodes);
        }
    }, [currentInstitution]);

    const activeNode = useMemo(() => {
        return gradingNodes[selectedNodeId] || gradingNodes['node_f3_101'] || gradingNodes['root_main'];
    }, [gradingNodes, selectedNodeId]);

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
                                <div className="pl-4 space-y-1 border-l border-slate-200 dark:border-slate-800 ml-1">
                                    {/* Class: Form 3 */}
                                    <div className="space-y-1">
                                        <div
                                            onClick={() => toggleExpand('class_form_3')}
                                            className="flex items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer py-1 font-bold"
                                        >
                                            {expandedNodes['class_form_3'] ? (
                                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                                            ) : (
                                                <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            <span>Form 3</span>
                                        </div>

                                        {expandedNodes['class_form_3'] && (
                                            <div className="pl-4 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-1">
                                                <div
                                                    onClick={() => setSelectedNodeId('f3_overall')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'f3_overall' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    Overall
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_101')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_101' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    101 English
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_102')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_102' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    102 Swahili
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_121')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_121' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    121 MATHS
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_231')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_231' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    231 Biology
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_232')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_232' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    232 Physics
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_233')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_233' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    233 Chemistry
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f3_311')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f3_311' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    311 History and GOVERNMENT
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Class: Form 4 */}
                                    <div className="space-y-1 pt-1">
                                        <div
                                            onClick={() => toggleExpand('class_form_4')}
                                            className="flex items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer py-1 font-bold"
                                        >
                                            {expandedNodes['class_form_4'] ? (
                                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                                            ) : (
                                                <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            <span>Form 4</span>
                                        </div>

                                        {expandedNodes['class_form_4'] && (
                                            <div className="pl-4 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-1">
                                                <div
                                                    onClick={() => setSelectedNodeId('f4_overall')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'f4_overall' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    Overall
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f4_101')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f4_101' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    101 English
                                                </div>
                                                <div
                                                    onClick={() => setSelectedNodeId('node_f4_121')}
                                                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                        selectedNodeId === 'node_f4_121' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                                                    }`}
                                                >
                                                    121 MATHS
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Grading Table matching screenshot */}
                <div className="md:col-span-3 space-y-4">
                    {/* Header Title with Add New Grade Button */}
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-wider">
                            {activeNode.title}
                        </h3>
                        <button
                            type="button"
                            onClick={handleAddGradeRow}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                        >
                            <PlusIcon className="w-3.5 h-3.5" /> Add New Grade
                        </button>
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
                                {activeNode.definitions.map(g => (
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
