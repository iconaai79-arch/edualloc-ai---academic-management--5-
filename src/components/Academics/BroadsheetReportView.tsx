import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course } from '../../types';
import { apiService } from '../../services/apiService';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { GridIcon } from '../icons/GridIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { EyeIcon } from '../icons/EyeIcon';
import * as XLSX from 'xlsx';

// Helper to resolve clean real student admission number
export const getStudentAdmNo = (st: any, idx: number = 0, realStudentsList?: any[]): string => {
    if (!st) return 'N/A';

    // 1. Direct candidates on student object
    const candidates = [
        st.admissionNumber,
        st.admissionNo,
        st.admNo,
        st.admission_no,
        st.admission_number,
        st.adm_no,
        st.registrationNo,
        st.registrationNumber,
        st.registration_no,
        st.regNo,
        st.studentId,
        st.staffId,
        st.upn,
        st.upi,
        st.nemisNo,
        st.metadata?.admissionNumber,
        st.metadata?.admissionNo,
        st.metadata?.admNo,
        st.user?.admissionNumber,
        st.user?.metadata?.admissionNumber
    ];

    for (const cand of candidates) {
        if (cand !== null && cand !== undefined) {
            const strVal = String(cand).trim();
            const isLegacySynthetic = /^ADM-10\d{2,}$/i.test(strVal);
            if (strVal && !strVal.startsWith('usr_') && !strVal.startsWith('user_') && !isLegacySynthetic && strVal !== 'undefined' && strVal !== 'null') {
                return strVal;
            }
        }
    }

    // 2. Direct ID check if clean
    if (st.id && typeof st.id === 'string') {
        const cleanId = st.id.trim();
        const isLegacySynthetic = /^ADM-10\d{2,}$/i.test(cleanId);
        if (!cleanId.startsWith('usr_') && !cleanId.startsWith('user_') && !isLegacySynthetic && cleanId !== 'undefined' && cleanId !== 'null') {
            return cleanId;
        }
    }

    // 3. Match by name in realStudentsList (registry)
    if (realStudentsList && Array.isArray(realStudentsList) && realStudentsList.length > 0 && st.name) {
        const cleanName = String(st.name).trim().toLowerCase();
        const matched = realStudentsList.find(s => {
            const sName = String(s.name || s.fullName || '').trim().toLowerCase();
            return sName && (sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName));
        });
        if (matched) {
            const realAdm = matched.admissionNumber || matched.admissionNo || matched.admNo || matched.registrationNo || matched.studentId || matched.id;
            const strAdm = String(realAdm || '').trim();
            if (strAdm && !strAdm.startsWith('usr_') && !strAdm.startsWith('user_') && !/^ADM-10\d{2,}$/i.test(strAdm)) {
                return strAdm;
            }
        }
    }

    return 'N/A';
};

// Top-level pure helper: calculate grade or rubric info
export const getGradeInfo = (score: number, isPrimary?: boolean, customDefs?: any[]): { grade: string; points: number } => {
    if (customDefs && Array.isArray(customDefs) && customDefs.length > 0) {
        const sorted = [...customDefs].sort((a: any, b: any) => (b.minScore ?? 0) - (a.minScore ?? 0));
        const matched = sorted.find((d: any) => score >= (d.minScore ?? 0));
        if (matched && matched.grade) {
            return { grade: matched.grade, points: matched.points ?? 0 };
        }
    }
    if (isPrimary) {
        if (score >= 80) return { grade: 'EE', points: 4.0 };
        if (score >= 65) return { grade: 'ME', points: 3.0 };
        if (score >= 50) return { grade: 'AE', points: 2.0 };
        return { grade: 'BE', points: 1.0 };
    } else {
        if (score >= 80) return { grade: 'A', points: 12.0 };
        if (score >= 75) return { grade: 'A-', points: 11.0 };
        if (score >= 70) return { grade: 'B+', points: 10.0 };
        if (score >= 65) return { grade: 'B', points: 9.0 };
        if (score >= 60) return { grade: 'B-', points: 8.0 };
        if (score >= 55) return { grade: 'C+', points: 7.0 };
        if (score >= 50) return { grade: 'C', points: 6.0 };
        if (score >= 45) return { grade: 'C-', points: 5.0 };
        if (score >= 40) return { grade: 'D+', points: 4.0 };
        if (score >= 35) return { grade: 'D', points: 3.0 };
        if (score >= 30) return { grade: 'D-', points: 2.0 };
        return { grade: 'E', points: 1.0 };
    }
};

