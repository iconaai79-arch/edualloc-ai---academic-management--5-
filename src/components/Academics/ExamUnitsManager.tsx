import React, { useState, useMemo, useEffect } from 'react';
import type { Institution, Subject, User, Assessment, AssessmentMark, AcademicYear, Course, AcademicLevel } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusIcon } from '../icons/PlusIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { XIcon } from '../icons/XIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { isSubjectApplicableToClass } from '../ClassSubjectAllocationModal';

export interface ExamUnitRecord {
    id: string;
    name: string; // e.g. Endterm 2 Exam 2026, Kapseret Mock, Mid Term Exam
    term: string; // e.g. TERM 2, TERM 1
    type: string; // e.g. END TERM, CAT, MOCK
    year: number; // e.g. 2026, 2025
    status: 'in_progress' | 'published';
    submittedPercent: number; // e.g. 27.6
    studentsEnrolled: number; // e.g. 361
    missingMarks: number; // e.g. 4354
    classes?: string[]; // Registered/target classes for this exam
}

export interface TestedPaperConfig {
    id: string;
    subject: string;
    paperName: string;
    maxInputScore: number; // e.g. 30 for 30%
    convertToHundred: boolean; // Auto convert raw scores to 100%
    enabled: boolean;
}

interface ExamUnitsManagerProps {
    currentInstitution?: Institution | null;
    subjects?: Subject[];
    users?: User[];
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    courses?: Course[];
    academicLevels?: AcademicLevel[];
    onAddAssessment?: (assessment: any) => void;
    onUpdateAssessment?: (id: string, data: any) => void;
}

