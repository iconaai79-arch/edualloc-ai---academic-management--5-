import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, GradeDefinition, GradingSystem } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { apiService } from '../services/apiService';
import { isSubjectAssignedToClassStream } from '../utils/academicSubjectUtils';
import { extractClassAndStream } from '../utils/academicUtils';

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

    // Memoized so array identity is stable — prevents the sync useEffect from re-running on every render
    const activeDefaultDefinitions = useMemo(
        () => isPrimarySchool ? defaultCbeDefinitions : defaultDefinitions,
        [isPrimarySchool]
    );

    // Class name canonicalization to prevent duplicates like 'pp1' and 'PP1'
    const canonicalizeClassName = (raw: string): string => {
        if (!raw) return '';
        const clean = raw.trim();
        const lower = clean.toLowerCase();

        // Standardize PP1, PP2, Playgroup
        if (lower === 'pp1' || lower === 'pre-primary 1' || lower === 'preprimary 1' || lower === 'pre primary 1' || lower === 'pre-primary1' || lower === 'pre primary1') return 'PP1';
        if (lower === 'pp2' || lower === 'pre-primary 2' || lower === 'preprimary 2' || lower === 'pre primary 2' || lower === 'pre-primary2' || lower === 'pre primary2') return 'PP2';
        if (lower === 'playgroup' || lower === 'play group' || lower === 'daycare' || lower === 'baby class') return 'Playgroup';

        // Standardize Grade X [Stream]
        const gMatch = lower.match(/^(?:grade|std|standard|class)\s*(\d+)(?:\s*(.+))?$/i);
        if (gMatch) {
            const num = gMatch[1];
            const stream = gMatch[2] ? ` ${gMatch[2].trim().toUpperCase()}` : '';
            return `Grade ${num}${stream}`;
        }

        // Standardize Form X [Stream]
        const fMatch = lower.match(/^(?:form)\s*(\d+)(?:\s*(.+))?$/i);
        if (fMatch) {
            const num = fMatch[1];
            const stream = fMatch[2] ? ` ${fMatch[2].trim().toUpperCase()}` : '';
            return `Form ${num}${stream}`;
        }

        if (/^pp\s*1$/i.test(clean)) return 'PP1';
        if (/^pp\s*2$/i.test(clean)) return 'PP2';

        return clean;
    };

    // DB Hydration for classes, courses, levels, exam configs, and allocations
    const [fetchedLevels, setFetchedLevels] = useState<any[]>([]);
    const [fetchedCourses, setFetchedCourses] = useState<any[]>([]);
    const [fetchedEnrollments, setFetchedEnrollments] = useState<any[]>([]);
    const [dbAllocations, setDbAllocations] = useState<Array<{ className: string; subjectName: string; subjectCode?: string }>>([]);
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const instId = currentInstitution?.id || 'default_inst';
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch(e) {}
        return (currentInstitution as any)?.classSubjectAllocations || {};
    });

    const [classExamConfigsStore, setClassExamConfigsStore] = useState<any[]>(() => {
        try {
            const instId = currentInstitution?.id || 'default_inst';
            const saved = localStorage.getItem(`eduai_class_exam_configs_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch(e) {}
        const cConfigs = (currentInstitution as any)?.classExamConfigs || (currentInstitution as any)?.class_exam_configs;
        return Array.isArray(cConfigs) ? cConfigs : [];
    });

    const loadAllAcademicsData = () => {
        if (!currentInstitution?.id) return;
        const instId = currentInstitution.id;

        Promise.all([
            apiService.fetchModuleRecords<any>('academic_levels', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('courses', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('student_enrollments', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('subject_allocations', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('class_subject_allocations', instId).catch(() => []),
            apiService.fetchModuleRecords<any>('class_exam_configs', instId).catch(() => [])
        ]).then(([lvlRecs, courseRecs, enrRecs, allocRecs, classAllocRecs, examConfigRecs]) => {
            if (lvlRecs && lvlRecs.length > 0) setFetchedLevels(lvlRecs);
            if (courseRecs && courseRecs.length > 0) setFetchedCourses(courseRecs);
            if (enrRecs && enrRecs.length > 0) setFetchedEnrollments(enrRecs);

            if (allocRecs && allocRecs.length > 0) {
                setDbAllocations(allocRecs.map((r: any) => ({
                    className: (r.className || '').trim(),
                    subjectName: (r.subjectName || '').toLowerCase().trim(),
                    subjectCode: r.subjectCode || ''
                })));
            }

            const match = (classAllocRecs || []).find(r => r.id === `alloc_${instId}` || r.institutionId === instId);
            if (match && match.allocations) {
                setClassAllocationsStore(prev => ({ ...match.allocations, ...prev }));
            }

            if (examConfigRecs && examConfigRecs.length > 0) {
                setClassExamConfigsStore(examConfigRecs);
            }
        }).catch(() => {});
    };

    useEffect(() => {
        loadAllAcademicsData();

        const handleSync = () => {
            loadAllAcademicsData();
            try {
                const instId = currentInstitution?.id || 'default_inst';
                const savedAlloc = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
                if (savedAlloc) {
                    const parsed = JSON.parse(savedAlloc);
                    if (parsed && typeof parsed === 'object') setClassAllocationsStore(parsed);
                }
                const savedExamConf = localStorage.getItem(`eduai_class_exam_configs_${instId}`);
                if (savedExamConf) {
                    const parsed = JSON.parse(savedExamConf);
                    if (Array.isArray(parsed)) setClassExamConfigsStore(parsed);
                }
            } catch(e) {}
        };

        window.addEventListener('eduai_academics_synced', handleSync);
        return () => window.removeEventListener('eduai_academics_synced', handleSync);
    }, [currentInstitution?.id]);

    // Dynamically compute configured classes from all available sources with case-insensitive canonical deduplication
    const configuredClasses = useMemo(() => {
        const classMap = new Map<string, string>();

        const addClass = (raw: string) => {
            if (!raw || typeof raw !== 'string') return;
            const clean = raw.trim();
            if (!clean || clean.startsWith('lvl_') || clean.startsWith('c_')) return;

            // Ignore standalone stream names without grade prefix
            const standaloneStreams = new Set(['east', 'west', 'north', 'south', 'central', 'red', 'blue', 'green', 'yellow', 'stream a', 'stream b', 'stream c', 'a', 'b', 'c', 'd']);
            if (standaloneStreams.has(clean.toLowerCase())) return;

            const canonical = canonicalizeClassName(clean);
            const key = canonical.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!key) return;

            // Prefer uppercase/capitalized canonical forms
            if (!classMap.has(key) || /^[A-Z]/.test(canonical)) {
                classMap.set(key, canonical);
            }
        };

        // 1. From academicLevels prop & DB
        [...(academicLevels || []), ...fetchedLevels].forEach(l => {
            const name = typeof l === 'string' ? l : (l.name || l.title || l.code);
            if (name) addClass(name);
        });

        // 2. From courses prop & DB
        [...(courses || []), ...fetchedCourses].forEach(c => {
            const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
            if (name) addClass(name);
            if (c.levels && Array.isArray(c.levels)) {
                c.levels.forEach((l: any) => {
                    if (l && l.name) {
                        addClass(`${(c.name || '').trim()} ${l.name.trim()}`);
                    }
                });
            }
        });

        // 3. From users & student enrollments
        [...(users || []), ...fetchedEnrollments].forEach(u => {
            const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).className || (u as any).class || (u as any).grade || u.metadata?.studentClass || u.metadata?.gradeLevel;
            if (cl) addClass(cl);
        });

        // 4. From class_subject_allocations keys
        Object.keys(classAllocationsStore || {}).forEach(k => {
            if (k) addClass(k);
        });

        // 5. From class_exam_configs
        classExamConfigsStore.forEach(conf => {
            if (conf.className) addClass(conf.className);
            if (conf.classId && !conf.classId.startsWith('cls_')) addClass(conf.classId);
        });

        // 6. From DB subject allocations
        dbAllocations.forEach(a => {
            if (a.className) addClass(a.className);
        });

        // 7. Ensure standard Kenya CBC / 8-4-4 grades are available
        const defaultCBC = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
        defaultCBC.forEach(c => addClass(c));

        const validList = Array.from(classMap.values());

        // Sort smartly by grade sequence
        return validList.sort((a, b) => {
            const getRank = (str: string) => {
                const lower = str.toLowerCase();
                if (lower.startsWith('pp1') || lower.startsWith('playgroup')) return 1;
                if (lower.startsWith('pp2')) return 2;
                const gMatch = lower.match(/grade\s*(\d+)/);
                if (gMatch) return 10 + parseInt(gMatch[1], 10);
                const fMatch = lower.match(/form\s*(\d+)/);
                if (fMatch) return 30 + parseInt(fMatch[1], 10);
                return 50;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
        });
    }, [academicLevels, fetchedLevels, courses, fetchedCourses, users, fetchedEnrollments, classAllocationsStore, classExamConfigsStore, dbAllocations]);

    // Collapsible tree node expand state
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = { 'root_main': true };
        configuredClasses.forEach(c => {
            const classKey = `class_${c.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            initial[classKey] = true;
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

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Per-class subject resolver with STRICT allocation precedence:
    // 1. If Exam Paper Configs exist for this class (from Subjects Papers), return exact configured subjects & papers.
    // 2. Else if Subject Allocations exist for this class (from Class Subject Allocation Manager), return only allocated subjects.
    // 3. Else if DB subject_allocations exist, return only those.
    // 4. Else if subjects have explicit targetClasses matching this class, return only those.
    // 5. Fallback only if no explicit allocations exist at all.
    const getSubjectsForClass = useMemo(() => {
        return (cName: string): Array<{ name: string; code: string; paperName?: string }> => {
            const seenKeys = new Set<string>();
            const result: Array<{ name: string; code: string; paperName?: string }> = [];
            const clsClean = (cName || '').trim();
            const clsLower = clsClean.toLowerCase();
            const clsNorm = clsLower.replace(/[^a-z0-9]/g, '');

            const addEntry = (name: string, code: string = '', paperName?: string) => {
                const trimmedName = (name || '').trim();
                if (!trimmedName) return;
                const uniqueKey = `${trimmedName.toLowerCase()}_${(paperName || '').toLowerCase()}`;
                if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    result.push({
                        name: trimmedName,
                        code: code || '',
                        paperName
                    });
                }
            };

            // --- PRIORITY 1: From classExamConfigsStore (Subjects Papers / Exam Paper Configs) ---
            const matchedExamConf = classExamConfigsStore.find(conf => {
                if (!conf) return false;
                const confNameNorm = (conf.className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const confIdNorm = (conf.classId || '').toLowerCase().replace(/^cls_/, '').replace(/[^a-z0-9]/g, '');
                return confNameNorm === clsNorm || confIdNorm === clsNorm;
            });

            if (matchedExamConf && Array.isArray(matchedExamConf.subjects) && matchedExamConf.subjects.length > 0) {
                matchedExamConf.subjects.forEach((s: any) => {
                    const sName = s.subjectName || s.name || '';
                    const sCode = s.subjectCode || s.code || '';
                    if (Array.isArray(s.papers) && s.papers.length > 1) {
                        s.papers.forEach((p: any, pIdx: number) => {
                            const pName = p.name || `Paper ${pIdx + 1}`;
                            addEntry(`${sName} - ${pName}`, sCode, pName);
                        });
                    } else if (Array.isArray(s.papers) && s.papers.length === 1) {
                        const pName = s.papers[0].name || '';
                        addEntry(pName && pName !== 'Paper 1' ? `${sName} (${pName})` : sName, sCode);
                    } else {
                        addEntry(sName, sCode);
                    }
                });

                if (result.length > 0) return result;
            }

            // --- PRIORITY 2: From classAllocationsStore (Subject Allocation Manager) ---
            const baseCls = extractClassAndStream(clsName).className;
            const baseClsNorm = (baseCls || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const allocKey = Object.keys(classAllocationsStore || {}).find(k => {
                const kNorm = (k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return kNorm === clsNorm || k.toLowerCase().trim() === clsLower || (baseClsNorm && kNorm === baseClsNorm);
            });

            const storedAllocations = allocKey ? classAllocationsStore[allocKey] : null;
            if (Array.isArray(storedAllocations) && storedAllocations.length > 0) {
                storedAllocations.forEach(subIdentifier => {
                    if (!subIdentifier) return;
                    const cleanSubId = String(subIdentifier).trim();
                    const matchedSub = (subjects || []).find((s: any) =>
                        s.id === cleanSubId ||
                        (s.name || '').toLowerCase().trim() === cleanSubId.toLowerCase() ||
                        (s.code || '').toLowerCase().trim() === cleanSubId.toLowerCase()
                    );
                    const finalName = matchedSub?.name || cleanSubId;
                    const finalCode = matchedSub?.code || '';

                    if (matchedSub && Array.isArray((matchedSub as any).papers) && (matchedSub as any).papers.length > 1) {
                        (matchedSub as any).papers.forEach((p: any, pIdx: number) => {
                            const pName = p.name || `Paper ${pIdx + 1}`;
                            addEntry(`${finalName} - ${pName}`, finalCode, pName);
                        });
                    } else {
                        addEntry(finalName, finalCode);
                    }
                });

                if (result.length > 0) return result;
            }

            // --- PRIORITY 3: From DB subject_allocations records ---
            const dbMatches = dbAllocations.filter(a => {
                const dbNorm = (a.className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return dbNorm === clsNorm || a.className.toLowerCase().trim() === clsLower;
            });

            if (dbMatches.length > 0) {
                dbMatches.forEach(a => {
                    if (a.subjectName) {
                        const matched = (subjects || []).find((s: any) =>
                            (s.name || '').toLowerCase().trim() === a.subjectName.toLowerCase().trim()
                        );
                        addEntry(matched?.name || a.subjectName, a.subjectCode || matched?.code || '');
                    }
                });
                if (result.length > 0) return result;
            }

            // --- PRIORITY 4: From subjects with explicit targetClasses matching this class ---
            const explicitTargetSubjects = (subjects || []).filter((s: any) => {
                const targetCls = s.targetClasses || s.assignedClasses || s.classes;
                if (Array.isArray(targetCls) && targetCls.length > 0) {
                    return targetCls.some((tc: string) => {
                        const tcNorm = (tc || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        return tcNorm === clsNorm || tc.toLowerCase().trim() === clsLower;
                    });
                }
                return false;
            });

            if (explicitTargetSubjects.length > 0) {
                explicitTargetSubjects.forEach((s: any) => {
                    const sName = (s.name || s.title || '').trim();
                    addEntry(sName, s.code || '');
                });
                if (result.length > 0) return result;
            }

            // --- PRIORITY 5: Fallback only if NO explicit allocations exist ---
            (subjects || []).forEach((s: any) => {
                const sName = (s.name || s.title || '').trim();
                if (sName && isSubjectAssignedToClassStream(s, cName, courses)) {
                    addEntry(sName, s.code || '');
                }
            });

            return result;
        };
    }, [subjects, courses, dbAllocations, classAllocationsStore, classExamConfigsStore]);

    const loadedInstIdRef = React.useRef<string | null>(null);

    // Sync saved data from currentInstitution ONCE when institution ID changes, without wiping local edits on re-render
    useEffect(() => {
        const instId = currentInstitution?.id || 'default';
        const savedNodes = (currentInstitution as any)?.treeGradingNodes;
        
        if (loadedInstIdRef.current !== instId) {
            loadedInstIdRef.current = instId;
            if (savedNodes && Object.keys(savedNodes).length > 0) {
                setGradingNodes(savedNodes);
                return;
            }
        }

        setGradingNodes(prev => {
            const base = { ...prev };
            
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
    }, [currentInstitution?.id, isPrimarySchool, configuredClasses]);

    // Active Node memoized helper
    const activeNode = useMemo((): TreeGradingNode => {
        if (gradingNodes[selectedNodeId]) return gradingNodes[selectedNodeId];
        
        let label = 'Grading System';
        let title = 'GRADING SYSTEM';
        let type: 'root' | 'class' | 'overall' | 'subject' = 'overall';

        if (selectedNodeId === 'root_main') {
            label = 'Main grading system (default)';
            title = `MAIN DEFAULT GRADING SYSTEM (${isPrimarySchool ? 'CBE 4-Level' : '8-4-4 12-Point'})`;
            type = 'root';
        } else if (selectedNodeId.endsWith('_overall')) {
            const classPart = selectedNodeId.replace(/^class_/, '').replace(/_overall$/, '').replace(/_/g, ' ');
            label = `${classPart.toUpperCase()} Overall`;
            title = `${classPart.toUpperCase()} OVERALL GRADING SYSTEM`;
            type = 'overall';
        } else if (selectedNodeId.includes('_sub_')) {
            const parts = selectedNodeId.split('_sub_');
            const classPart = parts[0].replace(/^class_/, '').replace(/_/g, ' ').toUpperCase();
            const subPart = parts[1] ? parts[1].replace(/_/g, ' ').toUpperCase() : 'SUBJECT';
            label = `${subPart} (${classPart})`;
            title = `${classPart} - ${subPart} GRADING SYSTEM`;
            type = 'subject';
        } else if (selectedNodeId.startsWith('node_custom_')) {
            label = 'Custom Grading System';
            title = 'CUSTOM GRADING SYSTEM';
            type = 'overall';
        }

        return {
            id: selectedNodeId,
            label,
            title,
            type,
            definitions: activeDefaultDefinitions
        };
    }, [gradingNodes, selectedNodeId, isPrimarySchool, activeDefaultDefinitions]);

    const toggleExpand = (key: string) => {
        setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Grade row value changes
    const handleGradeRowChange = (gradeId: string, field: keyof GradeDefinition, value: any) => {
        setGradingNodes(prev => {
            const currentNode = prev[selectedNodeId] || activeNode;
            const updatedDefs = currentNode.definitions.map(g => {
                if (g.id === gradeId) {
                    return { ...g, [field]: value };
                }
                return g;
            });

            return {
                ...prev,
                [selectedNodeId]: {
                    ...currentNode,
                    id: selectedNodeId,
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
            const currentNode = prev[selectedNodeId] || activeNode;
            return {
                ...prev,
                [selectedNodeId]: {
                    ...currentNode,
                    id: selectedNodeId,
                    definitions: [...currentNode.definitions, newGradeObj]
                }
            };
        });
    };

    // Delete grade row
    const handleDeleteGradeRow = (gradeId: string) => {
        setGradingNodes(prev => {
            const currentNode = prev[selectedNodeId] || activeNode;
            return {
                ...prev,
                [selectedNodeId]: {
                    ...currentNode,
                    id: selectedNodeId,
                    definitions: currentNode.definitions.filter(g => g.id !== gradeId)
                }
            };
        });
    };

    // Add New Custom Grading System handler
    const handleAddNewGradingSystem = () => {
        const name = prompt('Enter New Grading System Name:');
        if (!name || !name.trim()) return;

        const newId = `node_custom_${Date.now()}`;
        const newNode: TreeGradingNode = {
            id: newId,
            label: name.trim(),
            title: name.trim().toUpperCase(),
            type: 'overall',
            definitions: [...activeDefaultDefinitions]
        };

        setGradingNodes(prev => ({
            ...prev,
            [newId]: newNode
        }));
        setSelectedNodeId(newId);
    };

    // Save changes
    const handleSaveGradingNodes = async () => {
        if (!currentInstitution) {
            alert('No institution context found. Please refresh and try again.');
            return;
        }
        setSaveStatus('saving');
        try {
            // Update local memory reference immediately
            (currentInstitution as any).treeGradingNodes = gradingNodes;
            (currentInstitution as any).tree_grading_nodes = gradingNodes;

            if (onUpdateInstitution) {
                // Preferred path: use the parent-provided updater
                await onUpdateInstitution(currentInstitution.id, {
                    treeGradingNodes: gradingNodes,
                    tree_grading_nodes: gradingNodes
                } as any);
            } else {
                // Fallback: save directly via apiService when the prop chain is broken
                await apiService.saveInstitution({
                    ...currentInstitution,
                    treeGradingNodes: gradingNodes,
                    tree_grading_nodes: gradingNodes
                } as any);
            }
            try {
                localStorage.setItem(`eduai_tree_grading_nodes_${currentInstitution.id}`, JSON.stringify(gradingNodes));
                window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'grading', instId: currentInstitution.id } }));
            } catch(e) {}

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('[GradingSystemManager] Failed to save grading systems:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
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
                    {saveStatus === 'saving' ? 'Saving Grading Rules...' : saveStatus === 'saved' ? '✓ Grading System Saved!' : saveStatus === 'error' ? '✗ Save Failed — Retry' : 'Save Grading Boundaries'}
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
                                if (selectedNodeId === 'root_main') {
                                    if (confirm('Reset Main Default Grading System boundaries to standard defaults?')) {
                                        setGradingNodes(prev => ({
                                            ...prev,
                                            root_main: {
                                                id: 'root_main',
                                                label: 'Main grading system (default)',
                                                title: `MAIN DEFAULT GRADING SYSTEM (${isPrimarySchool ? 'CBE 4-Level' : '8-4-4 12-Point'})`,
                                                type: 'root',
                                                definitions: [...activeDefaultDefinitions]
                                            }
                                        }));
                                    }
                                    return;
                                }

                                if (confirm(`Are you sure you want to delete "${activeNode.label}" grading system node?`)) {
                                    setGradingNodes(prev => {
                                        const copy = { ...prev };
                                        delete copy[selectedNodeId];
                                        return copy;
                                    });
                                    setSelectedNodeId('root_main');
                                }
                            }}
                            className="py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-red-600 dark:text-red-400 font-bold text-xs rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-center"
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
                                                        {getSubjectsForClass(cName).map(s => {
                                                            const subName = s.name;
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

                        {/* Custom Grading Systems section if any custom systems created */}
                        {Object.values(gradingNodes).some(n => n.id.startsWith('node_custom_')) && (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
                                <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500 px-1 pb-1">
                                    Custom Grading Systems
                                </div>
                                {Object.values(gradingNodes)
                                    .filter(n => n.id.startsWith('node_custom_'))
                                    .map(cn => (
                                        <div
                                            key={cn.id}
                                            onClick={() => setSelectedNodeId(cn.id)}
                                            className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                                                selectedNodeId === cn.id ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50'
                                            }`}
                                        >
                                            {cn.label}
                                        </div>
                                    ))}
                            </div>
                        )}
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
                                            ...activeNode,
                                            id: selectedNodeId,
                                            definitions: [...defaultCbeDefinitions]
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
                                            ...activeNode,
                                            id: selectedNodeId,
                                            definitions: [...defaultDefinitions]
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