interface BroadsheetReportViewProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const BroadsheetReportView: React.FC<BroadsheetReportViewProps> = ({
    assessments = [],
    marks = [],
    students = [],
    users = [],
    subjects = [],
    currentInstitution,
    courses = [],
    onSelectReportTab
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Navigation & Drawer states
    const [activeNavItem, setActiveNavItem] = useState<string>('broadsheet');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);
    const [isExamSidebarOpen, setIsExamSidebarOpen] = useState<boolean>(false);

    // Exam & Year states
    const [expandedYear, setExpandedYear] = useState<string>('2026');
    const [selectedExamId, setSelectedExamId] = useState<string>(assessments[0]?.id || 'exam_midterm_1');
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('');
    const [selectedStream, setSelectedStream] = useState<string>('all');

    // Search student & Modal states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState<boolean>(false);
    const [pdfPageSize, setPdfPageSize] = useState<number>(15);
    const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
    const [pdfViewMode, setPdfViewMode] = useState<'all' | 'single'>('all');
    const [pdfSortOrder, setPdfSortOrder] = useState<'rank' | 'name' | 'adm'>('rank');

    const activeStudents = useMemo(() => {
        const set = new Map<string, User>();

        (students || []).forEach(s => { if (s && s.id) set.set(s.id, s); });
        (users || []).filter(u => u.role === 'student' || u.studentClass || (u as any).admissionNo || (u as any).admNo).forEach(s => {
            if (s && s.id && !set.has(s.id)) set.set(s.id, s);
        });

        try {
            const savedUsrs = localStorage.getItem(`eduai_users_${instId}`) || localStorage.getItem(`eduai_users`);
            if (savedUsrs) {
                const parsed = JSON.parse(savedUsrs);
                if (Array.isArray(parsed)) {
                    parsed.filter(u => u.role === 'student' || u.studentClass || (u as any).admissionNo || (u as any).admNo).forEach(s => {
                        if (s && s.id && !set.has(s.id)) set.set(s.id, s);
                    });
                }
            }
        } catch(e) {}

        return Array.from(set.values());
    }, [students, users, instId]);

    // Dynamic state for exam_units created/published in Exam Units Manager
    const [savedExamUnits, setSavedExamUnits] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
            if (saved) return JSON.parse(saved) || [];
        } catch(e) {}
        return [];
    });

    // Load saved broadsheet store from Exam Units / institution_module_states
    const [savedBroadsheets, setSavedBroadsheets] = useState<Record<string, any[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch(e) {}
        return {};
    });

    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) { }
        return (currentInstitution as any)?.classSubjectAllocations || (currentInstitution as any)?.class_subject_allocations || {};
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id)
                .then(records => {
                    if (records && records.length > 0) {
                        setSavedExamUnits(prev => {
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
                .catch(() => {});
        }

        const handleSync = () => {
            try {
                const savedUnits = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (savedUnits) setSavedExamUnits(JSON.parse(savedUnits) || []);

                const savedSheets = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
                if (savedSheets) setSavedBroadsheets(JSON.parse(savedSheets) || {});
            } catch(e) {}
        };
        window.addEventListener('eduai_academics_synced', handleSync);
        window.addEventListener('eduai_broadsheets_updated', handleSync);
        window.addEventListener('storage', handleSync);
        return () => {
            window.removeEventListener('eduai_academics_synced', handleSync);
            window.removeEventListener('eduai_broadsheets_updated', handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, [currentInstitution, instId]);

    // Unified list of all exams (combining props.assessments and savedExamUnits)
    const allExamsList = useMemo(() => {
        const customConverted = savedExamUnits.map(e => {
            const stStr = String(e.status || '').toLowerCase().trim();
            const isPub = stStr === 'published' || e.isPublished === true || e.published === true;
            return {
                id: e.id,
                title: e.name || e.title || 'Exam Unit',
                name: e.name || e.title || 'Exam Unit',
                type: e.type || 'CAT',
                term: e.term || 'TERM 1',
                year: String(e.year || 2026),
                count: e.studentsEnrolled || e.studentCount || 40,
                status: isPub ? 'published' : (stStr || 'in_progress'),
                isPublished: isPub
            };
        });

        const propConverted = (assessments || []).map(a => {
            const stStr = String((a as any).status || '').toLowerCase().trim();
            const isPub = stStr === 'published' || (a as any).isPublished === true || (a as any).published === true;
            return {
                id: a.id,
                title: a.title || (a as any).name || 'Assessment',
                name: a.title || (a as any).name || 'Assessment',
                type: a.type || 'CAT',
                term: a.term || 'TERM 1',
                year: String(a.year || 2026),
                count: (a as any).count || (a as any).studentCount || 40,
                status: isPub ? 'published' : (stStr || 'in_progress'),
                isPublished: isPub
            };
        });

        const combined = [...customConverted, ...propConverted];
        const seen = new Set<string>();
        const unique: typeof customConverted = [];
        combined.forEach(item => {
            if (item.id && !seen.has(item.id)) {
                seen.add(item.id);
                unique.push(item);
            }
        });

        if (unique.length === 0) {
            return [
                { id: 'exam_1', title: 'Endterm 2 Exam 2026', name: 'Endterm 2 Exam 2026', year: '2026', term: 'TERM 2', type: 'END TERM', count: 361, status: 'in_progress', isPublished: false },
                { id: 'exam_2', title: 'Kapseret Mock', name: 'Kapseret Mock', year: '2026', term: 'TERM 2', type: 'END TERM', count: 251, status: 'in_progress', isPublished: false },
                { id: 'exam_3', title: 'Mid Term 2 Exam', name: 'Mid Term 2 Exam', year: '2026', term: 'TERM 2', type: 'CAT', count: 610, status: 'in_progress', isPublished: false },
            ];
        }

        return unique;
    }, [savedExamUnits, assessments]);

    // Active selected exam object
    const selectedExamObj = useMemo(() => {
        const match = allExamsList.find(a => a.id === selectedExamId);
        if (match) return match;
        return allExamsList[0] || {
            id: 'exam_midterm_1',
            title: 'Mid Term Exam',
            name: 'Mid Term Exam',
            type: 'CAT',
            term: 'TERM 1',
            year: '2026',
            status: 'in_progress',
            isPublished: false,
            count: activeStudents.length || 477
        };
    }, [allExamsList, selectedExamId, activeStudents]);

    // Check if current exam is officially published
    const isExamPublished = useMemo(() => {
        if (!selectedExamObj) return false;
        const stStr = String(selectedExamObj.status || '').toLowerCase().trim();
        const isPubBool = (selectedExamObj as any).isPublished ?? (selectedExamObj as any).published;
        return stStr === 'published' || isPubBool === true;
    }, [selectedExamObj]);

    // Resolve active broadsheet rows with multi-tier fallback (localStorage store -> exam unit payload -> snapshot backups -> props marks)
    const resolveEffectiveExamRows = useCallback((examId: string): any[] => {
        if (!examId) return [];

        // Tier 1: Direct lookup in savedBroadsheets state
        if (savedBroadsheets[examId] && Array.isArray(savedBroadsheets[examId]) && savedBroadsheets[examId].length > 0) {
            return savedBroadsheets[examId];
        }

        // Tier 1b: Direct localStorage lookup for institution broadsheets store
        try {
            const storeRaw = localStorage.getItem(`eduai_exam_broadsheets_${instId}`) || 
                             (currentInstitution?.id ? localStorage.getItem(`eduai_exam_broadsheets_${currentInstitution.id}`) : null) ||
                             localStorage.getItem('eduai_exam_broadsheets_default');
            if (storeRaw) {
                const parsed = JSON.parse(storeRaw);
                if (parsed && parsed[examId] && Array.isArray(parsed[examId]) && parsed[examId].length > 0) {
                    return parsed[examId];
                }
            }
        } catch(e) {}

        // Tier 2: Check active exam object's broadsheetData or rows
        const matchedExam = allExamsList.find(e => e.id === examId);
        if (matchedExam) {
            const exData = (matchedExam as any).broadsheetData || (matchedExam as any).rows;
            if (Array.isArray(exData) && exData.length > 0) return exData;

            // Also check by exam title or name if different from id
            const exName = matchedExam.title || matchedExam.name;
            if (exName && exName !== examId) {
                if (savedBroadsheets[exName] && Array.isArray(savedBroadsheets[exName]) && savedBroadsheets[exName].length > 0) {
                    return savedBroadsheets[exName];
                }
                try {
                    const storeRaw = localStorage.getItem(`eduai_exam_broadsheets_${instId}`) || 
                                     (currentInstitution?.id ? localStorage.getItem(`eduai_exam_broadsheets_${currentInstitution.id}`) : null);
                    if (storeRaw) {
                        const parsed = JSON.parse(storeRaw);
                        if (parsed && parsed[exName] && Array.isArray(parsed[exName]) && parsed[exName].length > 0) {
                            return parsed[exName];
                        }
                    }
                } catch(e) {}
            }
        }

        // Tier 3: Check snapshot backups in localStorage
        try {
            const indexKey = `eduai_marks_snapshot_index_${instId}_${examId}`;
            const keys: string[] = JSON.parse(localStorage.getItem(indexKey) || '[]');
            for (const k of keys.slice().reverse()) {
                const snapRaw = localStorage.getItem(k);
                if (snapRaw) {
                    const parsed = JSON.parse(snapRaw);
                    if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
                        return parsed.rows;
                    }
                }
            }
        } catch (e) { }

        // Tier 4: Direct individual broadsheet key
        try {
            const singleKey = localStorage.getItem(`eduai_exam_broadsheet_${examId}`) || localStorage.getItem(`eduai_exam_marks_${examId}`);
            if (singleKey) {
                const parsed = JSON.parse(singleKey);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) return parsed.rows;
            }
            if (matchedExam) {
                const nameKey = localStorage.getItem(`eduai_exam_broadsheet_${matchedExam.title}`) || localStorage.getItem(`eduai_exam_broadsheet_${matchedExam.name}`);
                if (nameKey) {
                    const parsed = JSON.parse(nameKey);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) return parsed.rows;
                }
            }
        } catch (e) { }

        // Tier 5: Construct from props.marks if matching records exist
        if (marks && marks.length > 0) {
            const examMarks = marks.filter((m: any) => 
                m.assessmentId === examId || 
                m.assessment_id === examId || 
                m.examId === examId ||
                (matchedExam && (m.assessmentId === matchedExam.title || m.assessmentId === matchedExam.name))
            );
            if (examMarks.length > 0) {
                const studentMap = new Map<string, any>();
                examMarks.forEach((m: any) => {
                    const sId = m.studentId || m.student_id;
                    if (!sId) return;
                    if (!studentMap.has(sId)) {
                        const stObj = activeStudents.find(s => s.id === sId);
                        studentMap.set(sId, {
                            id: sId,
                            admNo: (stObj as any)?.admissionNumber || (stObj as any)?.admNo || sId,
                            name: stObj?.name || 'Student',
                            class: (stObj as any)?.studentClass || selectedYearGroup || 'Class',
                            stream: (stObj as any)?.stream || (stObj as any)?.streamName || ''
                        });
                    }
                    const row = studentMap.get(sId);
                    const subId = m.subjectId || m.subject_id || m.subject;
                    if (subId && m.marks !== null && m.marks !== undefined) {
                        row[subId] = Number(m.marks);
                    }
                });
                if (studentMap.size > 0) {
                    return Array.from(studentMap.values());
                }
            }
        }

        return [];
    }, [savedBroadsheets, allExamsList, instId, marks, activeStudents, selectedYearGroup, currentInstitution]);

    // Auto-select published exam or the exam with broadsheet rows
    useEffect(() => {
        if (allExamsList.length > 0) {
            const currentObj = allExamsList.find(e => e.id === selectedExamId);
            const currentHasData = resolveEffectiveExamRows(selectedExamId).length > 0;
            const currentIsPub = currentObj && (currentObj.isPublished || String(currentObj.status || '').toLowerCase().trim() === 'published');

            // If current selected exam has data or is published and valid, stay on it!
            if (currentHasData || (currentIsPub && currentObj)) return;

            // 1. Prioritize a published exam that has broadsheet data
            const pubWithData = allExamsList.find(e =>
                (e.isPublished || String(e.status || '').toLowerCase().trim() === 'published') &&
                resolveEffectiveExamRows(e.id).length > 0
            );
            if (pubWithData && pubWithData.id !== selectedExamId) {
                setSelectedExamId(pubWithData.id);
                return;
            }

            // 2. Prioritize any exam that has broadsheet data
            const anyWithData = allExamsList.find(e => resolveEffectiveExamRows(e.id).length > 0);
            if (anyWithData && anyWithData.id !== selectedExamId) {
                setSelectedExamId(anyWithData.id);
                return;
            }

            // 3. Prioritize ANY published exam
            const anyPub = allExamsList.find(e => e.isPublished || String(e.status || '').toLowerCase().trim() === 'published');
            if (anyPub && anyPub.id !== selectedExamId) {
                setSelectedExamId(anyPub.id);
                return;
            }
        }
    }, [allExamsList, resolveEffectiveExamRows, selectedExamId]);

    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const instName = (currentInstitution?.name || '').toLowerCase();
        const yearGrp = (selectedYearGroup || '').toLowerCase();
        const examName = ((selectedExamObj as any)?.name || (selectedExamObj as any)?.title || '').toLowerCase();

        return (
            type === 'primary' ||
            instName.includes('primary') ||
            instName.includes('academy') ||
            instName.includes('cbc') ||
            instName.includes('cbe') ||
            yearGrp.includes('grade') ||
            yearGrp.includes('pp') ||
            yearGrp.includes('standard') ||
            yearGrp.includes('std') ||
            examName.includes('grade') ||
            examName.includes('pp') ||
            examName.includes('primary')
        );
    }, [currentInstitution, selectedYearGroup, selectedExamObj]);

    // Dynamic List of Year Group Options
    const yearGroupOptions = useMemo(() => {
        const set = new Set<string>();

        // 1. Classes assigned to selectedExamObj
        if (selectedExamObj) {
            const exClasses = (selectedExamObj as any).classes || (selectedExamObj as any).targetClasses || [(selectedExamObj as any).class];
            if (Array.isArray(exClasses)) {
                exClasses.forEach((c: any) => {
                    if (c && typeof c === 'string' && c.trim()) {
                        const clean = c.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                        set.add(clean);
                        set.add(c.trim());
                    }
                });
            }
        }

        // 2. Registered Classes in Institution
        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
                if (name) set.add(name);
            });
        }

        if (activeStudents && activeStudents.length > 0) {
            activeStudents.forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    const clean = cl.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    set.add(clean);
                    set.add(cl.trim());
                }
            });
        }

        try {
            const savedClasses = localStorage.getItem(`eduai_registered_classes_${instId}`);
            if (savedClasses) {
                const parsed = JSON.parse(savedClasses);
                if (Array.isArray(parsed)) {
                    parsed.forEach(c => {
                        const clean = c.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                        set.add(clean);
                        set.add(c.trim());
                    });
                }
            }
        } catch(e) {}

        if (set.size === 0) {
            if (isPrimarySchool) {
                ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'PP1', 'PP2'].forEach(c => set.add(c));
            } else {
                ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(c => set.add(c));
            }
        }

        return Array.from(set);
    }, [selectedExamObj, courses, activeStudents, instId, isPrimarySchool]);

    // Dynamic Streams Options for Selected Class (Preserves exact registered casing: e.g. WEST, EAST)
    const streamOptions = useMemo(() => {
        const streamMap = new Map<string, string>();
        const yearGroupClean = (selectedYearGroup || '').toLowerCase().trim();

        const addStream = (rawName: string, isFromRegistration = false) => {
            if (!rawName) return;
            let clean = String(rawName).replace(/^[-–—:]+\s*/, '').replace(/\s*stream\s*$/i, '').trim();
            if (!clean || clean.toLowerCase() === 'all' || clean === '—' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') return;

            // Exclude pure numbers (e.g. "3" from "Form 3")
            if (/^\d+$/.test(clean)) return;

            // Exclude generic grade/form prefixes
            if (/^(grade|form|standard|std|class|pp|year)\s*\d*$/i.test(clean)) return;

            if (yearGroupClean && clean.toLowerCase().startsWith(yearGroupClean)) {
                clean = clean.replace(new RegExp(`^${selectedYearGroup}\\s*[-–—:]*\\s*`, 'i'), '').trim() || clean;
            }
            clean = clean.replace(/^\((.+)\)$/, '$1').trim();
            if (!clean || clean.toLowerCase() === yearGroupClean || /^\d+$/.test(clean)) return;

            const key = clean.toLowerCase();
            const existing = streamMap.get(key);
            if (!existing) {
                streamMap.set(key, clean);
            } else {
                if (isFromRegistration) {
                    streamMap.set(key, clean);
                } else if (clean === clean.toUpperCase() && existing !== existing.toUpperCase()) {
                    streamMap.set(key, clean);
                }
            }
        };

        // 1. Registered course levels for this cohort
        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const cName = (c.name || (c as any).title || c.code || '').trim().toLowerCase();
                const matchesCourse = cName === yearGroupClean || cName.includes(yearGroupClean) || yearGroupClean.includes(cName);
                if (matchesCourse && c.levels && Array.isArray(c.levels)) {
                    c.levels.forEach((l: any) => {
                        const lName = (l.name || l.title || l.code || '').trim();
                        if (lName) addStream(lName, true);
                    });
                }
            });
        }

        // 2. Institution stream definitions
        if (currentInstitution && (currentInstitution as any).streamDefinitions && Array.isArray((currentInstitution as any).streamDefinitions)) {
            (currentInstitution as any).streamDefinitions.forEach((sDef: any) => {
                if (typeof sDef === 'string') addStream(sDef, true);
                else if (sDef?.name) addStream(sDef.name, true);
            });
        }

        // 3. Saved broadsheet rows
        const savedRows = resolveEffectiveExamRows(selectedExamId);
        if (savedRows && savedRows.length > 0) {
            savedRows.forEach((r: any) => {
                const stClass = String(r.class || r.studentClass || '').trim();
                const rStream = String(r.stream || r.streamName || r.stream_name || '').trim();
                if (rStream) addStream(rStream);
                if (stClass.toLowerCase().includes(yearGroupClean)) {
                    const match = stClass.match(/\s+([a-zA-Z0-9_-]+|\([a-zA-Z0-9_-]+\))$/i);
                    if (match && match[1] && !/^\d+$/.test(match[1])) {
                        addStream(match[1]);
                    } else if (stClass.toLowerCase() !== yearGroupClean) {
                        addStream(stClass.replace(new RegExp(`^${selectedYearGroup}\\s*[-–—:]*\\s*`, 'i'), '').trim());
                    }
                }
            });
        }

        // 4. Active registered students
        activeStudents.forEach((st: any) => {
            const stClass = String(st.studentClass || st.classLevel || st.className || st.class || '').trim();
            const directStream = String(st.stream || st.streamName || st.metadata?.stream || st.metadata?.streamName || '').trim();
            if (directStream && (stClass.toLowerCase().includes(yearGroupClean) || !yearGroupClean || yearGroupClean === 'all')) {
                addStream(directStream);
            }

            // Check courseLevelId
            const lvlId = (st as any).courseLevelId || (st as any).levelId || (st as any).metadata?.courseLevelId;
            if (lvlId && courses && courses.length > 0) {
                for (const c of courses) {
                    const cName = (c.name || (c as any).title || c.code || '').trim().toLowerCase();
                    if (cName === yearGroupClean || cName.includes(yearGroupClean) || yearGroupClean.includes(cName)) {
                        const matchedLevel = (c.levels || []).find((l: any) => l.id === lvlId);
                        if (matchedLevel?.name) addStream(matchedLevel.name, true);
                    }
                }
            }

            if (stClass.toLowerCase().includes(yearGroupClean)) {
                const match = stClass.match(/\s+([a-zA-Z0-9_-]+|\([a-zA-Z0-9_-]+\))$/i);
                if (match && match[1] && !/^\d+$/.test(match[1])) {
                    addStream(match[1]);
                } else if (stClass.toLowerCase() !== yearGroupClean) {
                    addStream(stClass.replace(new RegExp(`^${selectedYearGroup}\\s*[-–—:]*\\s*`, 'i'), '').trim());
                }
            }
        });

        if (streamMap.size === 0) {
            ['East', 'West', 'North', 'South'].forEach(s => addStream(s));
        }

        return ['all', ...Array.from(streamMap.values()).filter(Boolean)];
    }, [courses, selectedYearGroup, selectedExamId, resolveEffectiveExamRows, activeStudents, currentInstitution]);

    // Auto-sync selectedYearGroup when active exam changes
    useEffect(() => {
        if (selectedExamObj) {
            const exClasses = (selectedExamObj as any).classes || (selectedExamObj as any).targetClasses || [(selectedExamObj as any).class];
            if (Array.isArray(exClasses) && exClasses.length > 0 && exClasses[0]) {
                const firstCl = String(exClasses[0]).trim();
                const cleanCl = firstCl.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                setSelectedYearGroup(cleanCl || firstCl);
                return;
            }
        }
        if (yearGroupOptions.length > 0 && !yearGroupOptions.includes(selectedYearGroup)) {
            setSelectedYearGroup(yearGroupOptions[0]);
        }
    }, [selectedExamId, selectedExamObj, yearGroupOptions]);

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id).catch(() => [])
            ]).then(([imsRecords, allocRecords]) => {
                const match = (imsRecords || []).find((r: any) => r.id === `broadsheets_${currentInstitution.id}` || r.module_id === 'exam_broadsheets' || r.moduleId === 'exam_broadsheets' || r.moduleName === 'exam_broadsheets');
                const storeData = match?.settings || match?.stateData || match?.data;
                if (storeData && typeof storeData === 'object') {
                    setSavedBroadsheets(prev => {
                        const merged = { ...prev, ...storeData };
                        try {
                            localStorage.setItem(`eduai_exam_broadsheets_${currentInstitution.id}`, JSON.stringify(merged));
                        } catch(e) {}
                        return merged;
                    });
                }

                if (allocRecords && allocRecords.length > 0) {
                    const allocMap: Record<string, string[]> = {};
                    allocRecords.forEach((rec: any) => {
                        const cName = rec.className || rec.class_name || rec.id;
                        const subList = rec.subjects || rec.subject_ids || rec.allocated_subjects || [];
                        if (cName && Array.isArray(subList)) {
                            allocMap[cName] = subList;
                        }
                    });
                    if (Object.keys(allocMap).length > 0) {
                        setClassAllocationsStore(prev => ({ ...prev, ...allocMap }));
                    }
                }
            }).catch(() => {});
        }
    }, [currentInstitution]);

    // Helper to test if a student mark row key matches a specific subject
    const isSubjectKeyMatch = (k: string, sub: any): boolean => {
        if (!k || !sub) return false;
        const kNorm = k.toLowerCase().trim();
        const subName = (sub.name || (sub as any).title || '').toLowerCase().trim();
        const subCode = (sub.code || '').toLowerCase().trim();
        const subId = (sub.id || '').toLowerCase().trim();

        // Direct ID, Code, or exact Name match
        if (kNorm === subId || kNorm === subCode || kNorm === subName) return true;

        const sClean = subName.replace(/[^a-z0-9]/g, '_');
        const sCompact = subName.replace(/[^a-z0-9]/g, '');
        const cCompact = subCode.replace(/[^a-z0-9]/g, '');
        const kStripped = kNorm.replace(/^subj_/, '').replace(/_p\d+$/, '').replace(/[^a-z0-9]/g, '');

        if (kNorm === `subj_${sClean}_p1` || kNorm === `subj_${sClean}` || kNorm === sClean) return true;
        if (cCompact && (kNorm === `subj_${cCompact}_p1` || kNorm === `subj_${cCompact}` || kNorm === cCompact)) return true;
        if (kStripped && (kStripped === sCompact || kStripped === cCompact)) return true;

        // Semantic Curriculum Root Matching:
        // Kiswahili
        if ((subCode.startsWith('kisw') || subName.includes('kisw')) && (kNorm.includes('kisw') || kNorm.includes('insha'))) return true;
        // Hygiene / Nutrition
        if ((subCode.startsWith('hyg') || subName.includes('hyg') || subName.includes('nutri')) && (kNorm.includes('hyg') || kNorm.includes('nutri') || kNorm.includes('health'))) return true;
        // Environmental / Science
        if ((subCode.startsWith('env') || subName.includes('env')) && (kNorm.includes('env') || kNorm.includes('environment'))) return true;
        // Creative / Psychomotor / Art
        if ((subCode.startsWith('creat') || subName.includes('creat') || subName.includes('art') || subName.includes('psycho')) && 
            (kNorm.includes('creat') || kNorm.includes('art') || kNorm.includes('psycho') || kNorm.includes('music') || kNorm.includes('movement'))) return true;
        // Mathematics
        if ((subCode.startsWith('math') || subName.includes('math')) && (kNorm.includes('math') || kNorm.includes('numeracy'))) return true;
        // English
        if ((subCode.startsWith('eng') || subName.includes('eng')) && (kNorm.includes('eng') || kNorm.includes('literacy'))) return true;
        // Religious Education (CRE / IRE / HRE)
        if ((subCode.startsWith('cre') || subCode.startsWith('ire') || subCode.startsWith('hre') || subName.includes('religio')) && 
            (kNorm.includes('cre') || kNorm.includes('ire') || kNorm.includes('hre') || kNorm.includes('religio'))) return true;
        // Agriculture
        if ((subCode.startsWith('agri') || subName.includes('agri')) && kNorm.includes('agri')) return true;
        // Social Studies
        if ((subCode.startsWith('soc') || subName.includes('social')) && (kNorm.includes('soc') || kNorm.includes('social'))) return true;
        // Biology
        if (subCode.startsWith('bio') && kNorm.includes('bio')) return true;
        // Chemistry
        if (subCode.startsWith('chem') && kNorm.includes('chem')) return true;
        // Physics
        if (subCode.startsWith('phy') && (kNorm.includes('phy') || kNorm.includes('physics'))) return true;

        // Normalized word token match (tokens of length >= 4)
        const subTokens = subName.split(/[^a-z0-9]/).filter(t => t.length >= 4 && !['lower', 'upper', 'primary', 'secondary', 'activities', 'activity'].includes(t));
        if (subTokens.length > 0 && subTokens.some(tok => kNorm.includes(tok))) return true;

        return false;
    };

    // Active subjects for broadsheet columns (filtered by class subject allocation & current exam's entered subjects)
    const broadsheetSubjects = useMemo(() => {
        // 1. All candidate subjects
        const rawCandidates = subjects.length > 0 ? subjects : [
            { id: 'sub_1', name: 'English', code: 'ENG' },
            { id: 'sub_2', name: 'Kiswahili', code: 'KISW' },
            { id: 'sub_3', name: 'Mathematics', code: 'MATH' },
            { id: 'sub_4', name: 'Biology', code: 'BIO' },
            { id: 'sub_5', name: 'Physics', code: 'PHY' },
            { id: 'sub_6', name: 'Chemistry', code: 'CHEM' },
            { id: 'sub_7', name: 'History & Govt', code: 'HIST' },
            { id: 'sub_8', name: 'Geography', code: 'GEO' },
            { id: 'sub_9', name: 'Christian Rel. Ed.', code: 'CRE' },
            { id: 'sub_10', name: 'Computer Studies', code: 'CMP' },
            { id: 'sub_11', name: 'Business Studies', code: 'BST' },
        ];

        const yGrpClean = (selectedYearGroup || '').toLowerCase().trim();
        const yGrpNorm = yGrpClean.replace(/[^a-z0-9]/g, '');
        const isUpperPrimaryGroup = /grade\s*[4-8]|std\s*[4-8]|standard\s*[4-8]/i.test(selectedYearGroup);
        const isLowerPrimaryGroup = /grade\s*[1-3]|std\s*[1-3]|standard\s*[1-3]|pp[1-2]|playgroup/i.test(selectedYearGroup);

        // 2. Filter candidate subjects strictly by class allocations if configured
        let allocatedSubjectIdentifiers: string[] | null = null;
        if (yGrpClean && yGrpClean !== 'all') {
            const matchedKey = Object.keys(classAllocationsStore || {}).find(k => {
                const kClean = k.toLowerCase().trim();
                const kNorm = kClean.replace(/[^a-z0-9]/g, '');
                return kClean === yGrpClean || kNorm === yGrpNorm || (kNorm.length > 2 && yGrpNorm.includes(kNorm)) || (yGrpNorm.length > 2 && kNorm.includes(yGrpNorm));
            });
            if (matchedKey && Array.isArray(classAllocationsStore[matchedKey]) && classAllocationsStore[matchedKey].length > 0) {
                allocatedSubjectIdentifiers = classAllocationsStore[matchedKey];
            }
        }

        const candidateList: any[] = [];
        const seenCandidateNames = new Set<string>();

        rawCandidates.forEach(sub => {
            const sCode = (sub.code || '').toUpperCase().trim();
            const sName = (sub.name || '').toUpperCase().trim();
            const subId = (sub.id || '').trim();
            const normName = (sub.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            // If class allocations are defined for this year group, verify subject is allocated
            if (allocatedSubjectIdentifiers && allocatedSubjectIdentifiers.length > 0) {
                const isAllocated = allocatedSubjectIdentifiers.some(allocId => {
                    const aClean = String(allocId).toLowerCase().trim();
                    const aNorm = aClean.replace(/[^a-z0-9]/g, '');
                    return aClean === subId.toLowerCase() ||
                           aClean === sName.toLowerCase() ||
                           aClean === sCode.toLowerCase() ||
                           (aNorm.length >= 3 && normName.includes(aNorm)) ||
                           (normName.length >= 3 && aNorm.includes(normName));
                });
                if (!isAllocated) return;
            } else {
                // Curricula division filter only when no explicit allocation is set
                if (isUpperPrimaryGroup) {
                    if (sCode.endsWith('-LP') || sCode.endsWith('_LP') || sName.includes('LOWER PRIMARY') || sName.includes('(LP)')) return;
                }
                if (isLowerPrimaryGroup) {
                    if (sCode.endsWith('-UP') || sCode.endsWith('_UP') || sName.includes('UPPER PRIMARY') || sName.includes('(UP)')) return;
                }
            }

            if (normName && !seenCandidateNames.has(normName)) {
                seenCandidateNames.add(normName);
                candidateList.push(sub);
            }
        });

        // 3. Filter by active marks entered for this exam & class
        const savedRows = resolveEffectiveExamRows(selectedExamId);
        if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
            const classRows = yGrpClean && yGrpClean !== 'all'
                ? savedRows.filter((r: any) => {
                    const stCls = String(r.class || r.studentClass || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return !stCls || stCls.includes(yGrpNorm) || yGrpNorm.includes(stCls);
                })
                : savedRows;

            if (classRows.length > 0) {
                const activeSubjIds = new Set<string>();
                candidateList.forEach(sub => {
                    const hasDataInRows = classRows.some(stRow => {
                        return Object.entries(stRow).some(([k, val]) => {
                            if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo'].includes(k)) return false;
                            if (val === null || val === undefined || val === '') return false;
                            if (typeof val === 'number' && val >= 0) {
                                return isSubjectKeyMatch(k, sub);
                            }
                            return false;
                        });
                    });

                    if (hasDataInRows) {
                        activeSubjIds.add(sub.id);
                    }
                });

                if (activeSubjIds.size > 0) {
                    return candidateList.filter(sub => activeSubjIds.has(sub.id));
                }
            }
        }

        return candidateList;
    }, [subjects, selectedExamObj, resolveEffectiveExamRows, selectedExamId, isPrimarySchool, selectedYearGroup, classAllocationsStore]);

    // Helper to resolve real student stream with cross-referencing
    const resolveStudentStream = (st: any, row: any): string => {
        // Direct stream property on row or student
        const direct = row?.stream || row?.streamName || row?.stream_name || st?.stream || st?.streamName || st?.metadata?.stream || st?.metadata?.streamName || '';
        if (direct && String(direct).trim()) {
            return String(direct).replace(/^[-–—:]+\s*/, '').replace(/\s*stream\s*$/i, '').trim();
        }

        // Check courseLevelId
        const lvlId = st?.courseLevelId || st?.levelId || st?.metadata?.courseLevelId || row?.courseLevelId || row?.levelId;
        if (lvlId && courses && courses.length > 0) {
            for (const c of courses) {
                const lvl = (c.levels || []).find((l: any) => l.id === lvlId);
                if (lvl?.name) {
                    return String(lvl.name).trim();
                }
            }
        }

        // Check if class string contains stream (e.g. "Form 3 EAST")
        const stClass = String(row?.class || row?.studentClass || st?.studentClass || st?.classLevel || '').trim();
        if (stClass) {
            const yGrp = (selectedYearGroup || '').trim();
            if (yGrp && stClass.toLowerCase().startsWith(yGrp.toLowerCase())) {
                const rest = stClass.slice(yGrp.length).replace(/^[-–—:]+\s*/, '').trim();
                if (rest && !/^\d+$/.test(rest) && !/^(grade|form|standard|std)\s*\d*$/i.test(rest)) {
                    return rest;
                }
            }

            if (courses && courses.length > 0) {
                for (const c of courses) {
                    const cName = (c.name || '').trim().toLowerCase();
                    const matchesYear = !yGrp || cName === yGrp.toLowerCase() || cName.includes(yGrp.toLowerCase());
                    if (matchesYear && c.levels && Array.isArray(c.levels)) {
                        for (const l of c.levels) {
                            const lName = (l.name || '').trim();
                            if (lName && stClass.toLowerCase().includes(lName.toLowerCase())) {
                                return lName;
                            }
                        }
                    }
                }
            }
        }

        return '';
    };

    // Student broadsheet list (combining real saved marks and student registry)
    const sampleStudents = useMemo(() => {
        const savedRows = resolveEffectiveExamRows(selectedExamId);
        if (!savedRows || !Array.isArray(savedRows) || savedRows.length === 0) return [];

        return savedRows.map((stRow, idx) => {
            const realAdmNo = getStudentAdmNo(stRow, idx, activeStudents) || (stRow as any).admissionNumber || (stRow as any).admissionNo || (stRow as any).admNo || (stRow as any).id || String(181 + idx);
            const realName = stRow.name || (stRow as any).studentName || (stRow as any).student?.name || `Student ${idx + 1}`;
            
            const matchedSt = activeStudents.find(s => {
                if (s.id && ((stRow as any).id === s.id || (stRow as any).studentId === s.id || (stRow as any).student?.id === s.id)) {
                    return true;
                }
                const sAdm = String(s.admissionNumber || (s as any).admissionNo || (s as any).admNo || s.id || '').trim().toLowerCase();
                const rAdm = String(realAdmNo).trim().toLowerCase();
                if (sAdm && rAdm) {
                    if (sAdm === rAdm) return true;
                    if (sAdm.replace(/^0+/, '') === rAdm.replace(/^0+/, '')) return true;
                }
                const sName = String(s.name || '').trim().toLowerCase();
                const rName = String(realName).trim().toLowerCase();
                if (sName && rName && sName === rName) return true;
                return false;
            });

            const cleanStream = resolveStudentStream(matchedSt, stRow);

            let realClass = stRow.class || (stRow as any).studentClass || (stRow as any).student?.studentClass || (matchedSt as any)?.studentClass || selectedYearGroup || 'Form 3';
            if (cleanStream && !realClass.toLowerCase().includes(cleanStream.toLowerCase())) {
                realClass = `${realClass} ${cleanStream}`.trim();
            }

            const subjectMarksMap: Record<string, { score: number; grade: string }> = {};
            let total = 0;
            let totalPts = 0;
            let validCount = 0;

            broadsheetSubjects.forEach(sub => {
                let sc = 0;
                let hasMark = false;

                Object.entries(stRow).forEach(([k, val]) => {
                    if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo', 'total', 'mean', 'average', 'stream'].includes(k)) return;
                    if (val === null || val === undefined || val === '' || isNaN(val as any)) return;

                    const numVal = typeof val === 'number' ? val : parseFloat(String(val));
                    if (!isNaN(numVal) && isSubjectKeyMatch(k, sub)) {
                        sc += numVal;
                        hasMark = true;
                    }
                });

                if (hasMark) {
                    const { grade, points } = getGradeInfo(sc, isPrimarySchool);
                    subjectMarksMap[sub.id] = { score: sc, grade };
                    total += sc;
                    totalPts += points;
                    validCount++;
                }
            });

            const meanPts = validCount > 0 ? parseFloat((totalPts / validCount).toFixed(4)) : 0;
            const meanScore = validCount > 0 ? parseFloat((total / validCount).toFixed(1)) : 0;
            const { grade: meanGrade } = getGradeInfo(meanScore, isPrimarySchool);

            return {
                student: {
                    ...(matchedSt || {}),
                    id: realAdmNo,
                    name: realName,
                    admissionNo: realAdmNo,
                    studentClass: realClass,
                    stream: cleanStream || matchedSt?.stream || (stRow as any).stream || '',
                    courseLevelId: (matchedSt as any)?.courseLevelId || (stRow as any)?.courseLevelId
                },
                kcpe: 250 + (idx * 5) % 150,
                entry: validCount > 0 ? validCount : (broadsheetSubjects.length || 1),
                subjectMarksMap,
                total,
                meanScore,
                meanGrade,
                meanPts,
                vap: parseFloat((3.5714 - idx * 0.12).toFixed(4))
            };
        }).sort((a, b) => b.total - a.total).map((r, idx) => ({
            ...r,
            overallPos: idx + 1,
            streamPos: (idx % 5) + 1
        }));
    }, [resolveEffectiveExamRows, selectedExamId, activeStudents, selectedYearGroup, broadsheetSubjects, isPrimarySchool, courses]);

    // Filtered student rows (sorted by total marks descending and re-ranked 1, 2, 3, 4...)
    const filteredBroadsheetRows = useMemo(() => {
        const filtered = sampleStudents.filter(r => {
            const stClass = (r.student?.studentClass || '').trim();
            const yGrp = (selectedYearGroup || '').trim();

            const matchesYearGroup = !yGrp ||
                yGrp === 'all' ||
                stClass.toLowerCase().includes(yGrp.toLowerCase()) ||
                yGrp.toLowerCase().includes(stClass.toLowerCase()) ||
                (courses && courses.some(c => {
                    const cName = (c.name || '').trim().toLowerCase();
                    if (cName !== yGrp.toLowerCase()) return false;
                    return (c.levels || []).some((l: any) => 
                        stClass.toLowerCase().includes(l.name.toLowerCase().trim()) ||
                        String((r.student as any)?.stream || '').toLowerCase().trim() === l.name.toLowerCase().trim()
                    );
                }));

            const stStream = String((r.student as any)?.stream || '').toLowerCase().trim();
            const selClean = selectedStream.toLowerCase().trim();
            const matchesStream = selectedStream === 'all' ||
                stClass.toLowerCase().includes(selClean) ||
                (stStream && (stStream === selClean || stStream.includes(selClean) || selClean.includes(stStream))) ||
                (courses && courses.some(c => (c.levels || []).some((l: any) => 
                    l.name.toLowerCase().trim() === selClean && (
                        (r.student as any)?.courseLevelId === l.id || 
                        (r.student as any)?.levelId === l.id
                    )
                )));

            const admStr = (r.student?.admissionNo || (r.student as any)?.admNo || '').toLowerCase();
            const nameStr = (r.student?.name || '').toLowerCase();
            const q = searchQuery.trim().toLowerCase();
            const matchesQuery = !q || nameStr.includes(q) || admStr.includes(q);

            return matchesYearGroup && matchesStream && matchesQuery;
        });

        // Re-sort filtered rows by total marks descending
        const sorted = [...filtered].sort((a, b) => b.total - a.total);

        // Re-assign accurate ranks (1, 2, 3, 4, 5...) for the active class/stream
        let currentRank = 1;
        return sorted.map((row, idx, arr) => {
            if (idx > 0 && row.total < arr[idx - 1].total) {
                currentRank = idx + 1;
            }
            return {
                ...row,
                overallPos: currentRank,
                streamPos: currentRank
            };
        });
    }, [sampleStudents, selectedYearGroup, selectedStream, searchQuery, courses]);

    // Paginated rows
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBroadsheetRows.slice(start, start + pageSize);
    }, [filteredBroadsheetRows, currentPage, pageSize]);

    // Total pages
    const totalPages = Math.ceil(filteredBroadsheetRows.length / pageSize) || 1;

    // Sorted & Chunked rows for On-Screen PDF preview ("sorted on pages")
    const sortedPdfRows = useMemo(() => {
        const rows = [...filteredBroadsheetRows.filter(r => r?.student)];
        if (pdfSortOrder === 'name') {
            rows.sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''));
        } else if (pdfSortOrder === 'adm') {
            rows.sort((a, b) => {
                const admA = getStudentAdmNo(a.student, 0, activeStudents) || a.student?.admissionNo || '';
                const admB = getStudentAdmNo(b.student, 0, activeStudents) || b.student?.admissionNo || '';
                return admA.localeCompare(admB, undefined, { numeric: true });
            });
        } else {
            // default: sorted by overall rank
            rows.sort((a, b) => (a.overallPos || 0) - (b.overallPos || 0));
        }
        return rows;
    }, [filteredBroadsheetRows, pdfSortOrder, activeStudents]);

    const pdfPages = useMemo(() => {
        const size = pdfPageSize === 0 ? sortedPdfRows.length || 1 : pdfPageSize;
        const pages: typeof sortedPdfRows[] = [];
        for (let i = 0; i < sortedPdfRows.length; i += size) {
            pages.push(sortedPdfRows.slice(i, i + size));
        }
        return pages;
    }, [sortedPdfRows, pdfPageSize]);

    // Keep pdfCurrentPage bounded
    useEffect(() => {
        if (pdfCurrentPage > pdfPages.length) {
            setPdfCurrentPage(Math.max(1, pdfPages.length));
        }
    }, [pdfPages.length, pdfCurrentPage]);

    // Calculate Bottom Footer Subject Averages
    const subjectFooterMeans = useMemo(() => {
        const footer: Record<string, { meanScore: number; meanGrade: string }> = {};

        broadsheetSubjects.forEach(sub => {
            let sum = 0;
            let count = 0;

            filteredBroadsheetRows.forEach(r => {
                if (r.subjectMarksMap[sub.id]) {
                    sum += r.subjectMarksMap[sub.id].score;
                    count++;
                }
            });

            const avg = count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
            footer[sub.id] = {
                meanScore: avg,
                meanGrade: getGradeInfo(avg, isPrimarySchool).grade
            };
        });

        return footer;
    }, [broadsheetSubjects, filteredBroadsheetRows, isPrimarySchool]);

    // Calculate Class / Institutional Mean Score & Grade following school grading system
    const classMeanInfo = useMemo(() => {
        if (sampleStudents.length === 0) {
            return {
                meanScore: '—',
                meanGrade: '—',
                meanPts: '0.00'
            };
        }
        const totalSum = sampleStudents.reduce((acc, curr) => acc + (curr.meanScore || 0), 0);
        const meanScore = parseFloat((totalSum / sampleStudents.length).toFixed(1));
        const { grade: meanGrade, points } = getGradeInfo(meanScore, isPrimarySchool);
        
        const ptsSum = sampleStudents.reduce((acc, curr) => acc + (curr.meanPts || 0), 0);
        const meanPts = parseFloat((ptsSum / sampleStudents.length).toFixed(2));

        return {
            meanScore,
            meanGrade,
            meanPts
        };
    }, [sampleStudents, isPrimarySchool]);

    // Export Broadsheet Excel
    const handleExportExcel = () => {
        const exportData = filteredBroadsheetRows.map((r, idx) => {
            const rowObj: any = {
                'ID': getStudentAdmNo(r.student, idx),
                'Name': r.student.name,
                ...(!isPrimarySchool ? { 'KCPE': r.kcpe } : {}),
                'Class': r.student.studentClass || '3 Central',
                'Entry': r.entry
            };

            broadsheetSubjects.forEach(sub => {
                const mark = r.subjectMarksMap[sub.id];
                rowObj[sub.code] = mark ? `${mark.score} ${mark.grade}` : '-';
            });

            rowObj['Total'] = r.total;
            rowObj['M.Grade'] = r.meanGrade;
            rowObj['M.Points'] = r.meanPts;
            rowObj['Stream Pos.'] = r.streamPos;
            rowObj['Overall Pos.'] = r.overallPos;
            rowObj['V.A.P'] = r.vap;

            return rowObj;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet');
        XLSX.writeFile(wb, `Broadsheet_${selectedExamObj.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    };

    // Exam History grouped by Year
    const examHistoryByYear = useMemo(() => {
        const groups: Record<string, typeof allExamsList> = {};
        allExamsList.forEach(item => {
            const yr = String(item.year || '2026');
            if (!groups[yr]) groups[yr] = [];
            groups[yr].push(item);
        });
        return groups;
    }, [allExamsList]);

    // Left Navigation Items
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon, reportTab: 'exam_analysis' },
        { id: 'inter_school', label: 'Inter-school', icon: SparklesIcon },
        { id: 'subject_grades_distribution', label: 'Subject grades distribution', icon: ChartPieIcon, reportTab: 'subject_grades_analysis' },
        { id: 'result_slips', label: 'Result slips', icon: DocumentArrowDownIcon, reportTab: 'result_slips' },
        { id: 'broadsheet', label: 'Broadsheet', icon: GridIcon, reportTab: 'broadsheet' },
        { id: 'marksheet', label: 'Marksheet (Raw Data)', icon: BookOpenIcon, reportTab: 'marksheet' },
        { id: 'exam_irregularities', label: 'Exam irregularities', icon: ExclamationTriangleIcon },
        { id: 'missing_marks', label: 'Missing marks', icon: ExclamationTriangleIcon, reportTab: 'missing_marks' },
        { id: 'student_progress', label: 'Student progress', icon: UserGroupIcon, reportTab: 'student_progress' },
        { id: 'report_cards', label: 'Report cards', icon: BookOpenIcon, reportTab: 'report_cards' },
        { id: 'transcripts', label: 'Academic Transcripts', icon: SparklesIcon, reportTab: 'transcripts' },
    ];

    const otherNavItems = [
        { id: 'attendance', label: 'Attendance', icon: CheckCircleIcon },
        { id: 'discipline', label: 'Discipline', icon: ExclamationTriangleIcon },
        { id: 'user_activities', label: 'User activities', icon: UserGroupIcon },
        { id: 'payments', label: 'Payments', icon: DocumentArrowDownIcon },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full text-left animate-fade-in">
            {/* COLUMN 1: LEFT NAVIGATION DRAWER */}
            <div className={`transition-all duration-300 ${isLeftNavCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-60'} shrink-0 space-y-4`}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
                    <div className="flex items-center justify-between px-2 mb-3">
                        {!isLeftNavCollapsed && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                EXAM ANALYSIS
                            </span>
                        )}
                        <button
                            onClick={() => setIsLeftNavCollapsed(!isLeftNavCollapsed)}
                            className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {isLeftNavCollapsed ? '▶' : '— COLLAPSE'}
                        </button>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveNavItem(item.id);
                                    if (item.reportTab && onSelectReportTab) {
                                        onSelectReportTab(item.reportTab);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    activeNavItem === item.id
                                    ? 'bg-indigo-600 text-white shadow-md font-black'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {!isLeftNavCollapsed && <span className="truncate">{item.label}</span>}
                                </div>
                                {!isLeftNavCollapsed && <span className="text-[10px] opacity-60">›</span>}
                            </button>
                        ))}
                    </nav>

                    {!isLeftNavCollapsed && (
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OTHERS</span>
                                <span className="text-[10px] font-bold text-slate-400">— COLLAPSE</span>
                            </div>
                            <nav className="space-y-1">
                                {otherNavItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveNavItem(item.id)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <item.icon className="w-4 h-4 shrink-0" />
                                            <span>{item.label}</span>
                                        </div>
                                        <span className="text-[10px] opacity-60">›</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMN 2: EXAM HISTORY COLUMN (COLLAPSIBLE TO MAXIMIZE TABLE WIDTH) */}
            {isExamSidebarOpen && (
                <div className="w-full lg:w-64 shrink-0 space-y-3 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
                            <span>EXAM HISTORY & SESSIONS</span>
                            <button
                                type="button"
                                onClick={() => setIsExamSidebarOpen(false)}
                                className="text-slate-400 hover:text-rose-500 font-bold text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2">
                            {Object.entries(examHistoryByYear).map(([year, examsList]) => {
                                const isExpanded = expandedYear === year;
                                return (
                                    <div key={year} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                        <button
                                            onClick={() => setExpandedYear(isExpanded ? '' : year)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-indigo-600 dark:text-indigo-400 flex justify-between items-center"
                                        >
                                            <span>{year} ({examsList.length})</span>
                                            <span>{isExpanded ? '▲' : '▼'}</span>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-1.5 space-y-1.5 bg-white dark:bg-slate-900">
                                                {examsList.map(exam => {
                                                    const isSelected = selectedExamId === exam.id;
                                                    return (
                                                        <button
                                                            key={exam.id}
                                                            onClick={() => {
                                                                setSelectedExamId(exam.id);
                                                                setIsExamSidebarOpen(false);
                                                            }}
                                                            className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                                                                isSelected
                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold'
                                                                : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                                                            }`}
                                                        >
                                                            <div className="text-xs font-black truncate">{exam.title}</div>
                                                            <div className={`text-[9px] font-bold uppercase mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                {exam.term} &bull; {exam.type} &bull; {exam.count} students
                                                            </div>
                                                        </button>
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
            )}

            {/* COLUMN 3: MAIN BROADSHEET MASTER TABLE */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Header Controls Bar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                {selectedYearGroup.toUpperCase()} &bull; {selectedExamObj.title.toUpperCase()} BROADSHEET
                            </span>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-2">
                                {selectedYearGroup} &mdash; {selectedExamObj.title} BROADSHEET
                            </h2>
                        </div>

                        {/* Stream / Controls */}
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Select Exam</label>
                                <select
                                    value={selectedExamId}
                                    onChange={e => setSelectedExamId(e.target.value)}
                                    className="form-select text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 max-w-[200px] truncate"
                                >
                                    {allExamsList.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.title} ({ex.year || '2026'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Year Group</label>
                                <select
                                    value={selectedYearGroup}
                                    onChange={e => setSelectedYearGroup(e.target.value)}
                                    className="form-select text-xs font-bold text-indigo-600 dark:text-indigo-400"
                                >
                                    {yearGroupOptions.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Stream</label>
                                <select
                                    value={selectedStream}
                                    onChange={e => setSelectedStream(e.target.value)}
                                    className="form-select text-xs font-bold"
                                >
                                    {streamOptions.map(stOpt => (
                                        <option key={stOpt} value={stOpt}>
                                            {stOpt === 'all' ? 'All Streams' : stOpt.replace(/\s*stream\s*$/i, '').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end gap-2 mt-4 xl:mt-0">
                                <button
                                    type="button"
                                    onClick={() => setIsExamSidebarOpen(!isExamSidebarOpen)}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border cursor-pointer ${
                                        isExamSidebarOpen
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>📁 {isExamSidebarOpen ? 'Hide History' : 'Exam History'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPdfPreviewOpen(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all border border-purple-400/30 cursor-pointer"
                                >
                                    <EyeIcon className="w-4 h-4 animate-pulse text-amber-300" /> 
                                    <span>PDF Preview</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="btn-secondary px-4 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Print
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="btn-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Download Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search & On-Screen PDF Banner */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-purple-50/40 dark:from-slate-800/80 dark:to-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                        <div className="relative w-full md:w-80">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search student name or admission no..."
                                className="form-input text-xs pl-9 py-2.5 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                Showing <strong className="text-indigo-600 dark:text-indigo-400 font-black">{filteredBroadsheetRows.length}</strong> Students
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsPdfPreviewOpen(true)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer"
                            >
                                <EyeIcon className="w-3.5 h-3.5" /> Open PDF Preview
                            </button>
                        </div>
                    </div>
                </div>

                {/* THE BROADSHEET MASTER TABLE FROM PICTURE */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            {/* Table Header */}
                            <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="p-3">ADM NO</th>
                                    <th className="p-3">Name</th>
                                    {!isPrimarySchool && <th className="p-3 text-center">KCPE</th>}
                                    <th className="p-3">Class</th>
                                    <th className="p-3 text-center">Entry</th>
                                    {broadsheetSubjects.map(sub => (
                                        <th key={sub.id} className="p-3 text-center border-l border-slate-800">
                                            {sub.code}
                                        </th>
                                    ))}
                                    <th className="p-3 text-center border-l border-slate-800">Total</th>
                                    <th className="p-3 text-center">M.Grade</th>
                                    <th className="p-3 text-center">M.Points</th>
                                    <th className="p-3 text-center">Str.Pos</th>
                                    <th className="p-3 text-center">Ov.Pos</th>
                                    <th className="p-3 text-right">V.A.P</th>
                                </tr>
                            </thead>

                            {/* Table Body */}
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                {paginatedRows.filter(row => row?.student).map((row, idx) => (
                                    <tr key={row.student?.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{getStudentAdmNo(row.student, idx, activeStudents) || row.student?.admissionNo || row.student?.id || 'N/A'}</td>
                                        <td className="p-3 font-black text-slate-900 dark:text-white uppercase whitespace-nowrap">{row.student?.name}</td>
                                        {!isPrimarySchool && <td className="p-3 text-center text-slate-400 font-mono">{row.kcpe || '—'}</td>}
                                        <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{(row.student as any)?.studentClass || '3 Central'}</td>
                                        <td className="p-3 text-center font-bold text-slate-500">{row.entry}</td>
                                        {broadsheetSubjects.map(sub => {
                                            const mark = row.subjectMarksMap[sub.id];
                                            return (
                                                <td key={sub.id} className="p-3 text-center border-l border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                                                    {mark ? (
                                                        <span>
                                                            <strong className="text-slate-900 dark:text-white">{mark.score}</strong>{' '}
                                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{mark.grade}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="p-3 text-center border-l border-slate-100 dark:border-slate-800/60 font-mono font-bold text-slate-900 dark:text-white">
                                            {row.total}
                                        </td>
                                        <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400 font-mono">{row.meanGrade}</td>
                                        <td className="p-3 text-center font-mono text-emerald-600 font-bold">{row.meanPts}</td>
                                        <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 font-mono">#{row.streamPos}</td>
                                        <td className="p-3 text-center font-black text-slate-900 dark:text-white font-mono">#{row.overallPos}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-500">{row.vap > 0 ? `+${row.vap}` : row.vap}</td>
                                    </tr>
                                ))}
                                {paginatedRows.length === 0 && (
                                    <tr>
                                        <td colSpan={broadsheetSubjects.length + 10} className="px-6 py-16 text-center">
                                            <div className="max-w-md mx-auto space-y-3">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold shadow-sm">
                                                    🔒
                                                </div>
                                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                    No Broadsheet Results Available
                                                </h3>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    No student results were found matching the selected class or stream filters.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* Table Footer Row: Subject Means */}
                            <tfoot className="bg-slate-100/90 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-black">
                                <tr>
                                    <td colSpan={isPrimarySchool ? 4 : 5} className="p-3 uppercase text-slate-900 dark:text-white font-black">
                                        SUBJECT MEAN SCORES & GRADES
                                    </td>
                                    {broadsheetSubjects.map(sub => {
                                        const ft = subjectFooterMeans[sub.id];
                                        return (
                                            <td key={sub.id} className="p-3 text-center border-l border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                                                {ft ? (
                                                    <span>
                                                        <span className="text-slate-900 dark:text-white">{ft.meanScore}</span>{' '}
                                                        <span className="text-indigo-600 dark:text-indigo-400">{ft.meanGrade}</span>
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td colSpan={6} className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-300 uppercase">
                                        CLASS MEAN: <span className="font-black text-slate-900 dark:text-white">{classMeanInfo.meanScore}</span> (<span className="font-black text-indigo-600 dark:text-indigo-400">{classMeanInfo.meanGrade}</span>) &bull; POINTS: <span className="font-black text-emerald-600 dark:text-emerald-400">{classMeanInfo.meanPts}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-40"
                            >
                                &lt;
                            </button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-40"
                            >
                                &gt;
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span>Items per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="form-select text-xs font-bold py-1 px-2"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ON-SCREEN PDF PREVIEW MODAL */}
            {isPdfPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-fade-in pdf-preview-modal-root">
                    <div className="bg-slate-900 text-white rounded-3xl border border-slate-700 w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Top Bar */}
                        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 pdf-preview-topbar">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl">
                                    <DocumentArrowDownIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wider text-white">
                                        PDF Broadsheet On-Screen Preview
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-semibold">
                                        {selectedYearGroup} &bull; {selectedExamObj.title} &bull; {sortedPdfRows.length} Students &bull; {pdfPages.length} Page{pdfPages.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Center Navigation & Layout Controls */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                {/* View Mode Toggle */}
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-0.5 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setPdfViewMode('all')}
                                        className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                                            pdfViewMode === 'all'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        All Pages ({pdfPages.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPdfViewMode('single')}
                                        className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                                            pdfViewMode === 'single'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Page-by-Page
                                    </button>
                                </div>

                                {/* Page Switcher Buttons / Dropdown */}
                                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                                    <button
                                        type="button"
                                        disabled={pdfCurrentPage <= 1}
                                        onClick={() => setPdfCurrentPage(p => Math.max(1, p - 1))}
                                        className="px-2 py-0.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 font-black cursor-pointer"
                                        title="Previous Page"
                                    >
                                        ◀
                                    </button>
                                    <select
                                        value={pdfCurrentPage}
                                        onChange={e => setPdfCurrentPage(Number(e.target.value))}
                                        className="bg-transparent text-white font-mono font-bold text-[11px] cursor-pointer outline-none text-center"
                                    >
                                        {pdfPages.map((_, idx) => (
                                            <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                                                Page {idx + 1} of {pdfPages.length}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={pdfCurrentPage >= pdfPages.length}
                                        onClick={() => setPdfCurrentPage(p => Math.min(pdfPages.length, p + 1))}
                                        className="px-2 py-0.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 font-black cursor-pointer"
                                        title="Next Page"
                                    >
                                        ▶
                                    </button>
                                </div>

                                {/* Rows Per Page */}
                                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-300 text-[11px] font-bold">
                                    <span className="text-slate-400">Rows/Page:</span>
                                    <select
                                        value={pdfPageSize}
                                        onChange={e => {
                                            setPdfPageSize(Number(e.target.value));
                                            setPdfCurrentPage(1);
                                        }}
                                        className="bg-transparent text-white font-black cursor-pointer outline-none"
                                    >
                                        <option value={10} className="bg-slate-900">10</option>
                                        <option value={15} className="bg-slate-900">15</option>
                                        <option value={20} className="bg-slate-900">20</option>
                                        <option value={25} className="bg-slate-900">25</option>
                                        <option value={0} className="bg-slate-900">All</option>
                                    </select>
                                </div>

                                {/* Sort Order */}
                                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-300 text-[11px] font-bold">
                                    <span className="text-slate-400">Sort:</span>
                                    <select
                                        value={pdfSortOrder}
                                        onChange={e => setPdfSortOrder(e.target.value as any)}
                                        className="bg-transparent text-white font-black cursor-pointer outline-none"
                                    >
                                        <option value="rank" className="bg-slate-900">Rank (Highest First)</option>
                                        <option value="name" className="bg-slate-900">Name (A – Z)</option>
                                        <option value="adm" className="bg-slate-900">Admission No</option>
                                    </select>
                                </div>
                            </div>

                            {/* Right Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Print PDF
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Excel
                                </button>
                                <button
                                    onClick={() => setIsPdfPreviewOpen(false)}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all cursor-pointer"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Printable PDF Sheet Document (Paginated Pages) */}
                        <div className="p-6 overflow-y-auto bg-slate-950/60 flex-1 flex flex-col items-center gap-8 pdf-preview-pages-container">
                            {(pdfViewMode === 'single' ? [pdfPages[pdfCurrentPage - 1] || []] : pdfPages).map((pageRows, pageIdx) => {
                                const actualPageNum = pdfViewMode === 'single' ? pdfCurrentPage : pageIdx + 1;
                                const isLastPage = actualPageNum === pdfPages.length;
                                const startIdx = (actualPageNum - 1) * (pdfPageSize === 0 ? sortedPdfRows.length : pdfPageSize);

                                return (
                                    <div key={actualPageNum} className="w-full max-w-5xl flex flex-col items-center">
                                        {/* On-screen Page Badge Divider (in All Pages stacked mode) */}
                                        {pdfViewMode === 'all' && pdfPages.length > 1 && (
                                            <div className="w-full flex items-center justify-between mb-3 px-2 no-print">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono text-[10px] font-black uppercase tracking-widest">
                                                        Sheet {actualPageNum} of {pdfPages.length}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-semibold">
                                                        Students {startIdx + 1} &ndash; {startIdx + pageRows.length} of {sortedPdfRows.length}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPdfCurrentPage(actualPageNum);
                                                        setPdfViewMode('single');
                                                    }}
                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-wider cursor-pointer"
                                                >
                                                    Focus This Page ↗
                                                </button>
                                            </div>
                                        )}

                                        {/* The A4 Landscape Printable Sheet */}
                                        <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-200 w-full space-y-6 font-sans text-xs relative pdf-page-sheet">
                                            {/* Official Letterhead */}
                                            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                                                <div className="flex items-start gap-4">
                                                    {currentInstitution?.logoUrl && (
                                                        <img
                                                            src={currentInstitution.logoUrl}
                                                            alt="Logo"
                                                            className="w-14 h-14 object-contain rounded-lg border border-slate-200"
                                                        />
                                                    )}
                                                    <div>
                                                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                                            {currentInstitution?.name || 'ACADEMIC MANAGEMENT SYSTEM'}
                                                        </h1>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                                            OFFICIAL ACADEMIC BROADSHEET REPORT &bull; CONFIDENTIAL
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-slate-600 mt-1">
                                                            Class: <strong className="text-slate-900">{selectedYearGroup}</strong> | Exam: <strong className="text-slate-900">{selectedExamObj.title}</strong> | Term: <strong className="text-slate-900">{selectedExamObj.term || 'TERM 1'} {selectedExamObj.year || '2026'}</strong>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right flex flex-col items-end">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-widest rounded border border-slate-300">
                                                            OFFICIAL DOCUMENT
                                                        </span>
                                                        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-800 text-[10px] font-mono font-black uppercase tracking-widest rounded border border-indigo-200">
                                                            PAGE {actualPageNum} OF {pdfPages.length}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                                                        Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* PDF Broadsheet Table */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse text-[10px] border border-slate-900 text-left">
                                                    <thead className="bg-slate-900 text-white font-black uppercase tracking-wider text-[9px]">
                                                        <tr>
                                                            <th className="p-2 border border-slate-800">ADM NO</th>
                                                            <th className="p-2 border border-slate-800">STUDENT NAME</th>
                                                            {!isPrimarySchool && <th className="p-2 border border-slate-800 text-center">KCPE</th>}
                                                            <th className="p-2 border border-slate-800">CLASS</th>
                                                            {broadsheetSubjects.map(sub => (
                                                                <th key={sub.id} className="p-2 border border-slate-800 text-center">{sub.code || sub.name}</th>
                                                            ))}
                                                            <th className="p-2 border border-slate-800 text-center">TOTAL</th>
                                                            <th className="p-2 border border-slate-800 text-center">MEAN</th>
                                                            <th className="p-2 border border-slate-800 text-center">GRADE</th>
                                                            <th className="p-2 border border-slate-800 text-center">RANK</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-300 font-medium">
                                                        {pageRows.map((r, rowIdx) => (
                                                            <tr key={r.student?.id || rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                                <td className="p-2 font-bold font-mono border border-slate-300 text-slate-900">{getStudentAdmNo(r.student, startIdx + rowIdx, activeStudents) || r.student?.admissionNo || r.student?.id || 'N/A'}</td>
                                                                <td className="p-2 font-black border border-slate-300 uppercase">{r.student?.name}</td>
                                                                {!isPrimarySchool && <td className="p-2 border border-slate-300 text-center font-bold">{r.kcpe}</td>}
                                                                <td className="p-2 border border-slate-300">{(r.student as any)?.studentClass || selectedYearGroup}</td>
                                                                {broadsheetSubjects.map(sub => {
                                                                    const m = r.subjectMarksMap[sub.id];
                                                                    return (
                                                                        <td key={sub.id} className="p-2 border border-slate-300 text-center font-bold">
                                                                            {m ? `${m.score} ${m.grade}` : '-'}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-2 border border-slate-300 text-center font-black">{r.total}</td>
                                                                <td className="p-2 border border-slate-300 text-center font-bold">{r.meanScore}</td>
                                                                <td className="p-2 border border-slate-300 text-center font-black text-indigo-700">{r.meanGrade}</td>
                                                                <td className="p-2 border border-slate-300 text-center font-black">#{r.overallPos}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    {/* Footer: Subject Means on Last Page OR Continuation Note */}
                                                    {isLastPage ? (
                                                        <tfoot className="bg-slate-200 text-slate-900 font-black text-[9px] uppercase border-t-2 border-slate-900">
                                                            <tr>
                                                                <td colSpan={!isPrimarySchool ? 4 : 3} className="p-2 border border-slate-400">SUBJECT MEANS</td>
                                                                {broadsheetSubjects.map(sub => {
                                                                    const f = subjectFooterMeans[sub.id];
                                                                    return (
                                                                        <td key={sub.id} className="p-2 border border-slate-400 text-center">
                                                                            {f ? `${f.meanScore} (${f.meanGrade})` : '-'}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td colSpan={4} className="p-2 border border-slate-400 text-center font-bold text-slate-900">
                                                                    CLASS MEAN: {classMeanInfo.meanScore} ({classMeanInfo.meanGrade})
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    ) : (
                                                        <tfoot className="bg-slate-100 text-slate-600 font-bold text-[9px] uppercase border-t border-slate-400">
                                                            <tr>
                                                                <td colSpan={broadsheetSubjects.length + (!isPrimarySchool ? 8 : 7)} className="p-2 text-center italic tracking-wider">
                                                                    Continued on Page {actualPageNum + 1} of {pdfPages.length}... (Showing Students {startIdx + 1} &ndash; {startIdx + pageRows.length} of {sortedPdfRows.length})
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    )}
                                                </table>
                                            </div>

                                            {/* Official Signatures - On Last Page */}
                                            {isLastPage && (
                                                <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-[10px]">
                                                    <div>
                                                        <p className="font-bold text-slate-500 uppercase tracking-wider">Class Teacher Signature</p>
                                                        <div className="mt-4 border-b border-slate-400 w-36"></div>
                                                        <p className="text-[9px] text-slate-400 mt-1">Date: _________________</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-500 uppercase tracking-wider">HOD Examination / Academics</p>
                                                        <div className="mt-4 border-b border-slate-400 w-36"></div>
                                                        <p className="text-[9px] text-slate-400 mt-1">Date: _________________</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-500 uppercase tracking-wider">Principal / Headteacher Stamp</p>
                                                        <div className="mt-4 border-b border-slate-400 w-36"></div>
                                                        <p className="text-[9px] text-slate-400 mt-1">Official Seal</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sheet Bottom Meta Bar */}
                                            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                                                <span>EduAI Academic Broadsheet &bull; {selectedYearGroup} &bull; {selectedExamObj.title}</span>
                                                <span className="font-black text-slate-600">PAGE {actualPageNum} OF {pdfPages.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Embedded print styles */}
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden !important;
                            }
                            .pdf-preview-modal-root,
                            .pdf-preview-modal-root * {
                                visibility: visible !important;
                            }
                            .pdf-preview-modal-root {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                background: white !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                overflow: visible !important;
                                z-index: 999999 !important;
                            }
                            .pdf-preview-topbar,
                            .no-print {
                                display: none !important;
                            }
                            .pdf-preview-pages-container {
                                background: white !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                gap: 0 !important;
                                overflow: visible !important;
                            }
                            .pdf-page-sheet {
                                page-break-after: always !important;
                                break-after: page !important;
                                box-shadow: none !important;
                                border: none !important;
                                margin: 0 !important;
                                padding: 8mm 6mm !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                border-radius: 0 !important;
                            }
                            .pdf-page-sheet:last-child {
                                page-break-after: auto !important;
                                break-after: auto !important;
                            }
                            @page {
                                size: A4 landscape;
                                margin: 5mm;
                            }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};