export const ExamUnitsManager: React.FC<ExamUnitsManagerProps> = ({
    currentInstitution,
    subjects = [],
    users = [],
    assessments = [],
    marks = [],
    courses = [],
    academicLevels = []
}) => {
    // Storage Key Helper
    const instId = currentInstitution?.id || 'default_inst';
    const examUnitsStorageKey = `eduai_exam_units_${instId}`;

    // List of Exams State (Persisted in localStorage & DB)
    const [exams, setExams] = useState<ExamUnitRecord[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [
            { id: 'exam_1', name: 'Endterm 2 Exam 2026', term: 'TERM 2', type: 'END TERM', year: 2026, status: 'in_progress', submittedPercent: 27.6, studentsEnrolled: 361, missingMarks: 4354 },
            { id: 'exam_2', name: 'Kapseret Mock', term: 'TERM 2', type: 'END TERM', year: 2026, status: 'in_progress', submittedPercent: 19.2, studentsEnrolled: 340, missingMarks: 5120 },
            { id: 'exam_3', name: 'Mid Term Exam', term: 'TERM 1', type: 'CAT', year: 2026, status: 'in_progress', submittedPercent: 47.4, studentsEnrolled: 380, missingMarks: 2100 },
            { id: 'exam_pub_1', name: 'Mid Term 2 Exam', term: 'TERM 2', type: 'CAT', year: 2026, status: 'published', submittedPercent: 100, studentsEnrolled: 610, missingMarks: 0 },
            { id: 'exam_pub_2', name: 'End Term Exam', term: 'TERM 1', type: 'END TERM', year: 2026, status: 'published', submittedPercent: 100, studentsEnrolled: 594, missingMarks: 0 },
            { id: 'exam_pub_3', name: 'Mock Exam 2025', term: 'TERM 3', type: 'MOCK', year: 2025, status: 'published', submittedPercent: 100, studentsEnrolled: 580, missingMarks: 0 }
        ];
    });

    const [selectedExamId, setSelectedExamId] = useState<string>('exam_1');
    const [activeSubTab, setActiveSubTab] = useState<'progress' | 'irregularities' | 'history'>('progress');
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
    const [isEditingExam, setIsEditingExam] = useState(false);
    const [isBroadsheetModalOpen, setIsBroadsheetModalOpen] = useState(false);
    const [isSendResultsModalOpen, setIsSendResultsModalOpen] = useState(false);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Form 3 Central');
    const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
    const [isSavingMarks, setIsSavingMarks] = useState(false);

    // Accordion state for class progress table
    const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({
        'c_form_3_central': true,
        'c_form_3_south': false
    });

    // Form states for creating a new exam matching screenshot
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);
    const [creationMethod, setCreationMethod] = useState<'raw_marks' | 'combine' | 'excel'>('raw_marks');
    const [newExamName, setNewExamName] = useState('');
    const [newExamTypeRadio, setNewExamTypeRadio] = useState<'CAT' | 'End Term' | 'Inter-school'>('CAT');
    const [newAcademicYear, setNewAcademicYear] = useState('2026');
    const [newTerm, setNewTerm] = useState('Term 2');
    const [newGradingSystem, setNewGradingSystem] = useState('Main grading system');
    const [newExamStartDate, setNewExamStartDate] = useState('2026-07-26');
    const [newExamSubmissionDate, setNewExamSubmissionDate] = useState('2026-08-05');

    // Dynamically compute current registered classes/grades and class+stream combinations
    const registeredClasses = useMemo(() => {
        const classSet = new Set<string>();

        // 1. From courses prop
        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = c.name || (c as any).title || c.code;
                if (name) classSet.add(name);
            });
        }

        // 2. From academicLevels prop
        if (academicLevels && academicLevels.length > 0) {
            academicLevels.forEach(l => {
                const name = typeof l === 'string' ? l : (l.name || l.title || l.code);
                if (name) classSet.add(name);
            });
        }

        // 3. From registered student users (includes base classes and class+stream)
        if (users && users.length > 0) {
            users.forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    classSet.add(cl.trim());
                }
                const stream = (u as any).stream || (u as any).streamName || (u as any).stream_name;
                if (cl && typeof cl === 'string' && stream && typeof stream === 'string' && stream.trim()) {
                    classSet.add(`${cl.trim()} ${stream.trim()}`);
                }
            });
        }

        // 4. From currentInstitution object (classes, streamDefinitions, streams)
        if (currentInstitution) {
            const instClasses = (currentInstitution as any).classes || (currentInstitution as any).courses;
            if (Array.isArray(instClasses)) {
                instClasses.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : (c.name || c.title);
                    if (name) classSet.add(name);
                });
            }

            const streamDefs: string[] = (currentInstitution as any).streamDefinitions || (currentInstitution as any).streams || [];
            const effectiveStreams = streamDefs.length > 0 ? streamDefs : ['East', 'West', 'North', 'South', 'Central'];

            // Attach stream names to base classes
            const baseList = Array.from(classSet);
            baseList.forEach(base => {
                const baseLower = base.toLowerCase();
                const alreadyHasStream = effectiveStreams.some(s => baseLower.endsWith(s.toLowerCase()));
                if (!alreadyHasStream) {
                    effectiveStreams.forEach(s => {
                        if (s && s.trim()) {
                            classSet.add(`${base} ${s.trim()}`);
                        }
                    });
                }
            });
        }

        // 5. Fallback defaults if empty
        if (classSet.size === 0) {
            ['Form 1 Central', 'Form 2 Central', 'Form 3 Central', 'Form 4 Central', 'Grade 1 Central'].forEach(c => classSet.add(c));
        }

        return Array.from(classSet);
    }, [courses, academicLevels, users, currentInstitution]);

    // Step 2 Wizard States:
    const [targetStudentSearch, setTargetStudentSearch] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

    useEffect(() => {
        if (registeredClasses.length > 0 && selectedClasses.length === 0 && !isAddExamModalOpen) {
            setSelectedClasses(registeredClasses);
        }
    }, [registeredClasses, isAddExamModalOpen]);
    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution]);

    const [isPapersModalOpen, setIsPapersModalOpen] = useState(false);
    // Tested Papers Configuration State:
    const [testedPaperConfigs, setTestedPaperConfigs] = useState<TestedPaperConfig[]>([
        { id: 'tp_1', subject: 'Mathematics', paperName: 'Paper 1', maxInputScore: 30, convertToHundred: true, enabled: true },
        { id: 'tp_2', subject: 'Mathematics', paperName: 'Paper 2', maxInputScore: 70, convertToHundred: true, enabled: true },
        { id: 'tp_3', subject: 'English', paperName: 'Paper 1 (Functional Skills)', maxInputScore: 60, convertToHundred: true, enabled: true },
        { id: 'tp_4', subject: 'English', paperName: 'Paper 2 (Comprehension)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_5', subject: 'English', paperName: 'Paper 3 (Creative Writing)', maxInputScore: 40, convertToHundred: true, enabled: true },
        { id: 'tp_6', subject: 'Kiswahili', paperName: 'Insha (Paper 1)', maxInputScore: 40, convertToHundred: true, enabled: true },
        { id: 'tp_7', subject: 'Kiswahili', paperName: 'Lugha (Paper 2)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_8', subject: 'Biology', paperName: 'Paper 1 (Theory)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_9', subject: 'Biology', paperName: 'Paper 2 (Practical)', maxInputScore: 40, convertToHundred: true, enabled: true },
        { id: 'tp_10', subject: 'Chemistry', paperName: 'Paper 1 (Theory)', maxInputScore: 80, convertToHundred: true, enabled: true },
        { id: 'tp_11', subject: 'Physics', paperName: 'Paper 1 (Theory)', maxInputScore: 80, convertToHundred: true, enabled: true }
    ]);

    // Sync tested paper configurations from institution exam configs, localStorage, or subjects
    useEffect(() => {
        // 1. Try loading from localStorage first
        try {
            const savedLocal = localStorage.getItem(`eduai_tested_papers_${instId}`);
            if (savedLocal) {
                const parsed = JSON.parse(savedLocal);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTestedPaperConfigs(parsed);
                    return;
                }
            }
        } catch(e) {}

        // 2. Try loading from currentInstitution.classExamConfigs or class_exam_configs
        const savedConfigs: any[] = (currentInstitution as any)?.classExamConfigs || (currentInstitution as any)?.class_exam_configs;
        if (savedConfigs && Array.isArray(savedConfigs) && savedConfigs.length > 0) {
            const paperList: TestedPaperConfig[] = [];
            const seenKey = new Set<string>();

            savedConfigs.forEach(cConfig => {
                if (cConfig.subjects && Array.isArray(cConfig.subjects)) {
                    cConfig.subjects.forEach((sConfig: any) => {
                        const sName = sConfig.subjectName || sConfig.subjectId || sConfig.name;
                        if (sConfig.papers && Array.isArray(sConfig.papers)) {
                            sConfig.papers.forEach((p: any) => {
                                const key = `${sName}__${p.name || 'Paper 1'}`;
                                if (!seenKey.has(key)) {
                                    seenKey.add(key);
                                    paperList.push({
                                        id: p.id || `tp_${Date.now()}_${paperList.length}`,
                                        subject: sName,
                                        paperName: p.name || 'Paper 1',
                                        maxInputScore: p.maxScore || 100,
                                        convertToHundred: true,
                                        enabled: true
                                    });
                                }
                            });
                        }
                    });
                }
            });

            if (paperList.length > 0) {
                setTestedPaperConfigs(paperList);
                return;
            }
        }

        // 3. Try loading from subjects prop if available
        if (subjects && subjects.length > 0) {
            const paperList: TestedPaperConfig[] = subjects.map((sub, idx) => ({
                id: `sub_tp_${sub.id || idx}`,
                subject: sub.name || (sub as any).title,
                paperName: 'Paper 1',
                maxInputScore: 100,
                convertToHundred: true,
                enabled: true
            }));
            setTestedPaperConfigs(paperList);
            return;
        }

        // 4. Default fallback: Primary vs Secondary defaults
        if (isPrimarySchool) {
            setTestedPaperConfigs([
                { id: 'cbe_1', subject: 'Mathematics Activities', paperName: 'Paper 1 (Numeracy & Logic)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_2', subject: 'English Language Activities', paperName: 'Paper 1 (Language & Literacy)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_3', subject: 'Kiswahili Language Activities', paperName: 'Karatasi ya 1 (Lugha na Kusoma)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_4', subject: 'Science & Technology', paperName: 'Paper 1 (Theory & Practical)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_5', subject: 'Social Studies', paperName: 'Paper 1 (Citizenship & Society)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_6', subject: 'Agriculture & Nutrition', paperName: 'Paper 1 (Farming & Home Science)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_7', subject: 'Environmental Activities', paperName: 'Paper 1 (Hygiene & Environment)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_8', subject: 'Creative Arts', paperName: 'Paper 1 (Art, Craft & Music)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_9', subject: 'Religious Education (CRE/IRE)', paperName: 'Paper 1 (Spiritual & Moral)', maxInputScore: 100, convertToHundred: true, enabled: true },
                { id: 'cbe_10', subject: 'Physical & Health Education (PHE)', paperName: 'Paper 1 (Fitness & Sports)', maxInputScore: 100, convertToHundred: true, enabled: true }
            ]);
        }
    }, [currentInstitution, subjects, instId, isPrimarySchool]);
    const [useCustomRanking, setUseCustomRanking] = useState(false);
    const [rankingScope, setRankingScope] = useState<'overall' | 'per_class'>('overall');
    const [customRankingCriteria, setCustomRankingCriteria] = useState<'Points' | 'Total Marks' | 'Mean Score'>('Points');
    const [customRankingSubjectsCount, setCustomRankingSubjectsCount] = useState<number>(7);
    const [perClassRankingSettings, setPerClassRankingSettings] = useState<Record<string, { criteria: 'Points' | 'Total Marks' | 'Mean Score'; subjectsCount: number; enabled: boolean }>>({
        'Form 3 Central': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 South': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 East': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Form 3 West': { criteria: 'Points', subjectsCount: 7, enabled: true },
        'Grade 10 Central': { criteria: 'Points', subjectsCount: 7, enabled: true },
    });
    // Preset sample rows for default demo exams
    const defaultSampleRows = [
        { admNo: '1001', name: 'Amina Kiprop', class: 'Form 3 Central', mathP1: 24, mathP2: 56, engP1: 48, engP2: 64, kiswP1: 32, bioP1: 62 },
        { admNo: '1002', name: 'Brian Omondi', class: 'Form 3 Central', mathP1: 28, mathP2: 63, engP1: 52, engP2: 70, kiswP1: 36, bioP1: 68 },
        { admNo: '1003', name: 'Cynthia Wambui', class: 'Form 3 Central', mathP1: 18, mathP2: 42, engP1: 38, engP2: 50, kiswP1: 26, bioP1: 45 },
        { admNo: '1004', name: 'David Cheruiyot', class: 'Form 3 Central', mathP1: 21, mathP2: 49, engP1: 44, engP2: 58, kiswP1: 30, bioP1: 54 },
        { admNo: '1005', name: 'Emmanuel Kamau', class: 'Form 3 Central', mathP1: 27, mathP2: 61, engP1: 54, engP2: 72, kiswP1: 35, bioP1: 71 }
    ];

    // Per-exam broadsheet store
    const [examMarksStore, setExamMarksStore] = useState<Record<string, any[]>>({
        'exam_1': defaultSampleRows,
        'exam_2': defaultSampleRows,
        'exam_3': defaultSampleRows
    });

    // Broadsheet Spreadsheet State
    const [marksDisplayMode, setMarksDisplayMode] = useState<'raw' | 'converted' | 'dual'>('raw');
    const [broadsheetStudentRows, setBroadsheetStudentRows] = useState(defaultSampleRows);
    const [searchStudentQuery, setSearchStudentQuery] = useState('');

    // Fetch saved exams from DB on mount
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<ExamUnitRecord>('exam_units', currentInstitution.id)
                .then(records => {
                    if (records && records.length > 0) {
                        setExams(prev => {
                            const existingIds = new Set(prev.map(e => e.id));
                            const newOnes = records.filter(r => !existingIds.has(r.id));
                            const merged = [...newOnes, ...prev];
                            try {
                                localStorage.setItem(`eduai_exam_units_${currentInstitution.id}`, JSON.stringify(merged));
                            } catch(e) {}
                            return merged;
                        });
                    }
                })
                .catch(err => console.log('Using default exam units:', err));
        }
    }, [currentInstitution]);

    // Helper to resolve clean human-readable student admission numbers
    const resolveCleanAdmNo = (st: any, idx: number) => {
        const candidate = st.admissionNumber || st.admission_number || st.admNo || st.admissionNo || st.regNo || st.registrationNumber || st.studentId;
        if (candidate && typeof candidate === 'string' && !candidate.startsWith('usr_') && !candidate.startsWith('user_') && candidate.trim().length > 0) {
            return candidate.trim();
        }
        return `ADM-${1001 + idx}`;
    };

    // Helper to sanitize any loaded broadsheet rows that might contain raw user IDs (usr_...) as admNo
    const sanitizeBroadsheetRows = (rows: any[]) => {
        if (!Array.isArray(rows)) return rows;
        return rows.map((row, idx) => {
            if (!row.admNo || typeof row.admNo !== 'string' || row.admNo.startsWith('usr_') || row.admNo.startsWith('user_')) {
                const matchedSt = users.find(u => u.name?.toLowerCase() === row.name?.toLowerCase() || u.id === row.admNo);
                const cleanAdm = matchedSt ? resolveCleanAdmNo(matchedSt, idx) : `ADM-${1001 + idx}`;
                return { ...row, admNo: cleanAdm };
            }
            return row;
        });
    };

    // Update broadsheet rows whenever selectedExamId changes
    useEffect(() => {
        if (!selectedExamId) return;

        if (examMarksStore[selectedExamId]) {
            setBroadsheetStudentRows(sanitizeBroadsheetRows(examMarksStore[selectedExamId]));
            return;
        }

        // Try loading from localStorage first for instant availability across refresh
        try {
            const savedBroadsheet = localStorage.getItem(`eduai_exam_broadsheet_${selectedExamId}`);
            if (savedBroadsheet) {
                const parsed = JSON.parse(savedBroadsheet);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const sanitized = sanitizeBroadsheetRows(parsed);
                    setExamMarksStore(prev => ({ ...prev, [selectedExamId]: sanitized }));
                    setBroadsheetStudentRows(sanitized);
                    return;
                }
            }
        } catch(e) {}

        // Fetch custom broadsheet for selected exam if exists
        if (currentInstitution?.id && selectedExamId.startsWith('exam_')) {
            apiService.fetchModuleRecords<any>('exam_broadsheets', currentInstitution.id)
                .then(records => {
                    const match = (records || []).find(r => r.id === selectedExamId || r.examId === selectedExamId);
                    if (match && match.rows) {
                        const sanitized = sanitizeBroadsheetRows(match.rows);
                        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: sanitized }));
                        setBroadsheetStudentRows(sanitized);
                        return;
                    }
                })
                .catch(() => {});
        }

        // Default clean rows for any new exam
        const realStudents = users.filter(u => u.role === 'student');
        const cleanRows = realStudents.length > 0
            ? realStudents.map((st, idx) => ({
                admNo: resolveCleanAdmNo(st, idx),
                name: st.name || `Student ${idx + 1}`,
                class: (st as any).studentClass || (st as any).classLevel || 'Form 3 Central',
                mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
            }))
            : [
                { admNo: '1001', name: 'Amina Kiprop', class: 'Form 3 Central', mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0 },
                { admNo: '1002', name: 'Brian Omondi', class: 'Form 3 Central', mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0 },
                { admNo: '1003', name: 'Cynthia Wambui', class: 'Form 3 Central', mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0 },
                { admNo: '1004', name: 'David Cheruiyot', class: 'Form 3 Central', mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0 },
                { admNo: '1005', name: 'Emmanuel Kamau', class: 'Form 3 Central', mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0 }
            ];

        setBroadsheetStudentRows(cleanRows);
        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: cleanRows }));
    }, [selectedExamId, currentInstitution, users]);

    const filteredStudentRows = useMemo(() => {
        let rows = broadsheetStudentRows;
        if (selectedClassFilter && selectedClassFilter !== 'all') {
            const cleanFilter = selectedClassFilter.replace(/\s*\d{4}$/, '').trim().toLowerCase();
            rows = rows.filter(st => {
                const stClass = (st.class || '').trim().toLowerCase();
                return stClass === cleanFilter || stClass.includes(cleanFilter) || cleanFilter.includes(stClass);
            });
        }
        if (!searchStudentQuery.trim()) return rows;
        const q = searchStudentQuery.toLowerCase().trim();
        return rows.filter(st =>
            st.name.toLowerCase().includes(q) || st.admNo.toLowerCase().includes(q)
        );
    }, [broadsheetStudentRows, selectedClassFilter, searchStudentQuery]);

    const handleUpdateStudentMark = (admNo: string, fieldKey: string, newValue: number) => {
        const updated = broadsheetStudentRows.map(row => {
            if (row.admNo === admNo) {
                return { ...row, [fieldKey]: newValue };
            }
            return row;
        });
        setBroadsheetStudentRows(updated);
        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: updated }));
    };

    const handleSaveSubjectMarks = async (subjectName: string) => {
        setIsSavingMarks(true);
        setExamMarksStore(prev => ({ ...prev, [selectedExamId]: broadsheetStudentRows }));
        
        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('exam_broadsheets', { id: selectedExamId, examId: selectedExamId, rows: broadsheetStudentRows, institutionId: currentInstitution.id }).catch(() => {});
        }

        setTimeout(() => {
            setIsSavingMarks(false);
            setSaveToastMessage(`✅ Marks for ${subjectName} updated and saved successfully!`);
            setTimeout(() => setSaveToastMessage(null), 4000);
        }, 300);
    };

    const activeExam = useMemo(() => {
        return exams.find(e => e.id === selectedExamId) || exams[0];
    }, [exams, selectedExamId]);

    const inProgressExams = useMemo(() => exams.filter(e => e.status === 'in_progress'), [exams]);
    const publishedExams = useMemo(() => exams.filter(e => e.status === 'published'), [exams]);

    // Group published exams by year
    const publishedByYear = useMemo(() => {
        const groups: Record<number, ExamUnitRecord[]> = { 2026: [], 2025: [], 2024: [], 2023: [], 2022: [], 2020: [] };
        publishedExams.forEach(e => {
            if (!groups[e.year]) groups[e.year] = [];
            groups[e.year].push(e);
        });
        return groups;
    }, [publishedExams]);

    const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 2026: true, 2025: false });

    // Resolved Active Exam Classes
    const activeExamClasses = useMemo(() => {
        if (activeExam?.classes && activeExam.classes.length > 0) {
            return activeExam.classes;
        }
        const classesFromRows = Array.from(new Set((broadsheetStudentRows || []).map(r => r.class).filter(Boolean)));
        if (classesFromRows.length > 0) return classesFromRows;
        return registeredClasses;
    }, [activeExam, broadsheetStudentRows, registeredClasses]);

    // Dynamic Class Paper Progress Rows based on active exam & broadsheet rows
    const classPaperRows = useMemo(() => {
        const activeSubjects = testedPaperConfigs.filter(p => p.enabled);
        const subjectList = activeSubjects.length > 0
            ? Array.from(new Set(activeSubjects.map(p => p.subject)))
            : (subjects.length > 0 ? subjects.map(s => s.name || (s as any).title) : ['English', 'Kiswahili', 'MATHS', 'Biology', 'Chemistry', 'Physics']);

        return activeExamClasses.map((cName, cIdx) => {
            const classStudents = broadsheetStudentRows.filter(s => (s.class || '').toLowerCase() === cName.toLowerCase() || (s.class || '').includes(cName));
            const classEnrollment = classStudents.length > 0 ? classStudents.length : Math.round((activeExam?.studentsEnrolled || 60) / Math.max(1, activeExamClasses.length)) || 50;

            const classSubjects = subjectList.filter(subName => isSubjectApplicableToClass({ name: subName }, cName));
            const activeClassSubjects = classSubjects.length > 0 ? classSubjects : subjectList;

            const papers = activeClassSubjects.map((subName, sIdx) => {
                const fieldKey = subName.toLowerCase().includes('math') ? 'mathP1' :
                                 subName.toLowerCase().includes('eng') ? 'engP1' :
                                 subName.toLowerCase().includes('kisw') ? 'kiswP1' :
                                 subName.toLowerCase().includes('bio') ? 'bioP1' : null;

                let progress = 0;
                if (fieldKey && classStudents.length > 0) {
                    const enteredCount = classStudents.filter(st => (st[fieldKey] || 0) > 0).length;
                    progress = parseFloat(((enteredCount / classStudents.length) * 100).toFixed(2));
                } else if (activeExam?.submittedPercent && activeExam.submittedPercent > 0) {
                    progress = activeExam.submittedPercent;
                }

                const teacherObj = users.find(u => (u.role === 'teacher' || (u.role as string) === 'instructor') && ((u as any).subject === subName || u.name));
                const teacherName = teacherObj ? teacherObj.name : `Subject Teacher`;

                return {
                    id: `p_${cIdx}_${sIdx}`,
                    subject: subName,
                    teacher: teacherName,
                    enrollment: classEnrollment,
                    progress
                };
            });

            const avgProgress = papers.length > 0
                ? parseFloat((papers.reduce((sum, p) => sum + p.progress, 0) / papers.length).toFixed(2))
                : (activeExam?.submittedPercent || 0);

            return {
                classKey: `c_${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                className: cName.includes(String(activeExam?.year || '')) ? cName : `${cName} ${activeExam?.year || 2026}`,
                rawClassName: cName,
                enrollment: classEnrollment,
                overallProgress: avgProgress,
                papers
            };
        });
    }, [activeExamClasses, broadsheetStudentRows, testedPaperConfigs, subjects, users, activeExam]);

    // Dynamic Teacher Progress
    const teacherProgressList = useMemo(() => {
        const teachersMap = new Map<string, number[]>();
        classPaperRows.forEach(cRow => {
            cRow.papers.forEach(p => {
                const tName = p.teacher || 'Subject Teacher';
                if (!teachersMap.has(tName)) teachersMap.set(tName, []);
                teachersMap.get(tName)!.push(p.progress);
            });
        });

        if (teachersMap.size === 0) {
            return [
                { name: 'Subject Teacher', progress: activeExam?.submittedPercent || 0 }
            ];
        }

        return Array.from(teachersMap.entries()).map(([name, progs]) => ({
            name,
            progress: parseFloat((progs.reduce((a, b) => a + b, 0) / progs.length).toFixed(1))
        }));
    }, [classPaperRows, activeExam]);

    // Dynamic Class Progress
    const classProgressList = useMemo(() => {
        return classPaperRows.map(c => ({
            name: c.className,
            progress: c.overallProgress
        }));
    }, [classPaperRows]);

    // Dynamic Subject Progress
    const subjectProgressList = useMemo(() => {
        const allSubjects = new Set<string>();
        classPaperRows.forEach(c => c.papers.forEach(p => allSubjects.add(p.subject)));
        return Array.from(allSubjects).map(subName => {
            let totalProg = 0;
            let count = 0;
            classPaperRows.forEach(c => {
                const p = c.papers.find(x => x.subject === subName);
                if (p) {
                    totalProg += p.progress;
                    count++;
                }
            });
            const avg = count > 0 ? parseFloat((totalProg / count).toFixed(1)) : 0;
            return { name: subName, progress: avg };
        });
    }, [classPaperRows]);

    const handleCreateExam = async () => {
        if (!newExamName.trim()) {
            alert('Please enter an exam title.');
            return;
        }

        const targetClasses = selectedClasses.length > 0 ? selectedClasses : registeredClasses;
        const realStudents = users.filter(u => u.role === 'student');

        const matchedStudents = realStudents.filter(st => {
            const cl = ((st as any).studentClass || (st as any).classLevel || (st as any).class_name || (st as any).class || '').trim();
            if (!cl) return false;
            
            const stream = ((st as any).stream || (st as any).streamName || (st as any).stream_name || '').trim();
            const fullClassStream = cl && stream ? `${cl} ${stream}` : '';

            const targetLowerList = targetClasses.map(c => c.toLowerCase().trim());
            const clLower = cl.toLowerCase();
            const fullLower = fullClassStream.toLowerCase();

            return targetLowerList.some(targetLower => {
                return targetLower === clLower || 
                       targetLower === fullLower || 
                       fullLower.startsWith(targetLower) ||
                       clLower.startsWith(targetLower);
            });
        });

        const studentCount = matchedStudents.length > 0 ? matchedStudents.length : Math.max(1, targetClasses.length * 35);

        // EDIT EXISTING EXAM CASE
        if (isEditingExam && activeExam) {
            const updatedExam: ExamUnitRecord = {
                ...activeExam,
                name: newExamName.trim(),
                term: newTerm.toUpperCase(),
                type: newExamTypeRadio.toUpperCase(),
                year: parseInt(newAcademicYear) || activeExam.year,
                studentsEnrolled: studentCount,
                classes: targetClasses
            };

            setExams(prev => {
                const nextExams = prev.map(e => e.id === activeExam.id ? updatedExam : e);
                try {
                    localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
                } catch(e) {}
                return nextExams;
            });

            if (currentInstitution?.id) {
                await apiService.saveModuleRecord('exam_units', updatedExam).catch(() => {});
            }

            setIsEditingExam(false);
            setIsAddExamModalOpen(false);
            setWizardStep(1);
            setSaveToastMessage(`✨ Updated "${updatedExam.name}" for ${targetClasses.length} selected classes!`);
            setTimeout(() => setSaveToastMessage(null), 4000);
            return;
        }
        const newExamId = `exam_${Date.now()}`;

        const newExam: ExamUnitRecord = {
            id: newExamId,
            name: newExamName.trim(),
            term: newTerm.toUpperCase(),
            type: newExamTypeRadio.toUpperCase(),
            year: parseInt(newAcademicYear) || 2026,
            status: 'in_progress',
            submittedPercent: 0,
            studentsEnrolled: studentCount,
            missingMarks: studentCount * (testedPaperConfigs.filter(p => p.enabled).length || 7),
            classes: targetClasses
        };

        // Construct clean zeroed marks rows for each target class in the new exam
        let freshRows: any[] = [];
        if (matchedStudents.length > 0) {
            freshRows = matchedStudents.map((st, idx) => ({
                admNo: resolveCleanAdmNo(st, idx),
                name: st.name || `Student ${idx + 1}`,
                class: (st as any).studentClass || (st as any).classLevel || (st as any).class_name || (st as any).class || targetClasses[0],
                mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
            }));
        } else {
            targetClasses.forEach((cName, cIdx) => {
                const sampleNames = ['Amina Kiprop', 'Brian Omondi', 'Cynthia Wambui', 'David Cheruiyot', 'Emmanuel Kamau'];
                sampleNames.forEach((sName, sIdx) => {
                    freshRows.push({
                        admNo: `${1001 + (cIdx * 10) + sIdx}`,
                        name: `${sName}`,
                        class: cName,
                        mathP1: 0, mathP2: 0, engP1: 0, engP2: 0, kiswP1: 0, bioP1: 0
                    });
                });
            });
        }

        setExams(prev => {
            const nextExams = [newExam, ...prev];
            try {
                localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
            } catch(e) {}
            return nextExams;
        });

        setExamMarksStore(prev => {
            const nextStore = { ...prev, [newExamId]: freshRows };
            try {
                localStorage.setItem(`eduai_exam_broadsheet_${newExamId}`, JSON.stringify(freshRows));
            } catch(e) {}
            return nextStore;
        });

        setBroadsheetStudentRows(freshRows);
        setSelectedExamId(newExamId);
        setSelectedClassFilter(targetClasses[0] || 'all');
        setNewExamName('');
        setIsAddExamModalOpen(false);

        // Save to Database
        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('exam_units', newExam).catch(() => {});
            await apiService.saveModuleRecord('exam_broadsheets', { id: newExamId, examId: newExamId, rows: freshRows, institutionId: currentInstitution.id }).catch(() => {});
        }

        setSaveToastMessage(`✨ Created "${newExam.name}" cleanly for ${targetClasses.length} registered classes!`);
        setTimeout(() => setSaveToastMessage(null), 4000);
    };

    const handleTogglePublish = () => {
        setExams(prev => {
            const nextExams = prev.map(e => {
                if (e.id === activeExam.id) {
                    return { ...e, status: e.status === 'published' ? ('in_progress' as const) : ('published' as const) };
                }
                return e;
            });
            try {
                localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
            } catch(e) {}
            return nextExams;
        });
    };

    const handleDeleteExam = () => {
        if (confirm(`Are you sure you want to delete "${activeExam.name}"?`)) {
            setExams(prev => {
                const nextExams = prev.filter(e => e.id !== activeExam.id);
                try {
                    localStorage.setItem(`eduai_exam_units_${currentInstitution?.id || 'default_inst'}`, JSON.stringify(nextExams));
                } catch(e) {}
                if (nextExams.length > 0) {
                    setSelectedExamId(nextExams[0].id);
                }
                return nextExams;
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl">
            {/* Top Action Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button
                    type="button"
                    onClick={() => {
                        setIsEditingExam(false);
                        setNewExamName('');
                        setSelectedClasses(registeredClasses);
                        setWizardStep(1);
                        setIsAddExamModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Exam
                </button>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Main Master-Detail Grid Layout matching screenshot */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Master Panel: Exams List & Status Groups */}
                <div className="space-y-6">
                    {/* SECTION 1: EXAMS IN PROGRESS */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            EXAMS IN PROGRESS
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {inProgressExams.map(exam => {
                                const isSelected = selectedExamId === exam.id;
                                return (
                                    <div
                                        key={exam.id}
                                        onClick={() => setSelectedExamId(exam.id)}
                                        className={`p-4 cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-blue-600 text-white font-bold'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-white'
                                        }`}
                                    >
                                        <h4 className="text-xs font-bold uppercase tracking-tight mb-1">{exam.name}</h4>
                                        <p className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                            {exam.term} • {exam.type} • {exam.submittedPercent}% submitted
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: PUBLISHED EXAMS */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            PUBLISHED EXAMS
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {Object.entries(publishedByYear).map(([yearStr, list]) => {
                                const yearNum = parseInt(yearStr);
                                const isExp = expandedYears[yearNum];
                                return (
                                    <div key={yearNum} className="space-y-0.5">
                                        <div
                                            onClick={() => setExpandedYears(prev => ({ ...prev, [yearNum]: !prev[yearNum] }))}
                                            className="px-4 py-3 cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 flex items-center justify-between"
                                        >
                                            <span>{yearNum} ({list.length})</span>
                                            {isExp ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                        </div>

                                        {isExp && list.length > 0 && (
                                            <div className="pl-4 space-y-0.5 bg-slate-50/50 dark:bg-slate-950/40 divide-y divide-slate-100">
                                                {list.map(exam => {
                                                    const isSelected = selectedExamId === exam.id;
                                                    return (
                                                        <div
                                                            key={exam.id}
                                                            onClick={() => setSelectedExamId(exam.id)}
                                                            className={`p-3 cursor-pointer transition-all ${
                                                                isSelected
                                                                    ? 'bg-blue-600 text-white font-bold'
                                                                    : 'hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                                                            }`}
                                                        >
                                                            <h5 className="text-xs font-bold uppercase">{exam.name}</h5>
                                                            <p className={`text-[9px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                                                {exam.term} • {exam.type} • {exam.studentsEnrolled} students
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Main Panel: Active Selected Exam Dashboard */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Header Controls & Exam Title */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
                                {activeExam.name}
                            </h2>

                            <div className="flex items-center gap-3 relative">
                                <button
                                    type="button"
                                    onClick={handleTogglePublish}
                                    className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
                                >
                                    {activeExam.status === 'published' ? 'Unpublish Exam' : 'Publish Exam'}
                                </button>

                                {/* Exam Actions Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsActionsOpen(!isActionsOpen)}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
                                    >
                                        Exam Actions <ChevronDownIcon className="w-4 h-4 stroke-[2.5]" />
                                    </button>

                                    {isActionsOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-30 py-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 animate-scale-in">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        setIsActionsOpen(false);
                                                        setIsEditingExam(true);
                                                        setNewExamName(activeExam.name);
                                                        setNewTerm(activeExam.term);
                                                        setNewAcademicYear(activeExam.year.toString());
                                                        setSelectedClasses(activeExam.classes || registeredClasses);
                                                        setWizardStep(1);
                                                        setIsAddExamModalOpen(true);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <PencilIcon className="w-4 h-4 text-slate-400" /> Edit Exam
                                                </button>
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); setIsBroadsheetModalOpen(true); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <DocumentTextIcon className="w-4 h-4 text-slate-400" /> View Broadsheet
                                                </button>
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); setIsSendResultsModalOpen(true); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                                >
                                                    <PaperAirplaneIcon className="w-4 h-4 text-slate-400" /> Send Results
                                                </button>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); handleTogglePublish(); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-600"
                                                >
                                                    {activeExam.status === 'published' ? 'Unpublish' : 'Publish'}
                                                </button>
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); alert('Invitation Accepted'); }}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    Accept Invitation
                                                </button>
                                            </div>
                                            <div className="py-1">
                                                <button
                                                    onClick={() => { setIsActionsOpen(false); handleDeleteExam(); }}
                                                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                                                >
                                                    <TrashIcon className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top KPI Stat Cards matching screenshot */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                <h3 className="text-3xl font-black text-blue-600">{activeExam.studentsEnrolled}</h3>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">STUDENTS ENROLLED</p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                <h3 className="text-3xl font-black text-red-500">{activeExam.missingMarks.toLocaleString()}</h3>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">MISSING MARKS</p>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                                <h3 className="text-3xl font-black text-emerald-500">{activeExam.submittedPercent}%</h3>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">OF MARKS SUBMITTED</p>
                            </div>
                        </div>

                        {/* 3 Progress Columns matching screenshot */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            {/* Column 1: PROGRESS PER TEACHER */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PROGRESS PER TEACHER</h4>
                                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {teacherProgressList.map((t, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{t.name}</span>
                                            <span className="font-mono text-slate-900 dark:text-white">{t.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Column 2: PROGRESS BY CLASS */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PROGRESS BY CLASS</h4>
                                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {classProgressList.map((c, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{c.name}</span>
                                            <span className="font-mono text-slate-900 dark:text-white">{c.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Column 3: PROGRESS BY SUBJECT */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PROGRESS BY SUBJECT</h4>
                                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {subjectProgressList.map((s, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{s.name}</span>
                                            <span className="font-mono text-slate-900 dark:text-white">{s.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Subtabs & Marks Entry Progress Panel */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        {/* Subtabs Bar */}
                        <div className="flex space-x-6 border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setActiveSubTab('progress')}
                                className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
                                    activeSubTab === 'progress' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Marks Entry Progress
                            </button>
                            <button
                                onClick={() => setActiveSubTab('irregularities')}
                                className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
                                    activeSubTab === 'irregularities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Exam Irregularities
                            </button>
                            <button
                                onClick={() => setActiveSubTab('history')}
                                className={`pb-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
                                    activeSubTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Edit History
                            </button>
                        </div>

                        {/* SUBTAB 1: MARKS ENTRY PROGRESS */}
                        {activeSubTab === 'progress' && (
                            <div className="space-y-4">
                                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                        <thead className="bg-slate-700 text-white font-bold text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Paper</th>
                                                <th className="px-4 py-3 text-left">Subject Teacher</th>
                                                <th className="px-4 py-3 text-center w-28">Enrollment</th>
                                                <th className="px-6 py-3 text-left">Marks Entry Progress</th>
                                                <th className="px-4 py-3 text-center w-32">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {classPaperRows.map(cRow => {
                                                const isExpanded = expandedClasses[cRow.classKey];
                                                return (
                                                    <React.Fragment key={cRow.classKey}>
                                                        {/* Class Accordion Header Row */}
                                                        <tr className="bg-slate-100 dark:bg-slate-800/60 font-bold text-xs text-slate-900 dark:text-white">
                                                            <td className="px-4 py-3 cursor-pointer flex items-center gap-2" onClick={() => setExpandedClasses(prev => ({ ...prev, [cRow.classKey]: !prev[cRow.classKey] }))}>
                                                                {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-slate-500" /> : <ChevronRightIcon className="w-4 h-4 text-slate-500" />}
                                                                <span>{cRow.className}</span>
                                                            </td>
                                                            <td className="px-4 py-3"></td>
                                                            <td className="px-4 py-3 text-center font-bold">{cRow.enrollment}</td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cRow.overallProgress}% progress</span>
                                                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${cRow.overallProgress}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedClassFilter(cRow.className);
                                                                        setSelectedSubjectFilter('all');
                                                                        setIsBroadsheetModalOpen(true);
                                                                    }}
                                                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                                                >
                                                                    View Broadsheet
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Class Inner Paper Rows */}
                                                        {isExpanded && cRow.papers.map(p => (
                                                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs">
                                                                <td className="px-4 py-3 pl-10 font-bold text-slate-800 dark:text-slate-200">{p.subject}</td>
                                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{p.teacher}</td>
                                                                <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{p.enrollment}</td>
                                                                <td className="px-6 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12">{p.progress}%</span>
                                                                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.progress}%` }}></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedClassFilter(cRow.className);
                                                                            setSelectedSubjectFilter(p.subject);
                                                                            setIsBroadsheetModalOpen(true);
                                                                        }}
                                                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/50 transition-all shadow-2xs active:scale-95"
                                                                        title={`Edit and view marks for ${p.subject}`}
                                                                    >
                                                                        <PencilIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                                        <span>Edit Marks</span>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SUBTAB 2: EXAM IRREGULARITIES */}
                        {activeSubTab === 'irregularities' && (
                            <div className="space-y-4 py-6 text-center text-slate-400">
                                <SparklesIcon className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
                                <p className="text-xs font-bold uppercase tracking-wider">No exam irregularities or malpractice cases reported for {activeExam.name}.</p>
                            </div>
                        )}

                        {/* SUBTAB 3: EDIT HISTORY */}
                        {activeSubTab === 'history' && (
                            <div className="space-y-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                                    <span>Created assessment `{activeExam.name}`</span>
                                    <span className="text-slate-400">Today at 08:30 AM</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between">
                                    <span>Marks updated for English (Form 3 Central) by Mdm. Faith Kanguha</span>
                                    <span className="text-slate-400">Today at 10:15 AM</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL 1: ADD NEW EXAM (STEP 1 & STEP 2) */}
            {isAddExamModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
                        {/* Title Bar */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <h3 className="font-bold text-base text-slate-800 dark:text-white">{isEditingExam ? 'Edit exam' : 'Add exam'}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {wizardStep} of 2</p>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400">
                                <button type="button" className="hover:text-slate-600 text-lg font-bold">+</button>
                                <button type="button" onClick={() => { setIsAddExamModalOpen(false); setWizardStep(1); }} className="hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        {wizardStep === 1 ? (
                            /* STEP 1: GENERAL CONFIG */
                            <div className="p-6 space-y-6">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Start by choosing the type of exam you want to create from the three options below.
                                </p>

                                {/* Creation Method Radio Group */}
                                <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="creationMethod"
                                            checked={creationMethod === 'raw_marks'}
                                            onChange={() => setCreationMethod('raw_marks')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Allow teachers to enter raw marks</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="creationMethod"
                                            checked={creationMethod === 'combine'}
                                            onChange={() => setCreationMethod('combine')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Combine existing exams</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="creationMethod"
                                            checked={creationMethod === 'excel'}
                                            onChange={() => setCreationMethod('excel')}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Import exam results from Excel</span>
                                    </label>
                                </div>

                                {/* Form Fields Table/Grid */}
                                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {/* Exam Name */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam name</label>
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={newExamName}
                                                onChange={e => setNewExamName(e.target.value)}
                                                placeholder="e.g County pre-mock"
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Exam Type */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam type</label>
                                        <div className="col-span-2 flex items-center gap-6 text-xs text-slate-700 dark:text-slate-300">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="examTypeRadio"
                                                    checked={newExamTypeRadio === 'CAT'}
                                                    onChange={() => setNewExamTypeRadio('CAT')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>CAT</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="examTypeRadio"
                                                    checked={newExamTypeRadio === 'End Term'}
                                                    onChange={() => setNewExamTypeRadio('End Term')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>End Term</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="examTypeRadio"
                                                    checked={newExamTypeRadio === 'Inter-school'}
                                                    onChange={() => setNewExamTypeRadio('Inter-school')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Inter-school</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Academic Year */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Academic year</label>
                                        <div className="col-span-2 relative">
                                            <select
                                                value={newAcademicYear}
                                                onChange={e => setNewAcademicYear(e.target.value)}
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="2026">2026</option>
                                                <option value="2025">2025</option>
                                                <option value="2024">2024</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Term */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Term</label>
                                        <div className="col-span-2 relative">
                                            <select
                                                value={newTerm}
                                                onChange={e => setNewTerm(e.target.value)}
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="Term 1">Term 1</option>
                                                <option value="Term 2">Term 2</option>
                                                <option value="Term 3">Term 3</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Grading System */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Grading system</label>
                                        <div className="col-span-2 relative">
                                            <select
                                                value={newGradingSystem}
                                                onChange={e => setNewGradingSystem(e.target.value)}
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="Main grading system">Main grading system</option>
                                                <option value="8-4-4 KCSE Grading">8-4-4 KCSE Grading</option>
                                                <option value="CBC Standardized Grading">CBC Standardized Grading</option>
                                            </select>
                                            <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Exam Starts On */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Exam starts on</label>
                                        <div className="col-span-2">
                                            <input
                                                type="date"
                                                value={newExamStartDate}
                                                onChange={e => setNewExamStartDate(e.target.value)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Marks Submission Deadline */}
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Marks submission deadline</label>
                                        <div className="col-span-2">
                                            <input
                                                type="date"
                                                value={newExamSubmissionDate}
                                                onChange={e => setNewExamSubmissionDate(e.target.value)}
                                                className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* STEP 2: STUDENTS & PAPERS SCOPE & UNIQUE RANKING CRITERIA */
                            <div className="p-6 space-y-6">
                                {/* Instructions prompt matching exact wording */}
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                    Specify the students that will be sitting this exam by entering student names, admission or class name. If not all subjects will be tested, click <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">'Papers to Test'</span> to choose papers being tested. You can also specify a unique ranking criteria to be used on this exam only.
                                </p>

                                {/* Section 1: Student Scope & Search */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Students Sitting Exam</label>
                                    <input
                                        type="text"
                                        value={targetStudentSearch}
                                        onChange={e => setTargetStudentSearch(e.target.value)}
                                        placeholder="Search student names, admission no. or class..."
                                        className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                    />

                                    {/* Target Classes Selector with Select All / Clear All */}
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-[11px] font-medium text-slate-500">Classes Sitting Exam ({selectedClasses.length} selected)</span>
                                        <div className="flex gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedClasses(registeredClasses)}
                                                className="text-[11px] font-bold text-blue-600 hover:underline"
                                            >
                                                Select All
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedClasses([])}
                                                className="text-[11px] font-bold text-slate-500 hover:underline"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                                        {registeredClasses.map(cName => {
                                            const isSelected = selectedClasses.includes(cName);
                                            return (
                                                <button
                                                    key={cName}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedClasses(prev =>
                                                            isSelected ? prev.filter(c => c !== cName) : [...prev, cName]
                                                        );
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                                        isSelected
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {isSelected ? '✓ ' : '+ '}{cName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Section 2: Papers to Test Button */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">Exam Papers</h4>
                                        <p className="text-[10px] text-slate-400">{testedPaperConfigs.filter(p => p.enabled).length} paper components configured for testing</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPapersModalOpen(true)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm transition-all flex items-center gap-1.5"
                                    >
                                        <DocumentTextIcon className="w-4 h-4" /> Papers to Test
                                    </button>
                                </div>

                                {/* Section 3: Unique Ranking Criteria */}
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-white">
                                        <input
                                            type="checkbox"
                                            checked={useCustomRanking}
                                            onChange={e => setUseCustomRanking(e.target.checked)}
                                            className="text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Specify a unique ranking criteria for this exam only</span>
                                    </label>

                                    {useCustomRanking && (
                                        <div className="space-y-4 pl-6 pt-1 animate-fade-in">
                                            {/* Scope Radio options: Overall vs Per-Class */}
                                            <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="rankingScope"
                                                        checked={rankingScope === 'overall'}
                                                        onChange={() => setRankingScope('overall')}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>Overall (All sitting classes)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="rankingScope"
                                                        checked={rankingScope === 'per_class'}
                                                        onChange={() => setRankingScope('per_class')}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>Specify unique criteria per class</span>
                                                </label>
                                            </div>

                                            {rankingScope === 'overall' ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Criteria</label>
                                                        <select
                                                            value={customRankingCriteria}
                                                            onChange={e => setCustomRankingCriteria(e.target.value as any)}
                                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                                        >
                                                            <option value="Points">Points</option>
                                                            <option value="Total Marks">Total Marks</option>
                                                            <option value="Mean Score">Mean Score</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subjects Count</label>
                                                        <select
                                                            value={customRankingSubjectsCount}
                                                            onChange={e => setCustomRankingSubjectsCount(parseInt(e.target.value) || 7)}
                                                            className="w-full h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                                                        >
                                                            <option value={7}>7 Subjects</option>
                                                            <option value={8}>8 Subjects</option>
                                                            <option value={9}>9 Subjects</option>
                                                            <option value={10}>10 Subjects</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Per Class Table View */
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm max-h-48 overflow-y-auto">
                                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                                        <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Class Name</th>
                                                                <th className="px-3 py-2 text-center w-16">Rank</th>
                                                                <th className="px-3 py-2 text-left">Criteria</th>
                                                                <th className="px-3 py-2 text-center w-24">Subjects</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {selectedClasses.map(cName => {
                                                                const conf = perClassRankingSettings[cName] || { criteria: 'Points', subjectsCount: 7, enabled: true };
                                                                return (
                                                                    <tr key={cName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{cName}</td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={conf.enabled}
                                                                                onChange={e => {
                                                                                    setPerClassRankingSettings(prev => ({
                                                                                        ...prev,
                                                                                        [cName]: { ...conf, enabled: e.target.checked }
                                                                                    }));
                                                                                }}
                                                                                className="text-blue-600 rounded focus:ring-blue-500"
                                                                            />
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <select
                                                                                value={conf.criteria}
                                                                                disabled={!conf.enabled}
                                                                                onChange={e => {
                                                                                    setPerClassRankingSettings(prev => ({
                                                                                        ...prev,
                                                                                        [cName]: { ...conf, criteria: e.target.value as any }
                                                                                    }));
                                                                                }}
                                                                                className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold disabled:opacity-50"
                                                                            >
                                                                                <option value="Points">Points</option>
                                                                                <option value="Total Marks">Total Marks</option>
                                                                                <option value="Mean Score">Mean Score</option>
                                                                            </select>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <select
                                                                                value={conf.subjectsCount}
                                                                                disabled={!conf.enabled}
                                                                                onChange={e => {
                                                                                    setPerClassRankingSettings(prev => ({
                                                                                        ...prev,
                                                                                        [cName]: { ...conf, subjectsCount: parseInt(e.target.value) || 7 }
                                                                                    }));
                                                                                }}
                                                                                className="w-full h-7 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-center disabled:opacity-50"
                                                                            >
                                                                                <option value={7}>7</option>
                                                                                <option value={8}>8</option>
                                                                                <option value={9}>9</option>
                                                                                <option value={10}>10</option>
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Modal Footer Buttons */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            {wizardStep === 2 ? (
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(1)}
                                    className="px-5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all"
                                >
                                    &larr; Back
                                </button>
                            ) : <div></div>}

                            <div className="flex items-center gap-3">
                                {wizardStep === 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newExamName.trim()) {
                                                alert('Please enter an exam name.');
                                                return;
                                            }
                                            setWizardStep(2);
                                        }}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm transition-all"
                                    >
                                        Next &rarr;
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCreateExam}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-sm transition-all"
                                    >
                                        {isEditingExam ? 'Save & Update Exam' : 'Save & Create Exam'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setIsAddExamModalOpen(false); setWizardStep(1); }}
                                    className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs rounded transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: PAPERS TO TEST & MAX SCORE CONVERSION CONFIGURATION */}
            {isPapersModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase">Papers to Test & Max Input Score</h4>
                                <p className="text-[10px] text-slate-400 font-medium">Configure maximum raw input marks per paper (e.g. Math Paper 1: 30 marks) & auto-conversion to 100%.</p>
                            </div>
                            <button onClick={() => setIsPapersModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-72 overflow-y-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Subject</th>
                                            <th className="px-4 py-3 text-left">Paper Component</th>
                                            <th className="px-4 py-3 text-center w-32">Max Input Score</th>
                                            <th className="px-4 py-3 text-center w-36">Convert to 100%</th>
                                            <th className="px-4 py-3 text-center w-16">Tested</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {testedPaperConfigs.map(tp => (
                                            <tr key={tp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{tp.subject}</td>
                                                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium">{tp.paperName}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={tp.maxInputScore}
                                                            disabled={!tp.enabled}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setTestedPaperConfigs(prev => prev.map(item => item.id === tp.id ? { ...item, maxInputScore: val } : item));
                                                            }}
                                                            className="w-16 h-7 px-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white disabled:opacity-50"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold">pts</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={tp.convertToHundred}
                                                            disabled={!tp.enabled}
                                                            onChange={e => {
                                                                setTestedPaperConfigs(prev => prev.map(item => item.id === tp.id ? { ...item, convertToHundred: e.target.checked } : item));
                                                            }}
                                                            className="text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                                                        />
                                                        <span>&rarr; 100%</span>
                                                    </label>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={tp.enabled}
                                                        onChange={e => {
                                                            setTestedPaperConfigs(prev => prev.map(item => item.id === tp.id ? { ...item, enabled: e.target.checked } : item));
                                                        }}
                                                        className="text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quick Add Custom Paper Component */}
                            <div className="flex justify-between items-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const subName = prompt('Enter Subject Name (e.g. Computer Studies):', 'Computer Studies');
                                        if (!subName) return;
                                        const pName = prompt('Enter Paper Name (e.g. Paper 1 Practical):', 'Paper 1');
                                        if (!pName) return;
                                        const maxScore = parseInt(prompt('Enter Max Raw Input Score (e.g. 50):', '50') || '50') || 50;

                                        setTestedPaperConfigs(prev => [
                                            ...prev,
                                            { id: `tp_${Date.now()}`, subject: subName, paperName: pName, maxInputScore: maxScore, convertToHundred: true, enabled: true }
                                        ]);
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded transition-all flex items-center gap-1"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> Add Custom Paper Component
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        try {
                                            localStorage.setItem(`eduai_tested_papers_${instId}`, JSON.stringify(testedPaperConfigs));
                                        } catch(e) {}
                                        setIsPapersModalOpen(false);
                                    }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-md transition-all"
                                >
                                    Save Papers Configuration ({testedPaperConfigs.filter(p => p.enabled).length} Active)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: MARKS ENTRY & BROADSHEET SPREADSHEET */}
            {isBroadsheetModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-in my-auto">
                        
                        {/* Toast Alert */}
                        {saveToastMessage && (
                            <div className="bg-emerald-600 text-white px-6 py-3 font-bold text-xs flex justify-between items-center animate-in slide-in-from-top-2">
                                <span>{saveToastMessage}</span>
                                <button type="button" onClick={() => setSaveToastMessage(null)} className="hover:opacity-80">✕</button>
                            </div>
                        )}

                        {/* Title Bar & Subject Filter Selector */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
                                        {selectedSubjectFilter === 'all' ? '📊 Exam Broadsheet Overview' : `📝 Editable Marks Entry: ${selectedSubjectFilter}`}
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        {selectedClassFilter || 'Form 3 Central'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {selectedSubjectFilter === 'all' 
                                        ? `Viewing full multi-subject broadsheet for ${activeExam.name}. Select a subject from the list or dropdown below to enter & edit raw marks.`
                                        : `Type or edit raw marks for ${selectedSubjectFilter} below. Total raw scores and grades calculate live automatically.`}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Student Search Box */}
                                <div className="relative flex items-center">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchStudentQuery}
                                        onChange={(e) => setSearchStudentQuery(e.target.value)}
                                        placeholder="Search student by name or adm..."
                                        className="pl-9 pr-7 py-1.5 w-60 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs"
                                    />
                                    {searchStudentQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchStudentQuery('')}
                                            className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Class Selector Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class:</span>
                                    <select
                                        value={selectedClassFilter}
                                        onChange={(e) => setSelectedClassFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">All Classes</option>
                                        {activeExamClasses.map(cName => (
                                            <option key={cName} value={cName}>{cName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Subject Selector Dropdown */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject:</span>
                                    <select
                                        value={selectedSubjectFilter}
                                        onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">All Subjects (Full Broadsheet)</option>
                                        {Array.from(new Set([
                                            ...testedPaperConfigs.filter(p => p.enabled).map(p => p.subject),
                                            ...(subjects || []).map(s => s.name || (s as any).title)
                                        ])).filter(Boolean).map(subName => (
                                            <option key={subName} value={subName}>{subName}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedSubjectFilter !== 'all' && (
                                    <button
                                        type="button"
                                        disabled={isSavingMarks}
                                        onClick={() => handleSaveSubjectMarks(selectedSubjectFilter)}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSavingMarks ? '⏳ Saving...' : `💾 Save ${selectedSubjectFilter} Marks`}
                                    </button>
                                )}

                                <button 
                                    onClick={() => setIsBroadsheetModalOpen(false)} 
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all"
                                >
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* SINGLE SUBJECT EDITABLE MODE */}
                            {selectedSubjectFilter !== 'all' ? (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                                                <PencilIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                                                    Editable Mode Active: {selectedSubjectFilter}
                                                </h4>
                                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                                    Click inside any student's score box to type or edit raw marks. Changes update totals, percentages & grades in real-time.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSubjectFilter('all')}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer"
                                        >
                                            View Full Broadsheet
                                        </button>
                                    </div>

                                    {/* Editable Subject Grid */}
                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-96 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-left w-24">Adm No</th>
                                                    <th className="px-4 py-3 text-left">Student Name</th>
                                                    
                                                    {/* Dynamic Paper Header Columns */}
                                                    {(selectedSubjectFilter === 'English' ? [
                                                        { label: 'ENG Paper 1 (Functional)', key: 'engP1', maxScore: 60 },
                                                        { label: 'ENG Paper 2 (Comprehension)', key: 'engP2', maxScore: 80 }
                                                    ] : selectedSubjectFilter === 'Kiswahili' ? [
                                                        { label: 'KISW Paper 1 (Insha)', key: 'kiswP1', maxScore: 40 }
                                                    ] : (selectedSubjectFilter === 'MATHS' || selectedSubjectFilter === 'Mathematics') ? [
                                                        { label: 'MATH Paper 1', key: 'mathP1', maxScore: 30 },
                                                        { label: 'MATH Paper 2', key: 'mathP2', maxScore: 70 }
                                                    ] : [
                                                        { label: `${selectedSubjectFilter} Paper 1`, key: 'bioP1', maxScore: 80 }
                                                    ]).map((paper, pIdx) => (
                                                        <th key={pIdx} className="px-4 py-3 text-center bg-indigo-900/90 text-indigo-100 border-x border-indigo-800">
                                                            {paper.label} <span className="text-[10px] text-amber-300 font-bold">(/ {paper.maxScore})</span>
                                                        </th>
                                                    ))}

                                                    <th className="px-4 py-3 text-center bg-slate-800">Subject Total</th>
                                                    <th className="px-4 py-3 text-center bg-slate-800">Converted %</th>
                                                    <th className="px-4 py-3 text-center bg-slate-800">Grade</th>
                                                    <th className="px-4 py-3 text-center w-24">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                                                {filteredStudentRows.map((st, stIndex) => {
                                                    const papers = selectedSubjectFilter === 'English' ? [
                                                        { key: 'engP1', maxScore: 60 },
                                                        { key: 'engP2', maxScore: 80 }
                                                    ] : selectedSubjectFilter === 'Kiswahili' ? [
                                                        { key: 'kiswP1', maxScore: 40 }
                                                    ] : (selectedSubjectFilter === 'MATHS' || selectedSubjectFilter === 'Mathematics') ? [
                                                        { key: 'mathP1', maxScore: 30 },
                                                        { key: 'mathP2', maxScore: 70 }
                                                    ] : [
                                                        { key: 'bioP1', maxScore: 80 }
                                                    ];

                                                    const rawTotal = papers.reduce((sum, p) => sum + ((st as any)[p.key] || 0), 0);
                                                    const maxTotal = papers.reduce((sum, p) => sum + p.maxScore, 0);
                                                    const convertedPct = maxTotal > 0 ? ((rawTotal / maxTotal) * 100).toFixed(1) : '0.0';
                                                    const pctNum = parseFloat(convertedPct);
                                                    const grade = pctNum >= 80 ? 'A' : pctNum >= 75 ? 'A-' : pctNum >= 70 ? 'B+' : pctNum >= 65 ? 'B' : pctNum >= 60 ? 'B-' : pctNum >= 50 ? 'C+' : 'C';

                                                    return (
                                                        <tr key={st.admNo} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors">
                                                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{st.admNo}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{st.name}</td>
                                                            
                                                            {/* Paper Editable Score Inputs */}
                                                            {papers.map((paper, pIdx) => {
                                                                const currentVal = (st as any)[paper.key] ?? 0;
                                                                const inputId = `mark-input-${stIndex}-${pIdx}`;
                                                                return (
                                                                    <td key={pIdx} className="px-3 py-2 text-center bg-indigo-50/20 dark:bg-indigo-950/20 border-x border-slate-100 dark:border-slate-800">
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <input
                                                                                id={inputId}
                                                                                type="number"
                                                                                min={0}
                                                                                max={paper.maxScore}
                                                                                value={currentVal}
                                                                                onFocus={(e) => e.target.select()}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                                                        e.preventDefault();
                                                                                        const nextTarget = document.getElementById(`mark-input-${stIndex + 1}-${pIdx}`);
                                                                                        if (nextTarget) {
                                                                                            (nextTarget as HTMLInputElement).focus();
                                                                                            (nextTarget as HTMLInputElement).select?.();
                                                                                        }
                                                                                    } else if (e.key === 'ArrowUp' || (e.shiftKey && e.key === 'Enter')) {
                                                                                        e.preventDefault();
                                                                                        const prevTarget = document.getElementById(`mark-input-${stIndex - 1}-${pIdx}`);
                                                                                        if (prevTarget) {
                                                                                            (prevTarget as HTMLInputElement).focus();
                                                                                            (prevTarget as HTMLInputElement).select?.();
                                                                                        }
                                                                                    } else if (e.key === 'ArrowRight') {
                                                                                        const nextCol = document.getElementById(`mark-input-${stIndex}-${pIdx + 1}`);
                                                                                        if (nextCol) {
                                                                                            e.preventDefault();
                                                                                            (nextCol as HTMLInputElement).focus();
                                                                                            (nextCol as HTMLInputElement).select?.();
                                                                                        } else {
                                                                                            const nextRowFirstCol = document.getElementById(`mark-input-${stIndex + 1}-0`);
                                                                                            if (nextRowFirstCol) {
                                                                                                e.preventDefault();
                                                                                                (nextRowFirstCol as HTMLInputElement).focus();
                                                                                                (nextRowFirstCol as HTMLInputElement).select?.();
                                                                                            }
                                                                                        }
                                                                                    } else if (e.key === 'ArrowLeft') {
                                                                                        const prevCol = document.getElementById(`mark-input-${stIndex}-${pIdx - 1}`);
                                                                                        if (prevCol) {
                                                                                            e.preventDefault();
                                                                                            (prevCol as HTMLInputElement).focus();
                                                                                            (prevCol as HTMLInputElement).select?.();
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                onChange={(e) => {
                                                                                    const val = Math.max(0, Math.min(paper.maxScore, parseFloat(e.target.value) || 0));
                                                                                    handleUpdateStudentMark(st.admNo, paper.key, val);
                                                                                }}
                                                                                className="w-20 px-2 py-1.5 text-center font-mono font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-all"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-slate-400">/ {paper.maxScore}</span>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}

                                                            <td className="px-4 py-3 text-center font-mono font-black text-slate-900 dark:text-white">{rawTotal} / {maxTotal}</td>
                                                            <td className="px-4 py-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{convertedPct}%</td>
                                                            <td className="px-4 py-3 text-center font-black text-emerald-600">{grade}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-md uppercase">
                                                                    ✓ Live
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredStudentRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                            🔍 No students match "{searchStudentQuery}"
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs font-bold">
                                        <span className="text-slate-600 dark:text-slate-300 px-2">Display Format:</span>
                                        <div className="flex items-center gap-2">
                                            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg transition-all ${marksDisplayMode === 'raw' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <input type="radio" name="displayMode" checked={marksDisplayMode === 'raw'} onChange={() => setMarksDisplayMode('raw')} className="text-blue-600 focus:ring-blue-500" />
                                                <span>Raw Format (e.g. 24/30)</span>
                                            </label>
                                            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg transition-all ${marksDisplayMode === 'converted' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <input type="radio" name="displayMode" checked={marksDisplayMode === 'converted'} onChange={() => setMarksDisplayMode('converted')} className="text-blue-600 focus:ring-blue-500" />
                                                <span>Converted %</span>
                                            </label>
                                            <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg transition-all ${marksDisplayMode === 'dual' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                                                <input type="radio" name="displayMode" checked={marksDisplayMode === 'dual'} onChange={() => setMarksDisplayMode('dual')} className="text-blue-600 focus:ring-blue-500" />
                                                <span>Dual View</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 shadow-sm max-h-96 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 text-left w-20">Adm No</th>
                                                    <th className="px-4 py-3 text-left">Student Name</th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>MATH P1 (/30)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('MATHS')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>MATH P2 (/70)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('MATHS')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>ENG P1 (/60)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('English')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>ENG P2 (/80)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('English')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-3 py-3 text-center bg-slate-800">
                                                        <span>KISW INSHA (/40)</span>
                                                        <button type="button" onClick={() => setSelectedSubjectFilter('Kiswahili')} className="ml-1 text-[9px] text-blue-300 underline block font-normal">Edit</button>
                                                    </th>
                                                    <th className="px-4 py-3 text-center">Total Raw</th>
                                                    <th className="px-4 py-3 text-center">Converted %</th>
                                                    <th className="px-4 py-3 text-center">Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                                                {filteredStudentRows.map((st) => {
                                                    const rawTotal = st.mathP1 + st.mathP2 + st.engP1 + st.engP2 + st.kiswP1;
                                                    const maxTotal = 30 + 70 + 60 + 80 + 40;
                                                    const convertedPct = ((rawTotal / maxTotal) * 100).toFixed(1);
                                                    const grade = parseFloat(convertedPct) >= 80 ? 'A' : parseFloat(convertedPct) >= 75 ? 'A-' : parseFloat(convertedPct) >= 70 ? 'B+' : 'B';

                                                    return (
                                                        <tr key={st.admNo} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{st.admNo}</td>
                                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{st.name}</td>
                                                            
                                                            <td className="px-3 py-2 text-center bg-slate-50/40 dark:bg-slate-900/40 font-mono font-bold">{st.mathP1} <span className="text-[10px] text-slate-400 font-normal">/ 30</span></td>
                                                            <td className="px-3 py-2 text-center bg-slate-50/40 dark:bg-slate-900/40 font-mono font-bold">{st.mathP2} <span className="text-[10px] text-slate-400 font-normal">/ 70</span></td>
                                                            <td className="px-3 py-2 text-center bg-slate-50/40 dark:bg-slate-900/40 font-mono font-bold">{st.engP1} <span className="text-[10px] text-slate-400 font-normal">/ 60</span></td>
                                                            <td className="px-3 py-2 text-center bg-slate-50/40 dark:bg-slate-900/40 font-mono font-bold">{st.engP2} <span className="text-[10px] text-slate-400 font-normal">/ 80</span></td>
                                                            <td className="px-3 py-2 text-center bg-slate-50/40 dark:bg-slate-900/40 font-mono font-bold">{st.kiswP1} <span className="text-[10px] text-slate-400 font-normal">/ 40</span></td>

                                                            <td className="px-4 py-3 text-center font-mono font-black text-slate-900 dark:text-white">{rawTotal} / {maxTotal}</td>
                                                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600">{convertedPct}%</td>
                                                            <td className="px-4 py-3 text-center font-black text-indigo-600">{grade}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredStudentRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={10} className="px-6 py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                            🔍 No students match "{searchStudentQuery}"
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">
                                {filteredStudentRows.length} Students listed {searchStudentQuery ? `(Filtered from ${broadsheetStudentRows.length})` : ''} • Real-time database sync enabled
                            </span>
                            <div className="flex items-center gap-3">
                                {selectedSubjectFilter !== 'all' && (
                                    <button
                                        type="button"
                                        disabled={isSavingMarks}
                                        onClick={() => handleSaveSubjectMarks(selectedSubjectFilter)}
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSavingMarks ? 'Saving...' : `💾 Save ${selectedSubjectFilter} Marks`}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsBroadsheetModalOpen(false)}
                                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                                >
                                    Close Window
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
