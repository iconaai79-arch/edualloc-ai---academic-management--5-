import React, { useState, useMemo, useEffect } from 'react';
import type { Subject, Course, Institution, Department } from '../types';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { apiService } from '../services/apiService';
import { isSubjectApplicableToClass, isSubjectAssignedToClassStream } from '../utils/academicSubjectUtils';
import { extractClassAndStream, naturalClassSort } from '../utils/academicUtils';

interface ClassSubjectAllocationModalProps {
    onClose: () => void;
    subjects: Subject[];
    courses: Course[];
    classOptions: string[];
    departments?: Department[];
    currentInstitution?: Institution | null;
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    onAddSubject?: (newSubject: Omit<Subject, 'id' | 'institutionId'>, initialCourseLevelIds?: string[]) => void;
    onDeleteSubject?: (subjectId: string) => void;
}

export const ClassSubjectAllocationModal: React.FC<ClassSubjectAllocationModalProps> = ({
    onClose,
    subjects = [],
    courses = [],
    classOptions = [],
    departments = [],
    currentInstitution,
    onUpdateSubject,
    onUpdateCourse,
    onAddSubject,
    onDeleteSubject
}) => {
    // Normalize and deduplicate class options so they represent pure classes / grades (not individual streams)
    const effectiveClassOptions = useMemo<string[]>(() => {
        const set = new Set<string>();
        (classOptions || []).forEach(c => {
            if (!c) return;
            const parsed = extractClassAndStream(c);
            const base = (parsed.className || c).trim();
            if (base) set.add(base);
        });
        (courses || []).forEach(c => {
            const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
            if (name) {
                const parsed = extractClassAndStream(name);
                const base = (parsed.className || name).trim();
                if (base) set.add(base);
            }
        });
        const standaloneStreams = new Set(['east', 'west', 'north', 'south', 'central', 'red', 'blue', 'green', 'yellow', 'stream a', 'stream b', 'stream c']);
        const cleaned = Array.from(set).filter(cName => !standaloneStreams.has(cName.trim().toLowerCase()));
        return (naturalClassSort(cleaned) || []) as string[];
    }, [classOptions, courses]);

    const [selectedClass, setSelectedClass] = useState<string>(() => {
        if (classOptions.length > 0) {
            const parsed = extractClassAndStream(classOptions[0]);
            return (parsed.className || classOptions[0]).trim();
        }
        return 'Grade 1';
    });
    const [selectedStream, setSelectedStream] = useState<string>('all');
    const [customStreamInput, setCustomStreamInput] = useState<string>('');
    const [isAddingCustomStream, setIsAddingCustomStream] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [copyFromClass, setCopyFromClass] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        departmentId: '',
        periodsPerWeek: 4
    });

    useEffect(() => {
        setLocalSubjects(subjects);
    }, [subjects]);

    const instId = currentInstitution?.id || 'default_inst';
    const classAllocKey = `eduai_class_subject_allocations_${instId}`;

    // Allocations store: Record<className, string[] (array of active subjectIds or subjectNames)>
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${currentInstitution?.id || 'default_inst'}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch(e) {}
        return (currentInstitution as any)?.classSubjectAllocations || {};
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id)
                .then(records => {
                    const match = (records || []).find(r => r.id === `alloc_${currentInstitution.id}` || r.institutionId === currentInstitution.id);
                    if (match && match.allocations) {
                        setClassAllocationsStore(prev => {
                            const merged = { ...match.allocations, ...prev };
                            try {
                                localStorage.setItem(`eduai_class_subject_allocations_${currentInstitution.id}`, JSON.stringify(merged));
                            } catch(e) {}
                            return merged;
                        });
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution]);

    const saveClassAllocationsStore = async (updatedStore: Record<string, string[]>) => {
        setClassAllocationsStore(updatedStore);
        try {
            localStorage.setItem(classAllocKey, JSON.stringify(updatedStore));
        } catch(e) {}
        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('class_subject_allocations', {
                id: `alloc_${currentInstitution.id}`,
                institutionId: currentInstitution.id,
                allocations: updatedStore
            }).catch(() => {});
        }
        try {
            window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'allocations', instId } }));
        } catch(e) {}
    };

    // Available streams for the currently selected class
    const availableStreamsForClass = useMemo<string[]>(() => {
        const set = new Set<string>();
        const targetClean = selectedClass.trim().toLowerCase();

        (courses || []).forEach((c: any) => {
            const cName = typeof c === 'string' ? c : (c.name || c.title || c.code || '');
            const parsed = extractClassAndStream(cName);
            const baseName = (parsed.className || cName).trim().toLowerCase();

            if (baseName === targetClean) {
                if (Array.isArray(c.levels)) {
                    c.levels.forEach((l: any) => {
                        const lName = String(l.name || '').trim();
                        if (lName) {
                            if (lName.toLowerCase().startsWith(baseName)) {
                                set.add(lName);
                            } else {
                                set.add(`${selectedClass} ${lName}`);
                            }
                        }
                    });
                }
            }
        });

        (classOptions || []).forEach((co: string) => {
            const parsed = extractClassAndStream(co);
            if ((parsed.className || '').toLowerCase().trim() === targetClean && co.toLowerCase().trim() !== targetClean) {
                set.add(co);
            }
        });

        Object.keys(classAllocationsStore || {}).forEach(k => {
            const parsed = extractClassAndStream(k);
            if ((parsed.className || '').toLowerCase().trim() === targetClean && k.toLowerCase().trim() !== targetClean) {
                set.add(k);
            }
        });

        return (naturalClassSort(Array.from(set)) || []) as string[];
    }, [selectedClass, courses, classOptions, classAllocationsStore]);

    // Reset stream selection whenever active base class changes
    useEffect(() => {
        setSelectedStream('all');
        setIsAddingCustomStream(false);
        setCustomStreamInput('');
    }, [selectedClass]);

    const isStreamSpecific = selectedStream !== 'all' && Boolean(selectedStream);
    const activeAllocationTarget = isStreamSpecific ? selectedStream : selectedClass;

    const isStreamCustomized = useMemo(() => {
        if (!isStreamSpecific) return false;
        const targetClean = activeAllocationTarget.trim();
        return Boolean(classAllocationsStore[targetClean] || classAllocationsStore[targetClean.toLowerCase()]);
    }, [isStreamSpecific, activeAllocationTarget, classAllocationsStore]);

    // Map of subjectId -> set of classNames assigned
    const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
        const initial: Record<string, Set<string>> = {};
        subjects.forEach(s => {
            const set = new Set<string>();
            effectiveClassOptions.forEach((c: string) => {
                if (isSubjectAssignedToClassStream(s, c, courses)) {
                    set.add(c);
                }
            });
            initial[s.id] = set;
        });
        return initial;
    });

    // DB subject_allocations records — subjects added via LessonsAllocationManager may not have
    // targetClasses set, so we fetch DB records to mark them as active in the toggle grid
    const [dbAllocations, setDbAllocations] = useState<Array<{ className: string; subjectName: string }>>([]);
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('subject_allocations', currentInstitution.id)
                .then((recs: any[]) => {
                    if (recs && recs.length > 0) {
                        setDbAllocations(recs.map((r: any) => ({
                            className: (r.className || '').trim(),
                            subjectName: (r.subjectName || '').toLowerCase().trim()
                        })));
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution]);

    // Helper to find all stream / course level names associated with a class
    const getRelatedStreamKeys = (className: string): string[] => {
        const keys = new Set<string>();
        const targetClean = className.trim().toLowerCase();
        
        (courses || []).forEach((c: any) => {
            const cName = typeof c === 'string' ? c : (c.name || c.title || c.code || '');
            const parsed = extractClassAndStream(cName);
            const baseName = (parsed.className || cName).trim().toLowerCase();
            
            if (baseName === targetClean) {
                if (Array.isArray(c.levels)) {
                    c.levels.forEach((l: any) => {
                        const lName = String(l.name || '').trim();
                        if (lName) {
                            if (lName.toLowerCase().startsWith(baseName)) {
                                keys.add(lName);
                            } else {
                                keys.add(`${cName} ${lName}`);
                            }
                        }
                    });
                }
            }
        });

        Object.keys(classAllocationsStore || {}).forEach(k => {
            const parsed = extractClassAndStream(k);
            if ((parsed.className || '').toLowerCase().trim() === targetClean && k.toLowerCase().trim() !== targetClean) {
                keys.add(k);
            }
        });

        return Array.from(keys);
    };

    const syncAllocationsForClass = (
        currentStore: Record<string, string[]>,
        clsName: string,
        subjectIds: string[]
    ): Record<string, string[]> => {
        const nextStore = { ...currentStore };
        const clean = clsName.trim();
        const lower = clean.toLowerCase();
        
        nextStore[clean] = subjectIds;
        nextStore[lower] = subjectIds;

        const relatedStreams = getRelatedStreamKeys(clsName);
        relatedStreams.forEach(streamKey => {
            nextStore[streamKey] = subjectIds;
            nextStore[streamKey.toLowerCase().trim()] = subjectIds;
        });

        return nextStore;
    };

    const allEvaluationKeys = useMemo<string[]>(() => {
        const keys = new Set<string>(effectiveClassOptions);
        effectiveClassOptions.forEach((c: string) => {
            const streams = getRelatedStreamKeys(c);
            streams.forEach((s: string) => keys.add(s));
        });
        availableStreamsForClass.forEach((s: string) => keys.add(s));
        if (activeAllocationTarget) keys.add(activeAllocationTarget);
        return Array.from(keys);
    }, [effectiveClassOptions, availableStreamsForClass, activeAllocationTarget]);

    // Re-sync assignments when subjects/dbAllocations/classAllocationsStore update
    // Priority 0: Ground Truth Persistent Per-Class Store (classAllocationsStore)
    // Priority 1: Explicit targetClasses / assignedClasses array on subject
    // Priority 2: DB subject_allocations records from Lessons & Allocation Manager
    // Priority 3: Grade-level applicability fallback rules
    useEffect(() => {
        setAssignments(() => {
            const updated: Record<string, Set<string>> = {};
            
            // Build map of DB allocations per class name (case-insensitive)
            const dbAllocationsByClass: Record<string, Set<string>> = {};
            if (dbAllocations && dbAllocations.length > 0) {
                dbAllocations.forEach(alloc => {
                    const cKey = (alloc.className || '').trim().toLowerCase();
                    const sKey = (alloc.subjectName || '').toLowerCase().trim();
                    if (cKey && sKey) {
                        if (!dbAllocationsByClass[cKey]) dbAllocationsByClass[cKey] = new Set();
                        dbAllocationsByClass[cKey].add(sKey);
                    }
                });
            }

            (localSubjects && localSubjects.length > 0 ? localSubjects : subjects).forEach(s => {
                const set = new Set<string>();
                const sNameLower = (s.name || '').toLowerCase().trim();
                const sCodeLower = (s.code || '').toLowerCase().trim();
                const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;

                allEvaluationKeys.forEach(cKey => {
                    const cClean = (cKey || '').trim();
                    const cLower = cClean.toLowerCase();
                    const parsed = extractClassAndStream(cClean);
                    const baseClass = (parsed.className || '').trim();
                    const baseLower = baseClass.toLowerCase();

                    // Case 0: Ground Truth Persistent Per-Class / Per-Stream Store
                    let storedAssignedIds = classAllocationsStore[cClean] ?? classAllocationsStore[cLower];
                    if (!storedAssignedIds && baseClass && baseClass.toLowerCase() !== cLower) {
                        storedAssignedIds = classAllocationsStore[baseClass] ?? classAllocationsStore[baseLower];
                    }

                    if (Array.isArray(storedAssignedIds)) {
                        if (storedAssignedIds.includes(s.id) || storedAssignedIds.includes(sNameLower) || (sCodeLower && storedAssignedIds.includes(sCodeLower))) {
                            set.add(cClean);
                        }
                        return;
                    }

                    // Case A: Explicit targetClasses array defined on subject (even if empty [])
                    if (Array.isArray(targetCls)) {
                        const hasExplicitMatch = targetCls.some(tc => {
                            const cleanTC = (tc || '').toLowerCase().trim();
                            const parsedTC = extractClassAndStream(cleanTC).className.toLowerCase().trim();
                            return cleanTC === cLower || cLower.startsWith(cleanTC) || cleanTC.startsWith(cLower) ||
                                   (parsedTC && (parsedTC === cLower || parsedTC === baseLower));
                        });
                        if (hasExplicitMatch) {
                            set.add(cClean);
                        }
                        return;
                    }

                    // Case B: DB allocations exist for this specific class/stream (from Lessons & Allocation)
                    const classDbSet = dbAllocationsByClass[cLower] || (baseLower ? dbAllocationsByClass[baseLower] : undefined);
                    if (classDbSet && classDbSet.size > 0) {
                        if (classDbSet.has(sNameLower)) {
                            set.add(cClean);
                        }
                        return;
                    }

                    // Case C: Fallback to standard grade-level applicability rules
                    if (isSubjectAssignedToClassStream(s, cClean, courses)) {
                        set.add(cClean);
                    }
                });

                updated[s.id] = set;
            });
            return updated;
        });
    }, [subjects, localSubjects, allEvaluationKeys, courses, dbAllocations, classAllocationsStore]);

    useEffect(() => {
        if (effectiveClassOptions.length > 0 && (!selectedClass || !effectiveClassOptions.includes(selectedClass))) {
            setSelectedClass(effectiveClassOptions[0]);
        }
    }, [effectiveClassOptions, selectedClass]);

    // Deduplicate subjects by ID or Name/Code combination to prevent subject replication
    const deduplicatedSubjects = useMemo(() => {
        const seen = new Set<string>();
        const unique: Subject[] = [];
        (localSubjects || []).forEach(s => {
            if (!s) return;
            const sName = (s.name || '').toLowerCase().trim();
            const sCode = (s.code || '').toLowerCase().trim();
            const key = s.id ? `id_${s.id}` : `${sCode}__${sName}`;
            const nameCodeKey = `${sCode}__${sName}`;

            if (!seen.has(key) && (!sName || !seen.has(nameCodeKey))) {
                seen.add(key);
                if (nameCodeKey && sName) seen.add(nameCodeKey);
                unique.push(s);
            }
        });
        return unique;
    }, [localSubjects]);

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return deduplicatedSubjects;
        const q = searchQuery.toLowerCase();
        return deduplicatedSubjects.filter(s => (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q));
    }, [deduplicatedSubjects, searchQuery]);

    // Count assigned subjects for activeAllocationTarget
    const assignedCountForActiveTarget = useMemo(() => {
        return deduplicatedSubjects.filter(s => assignments[s.id]?.has(activeAllocationTarget)).length;
    }, [deduplicatedSubjects, assignments, activeAllocationTarget]);

    const handleToggleSubject = async (subjectId: string) => {
        const currentSet = new Set(assignments[subjectId] || []);
        const isCurrentlyAssigned = currentSet.has(activeAllocationTarget);
        if (isCurrentlyAssigned) {
            currentSet.delete(activeAllocationTarget);
        } else {
            currentSet.add(activeAllocationTarget);
        }

        const updatedAssignments = {
            ...assignments,
            [subjectId]: currentSet
        };
        setAssignments(updatedAssignments);

        const targetClassesArr = Array.from(currentSet);
        const subj = localSubjects.find(s => s.id === subjectId);
        if (subj) {
            const updatedData = { ...subj, targetClasses: targetClassesArr, assignedClasses: targetClassesArr };
            setLocalSubjects(prev => prev.map(s => s.id === subjectId ? (updatedData as Subject) : s));

            if (onUpdateSubject) {
                onUpdateSubject(subjectId, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject(updatedData as Subject).catch(() => {});
            }
        }

        // Calculate and save exact active subject IDs for target
        const activeIdsForTarget = localSubjects
            .filter(s => s.id === subjectId ? !isCurrentlyAssigned : (assignments[s.id]?.has(activeAllocationTarget) ?? false))
            .map(s => s.id);

        if (isStreamSpecific) {
            // Save specifically for this stream
            const updatedStore = {
                ...classAllocationsStore,
                [activeAllocationTarget]: activeIdsForTarget,
                [activeAllocationTarget.toLowerCase().trim()]: activeIdsForTarget
            };
            saveClassAllocationsStore(updatedStore);

            // Sync with matching course level for this stream
            const matchingLevel = (courses || [])
                .flatMap((c: any) => (c.levels || []).map((l: any) => ({ ...l, courseName: c.name })))
                .find((l: any) => {
                    const lName = (l.name || '').toLowerCase().trim();
                    const targetLow = activeAllocationTarget.toLowerCase().trim();
                    return lName === targetLow || `${(l.courseName || '').toLowerCase()} ${lName}`.trim() === targetLow;
                });
            if (matchingLevel) {
                if (!isCurrentlyAssigned) {
                    await apiService.onAssociateSubjectToCourseLevel(subjectId, matchingLevel.id).catch(() => {});
                } else {
                    await apiService.onDisassociateSubjectFromCourseLevel(subjectId, matchingLevel.id).catch(() => {});
                }
            }
        } else {
            // Whole class allocation -> sync class and all its streams
            const updatedStore = syncAllocationsForClass(classAllocationsStore, selectedClass, activeIdsForTarget);
            saveClassAllocationsStore(updatedStore);

            const matchingLevels = (courses || [])
                .filter((c: any) => {
                    const cName = typeof c === 'string' ? c : (c.name || c.title || c.code || '');
                    const parsed = extractClassAndStream(cName);
                    return (parsed.className || cName).toLowerCase().trim() === selectedClass.toLowerCase().trim();
                })
                .flatMap((c: any) => c.levels || []);

            for (const lvl of matchingLevels) {
                if (!isCurrentlyAssigned) {
                    await apiService.onAssociateSubjectToCourseLevel(subjectId, lvl.id).catch(() => {});
                } else {
                    await apiService.onDisassociateSubjectFromCourseLevel(subjectId, lvl.id).catch(() => {});
                }
            }
        }
    };

    const handleSelectAll = async () => {
        const next = { ...assignments };
        localSubjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            set.add(activeAllocationTarget);
            next[s.id] = set;
        });
        setAssignments(next);

        const updatedLocal = localSubjects.map(s => {
            const targetClassesArr = Array.from(next[s.id] || []);
            return { ...s, targetClasses: targetClassesArr, assignedClasses: targetClassesArr };
        });
        setLocalSubjects(updatedLocal);

        const allIds = localSubjects.map(s => s.id);
        if (isStreamSpecific) {
            const updatedStore = {
                ...classAllocationsStore,
                [activeAllocationTarget]: allIds,
                [activeAllocationTarget.toLowerCase().trim()]: allIds
            };
            saveClassAllocationsStore(updatedStore);
        } else {
            const updatedStore = syncAllocationsForClass(classAllocationsStore, selectedClass, allIds);
            saveClassAllocationsStore(updatedStore);
        }

        for (const s of updatedLocal) {
            const targetClassesArr = s.targetClasses || [];
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject(s as Subject).catch(() => {});
            }
        }
        setToastMessage(`Assigned all ${localSubjects.length} subjects to ${activeAllocationTarget}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleClearAll = async () => {
        const next = { ...assignments };
        localSubjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            set.delete(activeAllocationTarget);
            next[s.id] = set;
        });
        setAssignments(next);

        const updatedLocal = localSubjects.map(s => {
            const targetClassesArr = Array.from(next[s.id] || []);
            return { ...s, targetClasses: targetClassesArr, assignedClasses: targetClassesArr };
        });
        setLocalSubjects(updatedLocal);

        if (isStreamSpecific) {
            const updatedStore = {
                ...classAllocationsStore,
                [activeAllocationTarget]: [],
                [activeAllocationTarget.toLowerCase().trim()]: []
            };
            saveClassAllocationsStore(updatedStore);
        } else {
            const updatedStore = syncAllocationsForClass(classAllocationsStore, selectedClass, []);
            saveClassAllocationsStore(updatedStore);
        }

        for (const s of updatedLocal) {
            const targetClassesArr = s.targetClasses || [];
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject(s as Subject).catch(() => {});
            }
        }

        if (currentInstitution?.id) {
            const existingDbAllocations = await apiService.fetchModuleRecords<any>('subject_allocations', currentInstitution.id).catch(() => []);
            const matchingAllocations = (existingDbAllocations || []).filter((a: any) => 
                a.className === activeAllocationTarget || (a.className || '').toLowerCase().trim() === activeAllocationTarget.toLowerCase().trim()
            );
            for (const alloc of matchingAllocations) {
                if (alloc.id) {
                    await apiService.deleteModuleRecord('subject_allocations', alloc.id).catch(() => {});
                }
            }
        }

        setToastMessage(`Removed all subjects from ${activeAllocationTarget}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleResetStreamToClass = async () => {
        if (!isStreamSpecific) return;
        const updatedStore = { ...classAllocationsStore };
        delete updatedStore[activeAllocationTarget];
        delete updatedStore[activeAllocationTarget.toLowerCase().trim()];
        saveClassAllocationsStore(updatedStore);

        const classIds = classAllocationsStore[selectedClass] || classAllocationsStore[selectedClass.toLowerCase().trim()] || [];
        const next = { ...assignments };
        localSubjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            if (classIds.includes(s.id)) {
                set.add(activeAllocationTarget);
            } else {
                set.delete(activeAllocationTarget);
            }
            next[s.id] = set;
        });
        setAssignments(next);
        setToastMessage(`Reset ${activeAllocationTarget} to inherit curriculum directly from ${selectedClass}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleCopyFromClass = async () => {
        if (!copyFromClass || copyFromClass === activeAllocationTarget) return;
        const next = { ...assignments };
        
        localSubjects.forEach(s => {
            const sourceSet = assignments[s.id] || new Set();
            const targetSet = new Set(next[s.id] || []);
            if (sourceSet.has(copyFromClass)) {
                targetSet.add(activeAllocationTarget);
            } else {
                targetSet.delete(activeAllocationTarget);
            }
            next[s.id] = targetSet;
        });
        setAssignments(next);

        const sourceIds = classAllocationsStore[copyFromClass] || classAllocationsStore[copyFromClass.toLowerCase().trim()] || localSubjects.filter(s => assignments[s.id]?.has(copyFromClass)).map(s => s.id);
        
        if (isStreamSpecific) {
            const updatedStore = {
                ...classAllocationsStore,
                [activeAllocationTarget]: [...sourceIds],
                [activeAllocationTarget.toLowerCase().trim()]: [...sourceIds]
            };
            saveClassAllocationsStore(updatedStore);
        } else {
            const updatedStore = syncAllocationsForClass(classAllocationsStore, selectedClass, [...sourceIds]);
            saveClassAllocationsStore(updatedStore);
        }

        for (const s of localSubjects) {
            const targetClassesArr = Array.from(next[s.id]);
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...s, targetClasses: targetClassesArr } as Subject).catch(() => {});
            }
        }
        setToastMessage(`Copied subject allocations from ${copyFromClass} to ${activeAllocationTarget}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const copySources = useMemo(() => {
        const classesList: string[] = [];
        const streamsList: string[] = [];

        effectiveClassOptions.forEach((c: string) => {
            if (c !== activeAllocationTarget) {
                classesList.push(c);
            }
        });

        const seenStreams = new Set<string>();
        availableStreamsForClass.forEach((st: string) => {
            if (st !== activeAllocationTarget) {
                seenStreams.add(st);
                streamsList.push(st);
            }
        });

        effectiveClassOptions.forEach((c: string) => {
            getRelatedStreamKeys(c).forEach((st: string) => {
                if (st !== activeAllocationTarget && !seenStreams.has(st)) {
                    seenStreams.add(st);
                    streamsList.push(st);
                }
            });
        });

        return { classes: classesList, streams: streamsList };
    }, [effectiveClassOptions, activeAllocationTarget, availableStreamsForClass]);

    // Add / Edit Handlers
    const handleOpenAdd = () => {
        setEditingSubject(null);
        setFormData({
            name: '',
            code: '',
            departmentId: departments[0]?.id || '',
            periodsPerWeek: 4
        });
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (subject: Subject, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingSubject(subject);
        const periods = subject.lessonStructure && subject.lessonStructure.length > 0
            ? subject.lessonStructure.reduce((a, b) => a + b.count, 0)
            : 4;
        setFormData({
            name: subject.name,
            code: subject.code,
            departmentId: subject.departmentId || departments[0]?.id || '',
            periodsPerWeek: periods
        });
        setIsAddModalOpen(true);
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            alert('Subject Title and Subject Code are required.');
            return;
        }

        const lessonStructure = [{ count: Number(formData.periodsPerWeek) || 4, periods: 1 }];

        if (editingSubject) {
            // Edit existing subject
            const updatedData = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                departmentId: formData.departmentId || undefined,
                lessonStructure
            };

            if (onUpdateSubject) {
                onUpdateSubject(editingSubject.id, updatedData as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...editingSubject, ...updatedData } as Subject).catch(() => {});
            }

            setLocalSubjects(prev => prev.map(s => s.id === editingSubject.id ? ({ ...s, ...updatedData } as Subject) : s));
            setToastMessage(`Subject "${formData.name.trim()}" updated successfully.`);
        } else {
            // Add new subject & allocate to activeAllocationTarget
            const newId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const newSubjData: any = {
                id: newId,
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                departmentId: formData.departmentId || departments[0]?.id || 'dept_1',
                lessonStructure,
                isComplete: true,
                targetClasses: [activeAllocationTarget],
                assignedClasses: [activeAllocationTarget]
            };

            const matchingLevel = (courses || []).flatMap((c: any) => c.levels || []).find((l: any) => l.name === activeAllocationTarget || (l.name || '').toLowerCase().trim() === activeAllocationTarget.toLowerCase().trim());

            if (onAddSubject) {
                await onAddSubject(newSubjData, matchingLevel ? [matchingLevel.id] : undefined);
            } else if (currentInstitution?.id) {
                await apiService.saveSubject({ ...newSubjData, institutionId: currentInstitution.id } as Subject).catch(() => {});
                if (matchingLevel) {
                    await apiService.onAssociateSubjectToCourseLevel(newId, matchingLevel.id).catch(() => {});
                }
            }

            const fullCreated: Subject = { ...newSubjData, institutionId: currentInstitution?.id || 'default' } as Subject;
            setLocalSubjects(prev => [...prev, fullCreated]);
            setAssignments(prev => ({
                ...prev,
                [newId]: new Set([activeAllocationTarget])
            }));

            if (isStreamSpecific) {
                const updatedStore = {
                    ...classAllocationsStore,
                    [activeAllocationTarget]: Array.from(new Set([...(classAllocationsStore[activeAllocationTarget] || []), newId])),
                    [activeAllocationTarget.toLowerCase().trim()]: Array.from(new Set([...(classAllocationsStore[activeAllocationTarget.toLowerCase().trim()] || []), newId]))
                };
                saveClassAllocationsStore(updatedStore);
            } else {
                const updatedStore = syncAllocationsForClass(
                    classAllocationsStore,
                    selectedClass,
                    Array.from(new Set([...(classAllocationsStore[selectedClass] || []), newId]))
                );
                saveClassAllocationsStore(updatedStore);
            }

            setToastMessage(`New subject "${formData.name.trim()}" created and allocated to ${activeAllocationTarget}.`);
        }

        setIsAddModalOpen(false);
        setEditingSubject(null);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleDeleteSubject = async (subjectId: string, subjectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) {
            return;
        }

        setLocalSubjects(prev => prev.filter(s => s.id !== subjectId));
        setAssignments(prev => {
            const next = { ...prev };
            delete next[subjectId];
            return next;
        });

        // Clean up from classAllocationsStore
        const updatedStore: Record<string, string[]> = {};
        Object.keys(classAllocationsStore).forEach(cKey => {
            if (Array.isArray(classAllocationsStore[cKey])) {
                updatedStore[cKey] = classAllocationsStore[cKey].filter(sid => sid !== subjectId);
            }
        });
        saveClassAllocationsStore(updatedStore);

        if (onDeleteSubject) {
            await onDeleteSubject(subjectId);
        } else if (currentInstitution?.id) {
            await apiService.deleteModuleRecord('subjects', subjectId).catch(() => {});
        }

        setToastMessage(`Subject "${subjectName}" deleted successfully.`);
        setTimeout(() => setToastMessage(null), 3500);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                Class & Stream Curriculum Allocation
                            </span>
                            {isStreamSpecific && (
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                                    isStreamCustomized 
                                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700' 
                                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                }`}>
                                    {isStreamCustomized ? 'Custom Stream Allocation' : `Inheriting from ${selectedClass}`}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                            Manage Subjects per Class / Stream
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure learning areas for the entire class grade, or select a specific stream for tailored subject allocations.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Top Controls Bar */}
                <div className="p-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    {/* Control 1: Select Active Class */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                            Select Active Class
                        </label>
                        <select
                            value={selectedClass}
                            onChange={e => {
                                setSelectedClass(e.target.value);
                                setSelectedStream('all');
                            }}
                            className="form-select font-bold text-indigo-600 dark:text-indigo-400"
                        >
                            {effectiveClassOptions.map((c: string) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Control 2: Stream Allocation (Optional) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1">
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                Stream Allocation
                            </label>
                            {isStreamSpecific && (
                                <span className="text-[9px] font-bold text-amber-500 uppercase">Stream Override</span>
                            )}
                        </div>
                        <select
                            value={selectedStream}
                            onChange={e => setSelectedStream(e.target.value)}
                            className={`form-select font-bold ${
                                isStreamSpecific 
                                    ? 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20' 
                                    : 'text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <option value="all">Entire Class (All Streams)</option>
                            {availableStreamsForClass.length > 0 && (
                                <optgroup label={`${selectedClass} Streams`}>
                                    {availableStreamsForClass.map((stream: string) => (
                                        <option key={stream} value={stream}>
                                            {stream}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Control 3: Search Subjects */}
                    <div className="relative">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                            Search Subjects
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter code or title..."
                                className="form-input pl-10"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    {/* Control 4: Copy Settings From */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                            Copy Settings From
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={copyFromClass}
                                onChange={e => setCopyFromClass(e.target.value)}
                                className="form-select text-xs"
                            >
                                <option value="">Select source...</option>
                                {copySources.classes.length > 0 && (
                                    <optgroup label="Classes">
                                        {copySources.classes.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </optgroup>
                                )}
                                {copySources.streams.length > 0 && (
                                    <optgroup label="Specific Streams">
                                        {copySources.streams.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <button
                                onClick={handleCopyFromClass}
                                disabled={!copyFromClass}
                                className="btn-secondary px-3 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50 flex items-center gap-1"
                            >
                                <ArrowsRightLeftIcon className="w-4 h-4" /> Copy
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats & Quick Actions Bar */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-2xl border ${
                            isStreamSpecific
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                                : 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800'
                        }`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${
                                isStreamSpecific ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-400'
                            }`}>
                                {isStreamSpecific ? `Stream: ${activeAllocationTarget}` : `Active for ${selectedClass} (All Streams)`}
                            </span>
                            <span className={`text-lg font-black ${
                                isStreamSpecific ? 'text-amber-700 dark:text-amber-300' : 'text-indigo-700 dark:text-indigo-300'
                            }`}>
                                {assignedCountForActiveTarget} / {deduplicatedSubjects.length} Subjects
                            </span>
                        </div>

                        {isStreamSpecific && isStreamCustomized && (
                            <button
                                type="button"
                                onClick={handleResetStreamToClass}
                                title={`Revert ${activeAllocationTarget} to inherit ${selectedClass} class allocations`}
                                className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                            >
                                ↺ Reset to Class Defaults
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95"
                        >
                            <PlusIcon className="w-4 h-4" /> + Add New Subject
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSelectAll}
                            className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            ✓ Assign All to {activeAllocationTarget}
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            ✕ Remove All
                        </button>
                    </div>
                </div>

                {/* Toast message */}
                {toastMessage && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-200 text-xs font-bold animate-fade-in flex items-center justify-between">
                        <span>✨ {toastMessage}</span>
                        <button onClick={() => setToastMessage(null)} className="text-emerald-600 font-bold">✕</button>
                    </div>
                )}

                {/* Subject List Grid */}
                <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubjects.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-bold uppercase tracking-wider">No subjects match search criteria.</p>
                            <button
                                onClick={handleOpenAdd}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                            >
                                + Add First Subject
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredSubjects.map(subject => {
                                const isAssigned = assignments[subject.id]?.has(activeAllocationTarget);
                                return (
                                    <div
                                        key={subject.id}
                                        onClick={() => handleToggleSubject(subject.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                            isAssigned
                                                ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                                                isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                            }`}>
                                                {subject.code.slice(0, 4)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                    {subject.name}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {subject.code} • {subject.lessonStructure && subject.lessonStructure.length > 0 ? `${subject.lessonStructure.reduce((a, b) => a + b.count, 0)} p/wk` : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={e => handleOpenEdit(subject, e)}
                                                title="Edit subject details"
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={e => handleDeleteSubject(subject.id, subject.name, e)}
                                                title="Delete subject"
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleSubject(subject.id)}
                                                className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none ml-1 ${
                                                    isAssigned ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                            >
                                                <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                                    isAssigned ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">
                        Changes are automatically saved to your institution database.
                    </span>

                    <button
                        onClick={onClose}
                        className="btn-primary px-8 py-3 text-xs font-black uppercase tracking-widest"
                    >
                        Done
                    </button>
                </div>

                {/* Add / Edit Subject Sub-Modal Form Overlay */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md p-6 space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                                <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    {editingSubject ? <PencilIcon className="w-5 h-5 text-indigo-500" /> : <PlusIcon className="w-5 h-5 text-indigo-500" />}
                                    {editingSubject ? 'Edit Subject' : `Add Subject for ${activeAllocationTarget}`}
                                </h4>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Subject Name / Learning Area *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Integrated Science, Kiswahili Language"
                                        className="form-input font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Subject Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. INT-SCI, KISW-01"
                                        className="form-input font-mono uppercase font-bold"
                                    />
                                </div>

                                {departments && departments.length > 0 && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            Department
                                        </label>
                                        <select
                                            value={formData.departmentId}
                                            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                            className="form-select font-bold text-slate-700 dark:text-slate-200"
                                        >
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Periods per Week
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.periodsPerWeek}
                                        onChange={e => setFormData({ ...formData, periodsPerWeek: Number(e.target.value) || 1 })}
                                        className="form-input font-bold"
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider"
                                    >
                                        {editingSubject ? 'Save Changes' : 'Create & Allocate'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassSubjectAllocationModal;
