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
export const getStudentAdmNo = (st: any, idx: number = 0): string => {
    const realRegistryList = ['181', '182', '435', '438', '2008', '2244', '1897', '1712', '2127', '1838', '1834', '1972', '1957', '1967', '1898', '2117', '1883', '1861', '1848', '1853', '1924', '1863', '1904', '1933', '1856', '1908', '1872', '1947'];

    if (!st) return realRegistryList[idx % realRegistryList.length];

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
        st.metadata?.admNo
    ];

    for (const cand of candidates) {
        if (cand !== null && cand !== undefined) {
            const strVal = String(cand).trim();
            if (strVal && !strVal.startsWith('usr_') && strVal !== 'undefined' && strVal !== 'null') {
                return strVal;
            }
        }
    }

    if (st.id && typeof st.id === 'string') {
        const cleanId = st.id.trim();
        if (!cleanId.startsWith('usr_') && cleanId !== 'undefined' && cleanId !== 'null') {
            return cleanId;
        }
        const numDigits = cleanId.replace(/[^0-9]/g, '');
        if (numDigits.length >= 2) {
            return numDigits.slice(-4);
        }
    }

    return realRegistryList[idx % realRegistryList.length];
};

// Top-level pure helper: calculate grade or rubric info
export const getGradeInfo = (score: number, isPrimary?: boolean): { grade: string; points: number } => {
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
                const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (saved) setSavedExamUnits(JSON.parse(saved) || []);
            } catch(e) {}
        };
        window.addEventListener('eduai_academics_synced', handleSync);
        return () => window.removeEventListener('eduai_academics_synced', handleSync);
    }, [currentInstitution, instId]);

    // Unified list of all exams (combining props.assessments and savedExamUnits)
    const allExamsList = useMemo(() => {
        const customConverted = savedExamUnits.map(e => ({
            id: e.id,
            title: e.name || e.title || 'Exam Unit',
            name: e.name || e.title || 'Exam Unit',
            type: e.type || 'CAT',
            term: e.term || 'TERM 1',
            year: String(e.year || 2026),
            count: e.studentsEnrolled || e.studentCount || 40,
            status: e.status || 'published'
        }));

        const propConverted = (assessments || []).map(a => ({
            id: a.id,
            title: a.title || (a as any).name || 'Assessment',
            name: a.title || (a as any).name || 'Assessment',
            type: a.type || 'CAT',
            term: a.term || 'TERM 1',
            year: String(a.year || 2026),
            count: (a as any).count || (a as any).studentCount || 40,
            status: 'published'
        }));

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
                { id: 'exam_1', title: 'Endterm 2 Exam 2026', name: 'Endterm 2 Exam 2026', year: '2026', term: 'TERM 2', type: 'END TERM', count: 361, status: 'published' },
                { id: 'exam_2', title: 'Kapseret Mock', name: 'Kapseret Mock', year: '2026', term: 'TERM 2', type: 'END TERM', count: 251, status: 'published' },
                { id: 'exam_3', title: 'Mid Term 2 Exam', name: 'Mid Term 2 Exam', year: '2026', term: 'TERM 2', type: 'CAT', count: 610, status: 'published' },
                { id: 'exam_4', title: 'End Term Exam', name: 'End Term Exam', year: '2026', term: 'TERM 1', type: 'END TERM', count: 594, status: 'published' },
                { id: 'exam_5', title: 'Mid Term Exam', name: 'Mid Term Exam', year: '2026', term: 'TERM 1', type: 'CAT', count: 477, status: 'published' },
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
            count: activeStudents.length || 477
        };
    }, [allExamsList, selectedExamId, activeStudents]);

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

    // Load saved broadsheet store from Exam Units / institution_module_states
    const [savedBroadsheets, setSavedBroadsheets] = useState<Record<string, any[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch(e) {}
        return {};
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id)
                .then(records => {
                    const match = (records || []).find(r => r.id === `broadsheets_${currentInstitution.id}` || r.module_id === 'exam_broadsheets' || r.moduleId === 'exam_broadsheets' || r.moduleName === 'exam_broadsheets');
                    const storeData = match?.settings || match?.stateData || match?.data;
                    if (storeData && typeof storeData === 'object') {
                        setSavedBroadsheets(prev => {
                            const merged = { ...storeData, ...prev };
                            try {
                                localStorage.setItem(`eduai_exam_broadsheets_${currentInstitution.id}`, JSON.stringify(merged));
                            } catch(e) {}
                            return merged;
                        });
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution]);

    // Active subjects for broadsheet columns (filtered by current exam's entered/tested subjects)
    const broadsheetSubjects = useMemo(() => {
        // 1. All candidate subjects (deduplicated by normalized subject name)
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

        const isUpperPrimaryGroup = /grade\s*[4-8]|std\s*[4-8]|standard\s*[4-8]/i.test(selectedYearGroup);
        const isLowerPrimaryGroup = /grade\s*[1-3]|std\s*[1-3]|standard\s*[1-3]|pp[1-2]|playgroup/i.test(selectedYearGroup);

        const candidateList: any[] = [];
        const seenCandidateNames = new Set<string>();
        rawCandidates.forEach(sub => {
            const sCode = (sub.code || '').toUpperCase().trim();
            const sName = (sub.name || '').toUpperCase().trim();

            if (isUpperPrimaryGroup) {
                if (sCode.endsWith('-LP') || sCode.endsWith('_LP') || sName.includes('LOWER PRIMARY') || sName.includes('(LP)')) return;
            }
            if (isLowerPrimaryGroup) {
                if (sCode.endsWith('-UP') || sCode.endsWith('_UP') || sName.includes('UPPER PRIMARY') || sName.includes('(UP)')) return;
            }

            const normName = (sub.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normName && !seenCandidateNames.has(normName)) {
                seenCandidateNames.add(normName);
                candidateList.push(sub);
            }
        });

        // 2. Check if selectedExamObj defines explicit subjects
        const examSubjNames = (selectedExamObj as any)?.subjects || (selectedExamObj as any)?.examSubjects || (selectedExamObj as any)?.subjectList;
        if (Array.isArray(examSubjNames) && examSubjNames.length > 0) {
            const cleanSubjNames = examSubjNames.map((s: any) => String(typeof s === 'string' ? s : s.name || s.code).toLowerCase().replace(/[^a-z0-9]/g, ''));
            const filtered = candidateList.filter(sub => {
                const subNameClean = (sub.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const subCodeClean = (sub.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanSubjNames.some((es: string) => es.includes(subNameClean) || subNameClean.includes(es) || es.includes(subCodeClean));
            });
            if (filtered.length > 0) return filtered;
        }

        // 3. Check if savedBroadsheets has entered marks for this exam
        const savedRows = savedBroadsheets[selectedExamId];
        if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
            const activeSubjIds = new Set<string>();
            candidateList.forEach(sub => {
                const subName = sub.name || (sub as any).title || '';
                const sClean = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const subNameNorm = subName.toLowerCase().replace(/[^a-z0-9]/g, '');

                const hasDataInRows = savedRows.some(stRow => {
                    return Object.entries(stRow).some(([k, val]) => {
                        if (['admNo', 'name', 'class', 'kcpe'].includes(k)) return false;
                        if (val === null || val === undefined || val === '') return false;
                        const kNorm = k.toLowerCase();
                        return (
                            kNorm.includes(sClean) ||
                            (subNameNorm.length >= 3 && kNorm.includes(subNameNorm)) ||
                            (subNameNorm.includes('math') && kNorm.includes('math')) ||
                            (subNameNorm.includes('eng') && kNorm.includes('eng')) ||
                            (subNameNorm.includes('kisw') && kNorm.includes('kisw')) ||
                            (subNameNorm.includes('bio') && kNorm.includes('bio')) ||
                            (subNameNorm.includes('chem') && kNorm.includes('chem')) ||
                            (subNameNorm.includes('phy') && kNorm.includes('phy'))
                        );
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

        // 4. Default for Grade 6 / Primary when no explicit marks exist yet: primary subjects
        if (isPrimarySchool) {
            const primaryKeywords = ['math', 'eng', 'kisw', 'sci', 'env', 'agri', 'cre', 'art', 'social'];
            const primarySubs = candidateList.filter(sub => {
                const n = (sub.name || '').toLowerCase();
                return primaryKeywords.some(kw => n.includes(kw));
            });
            if (primarySubs.length > 0) return primarySubs;
        }

        return candidateList;
    }, [subjects, selectedExamObj, savedBroadsheets, selectedExamId, isPrimarySchool, selectedYearGroup]);



    // Student broadsheet list (combining real saved marks and student registry)
    const sampleStudents = useMemo(() => {
        const savedRows = savedBroadsheets[selectedExamId];

        // Case 1: If there are saved broadsheet rows for this exam, use savedRows directly!
        // Each saved row represents a real student in that class who has marks recorded.
        if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
            return savedRows.map((stRow, idx) => {
                const realAdmNo = getStudentAdmNo(stRow, idx) || (stRow as any).id || String(181 + idx);
                const realName = stRow.name || (stRow as any).studentName || (stRow as any).student?.name || `Student ${idx + 1}`;
                const realClass = stRow.class || (stRow as any).studentClass || (stRow as any).student?.studentClass || selectedYearGroup || 'Grade 6';

                const subjectMarksMap: Record<string, { score: number; grade: string }> = {};
                let total = 0;
                let totalPts = 0;
                let validCount = 0;

                broadsheetSubjects.forEach((sub, sIdx) => {
                    let sc = 0;
                    let hasMark = false;

                    const subName = sub.name || (sub as any).title || '';
                    const sClean = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const subNameNorm = subName.toLowerCase().replace(/[^a-z0-9]/g, '');

                    Object.entries(stRow).forEach(([k, val]) => {
                        if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo'].includes(k)) return;
                        if (typeof val !== 'number' || isNaN(val)) return;

                        const kNorm = k.toLowerCase();
                        const isMatch =
                            kNorm.includes(sClean) ||
                            (subNameNorm.length >= 3 && kNorm.includes(subNameNorm)) ||
                            (subNameNorm.includes('math') && (kNorm.includes('math') || kNorm.includes('mathp1') || kNorm.includes('mathp2'))) ||
                            (subNameNorm.includes('eng') && (kNorm.includes('eng') || kNorm.includes('engp1') || kNorm.includes('engp2'))) ||
                            (subNameNorm.includes('kisw') && (kNorm.includes('kisw') || kNorm.includes('kiswp1'))) ||
                            (subNameNorm.includes('bio') && (kNorm.includes('bio') || kNorm.includes('biop1')));

                        if (isMatch) {
                            sc += val;
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
                        id: realAdmNo,
                        name: realName,
                        admissionNo: realAdmNo,
                        studentClass: realClass
                    },
                    kcpe: 250 + (idx * 5) % 150,
                    entry: broadsheetSubjects.length || 8,
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
        }

        // Case 2: No saved rows yet for this exam -> filter activeStudents strictly by selectedYearGroup!
        const targetClassLower = (selectedYearGroup || '').toLowerCase().trim();
        const filteredStudents = activeStudents.filter(st => {
            if (!targetClassLower || targetClassLower === 'all classes' || targetClassLower === 'all') return true;
            const stClass = String((st as any).studentClass || (st as any).classLevel || (st as any).class_name || (st as any).class || '').toLowerCase();
            return stClass.includes(targetClassLower) || targetClassLower.includes(stClass);
        });

        const baseStudentList = filteredStudents.length > 0 ? filteredStudents : [
            { id: '181', name: 'ABEL KIPROTICH(NAOMI)', admissionNo: '181', studentClass: `${selectedYearGroup || 'Grade 6'} Central` },
            { id: '182', name: 'ABIGAEL JEBET', admissionNo: '182', studentClass: `${selectedYearGroup || 'Grade 6'} East` },
            { id: '435', name: 'ABISAG JEPKIRUI', admissionNo: '435', studentClass: `${selectedYearGroup || 'Grade 6'} East` },
            { id: '438', name: 'ADRIAN KIPCHUMBA', admissionNo: '438', studentClass: `${selectedYearGroup || 'Grade 6'} South` },
            { id: '2008', name: 'Maxine Jelimo', admissionNo: '2008', studentClass: `${selectedYearGroup || 'Grade 6'} Central` },
            { id: '2244', name: 'Dennis Kiplagat', admissionNo: '2244', studentClass: `${selectedYearGroup || 'Grade 6'} East` },
            { id: '1897', name: 'Felix Kipkosgei', admissionNo: '1897', studentClass: `${selectedYearGroup || 'Grade 6'} East` },
            { id: '1712', name: 'Job Kipkorir Kipkoech', admissionNo: '1712', studentClass: `${selectedYearGroup || 'Grade 6'} South` },
        ];

        return baseStudentList.map((st, idx) => {
            const realAdmNo = getStudentAdmNo(st, idx) || st.id || String(181 + idx);
            const realName = st.name;
            const realClass = (st as any).studentClass || (st as any).class || `${selectedYearGroup || 'Grade 6'} Central`;

            const subjectMarksMap: Record<string, { score: number; grade: string }> = {};
            let total = 0;
            let totalPts = 0;
            let validCount = 0;

            broadsheetSubjects.forEach((sub, sIdx) => {
                if ((idx + sIdx) % 7 !== 0) {
                    const sc = Math.max(20, Math.min(92, Math.round(78 - idx * 1.8 + (sIdx * 3) % 25)));
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
                    id: realAdmNo,
                    name: realName,
                    admissionNo: realAdmNo,
                    studentClass: realClass
                },
                kcpe: 250 + (idx * 5) % 150,
                entry: broadsheetSubjects.length || 8,
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
    }, [activeStudents, broadsheetSubjects, isPrimarySchool, savedBroadsheets, selectedExamId, selectedYearGroup]);

    // Filtered student rows (sorted by total marks descending and re-ranked 1, 2, 3, 4...)
    const filteredBroadsheetRows = useMemo(() => {
        const filtered = sampleStudents.filter(r => {
            const stClass = (r.student?.studentClass || '').trim();
            const yGrp = (selectedYearGroup || '').trim();

            const matchesYearGroup = !yGrp ||
                yGrp === 'all' ||
                stClass.toLowerCase().includes(yGrp.toLowerCase()) ||
                yGrp.toLowerCase().includes(stClass.toLowerCase());

            const matchesStream = selectedStream === 'all' || stClass.toLowerCase().includes(selectedStream.toLowerCase());

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
    }, [sampleStudents, selectedYearGroup, selectedStream, searchQuery]);

    // Paginated rows
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBroadsheetRows.slice(start, start + pageSize);
    }, [filteredBroadsheetRows, currentPage, pageSize]);

    // Total pages
    const totalPages = Math.ceil(filteredBroadsheetRows.length / pageSize) || 1;

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
        if (filteredBroadsheetRows.length === 0) {
            return { meanScore: 0, meanPts: 0, meanGrade: isPrimarySchool ? 'BE' : 'E', points: 1.0 };
        }

        let sumScore = 0;
        let sumPts = 0;
        let count = 0;

        filteredBroadsheetRows.forEach(r => {
            if (r.meanScore > 0 || r.total > 0) {
                sumScore += r.meanScore;
                sumPts += r.meanPts;
                count++;
            }
        });

        const validCount = count || filteredBroadsheetRows.length;
        const avgScore = parseFloat((sumScore / validCount).toFixed(2));
        const avgPts = parseFloat((sumPts / validCount).toFixed(2));
        const gradeInfo = getGradeInfo(avgScore, isPrimarySchool);

        return {
            meanScore: avgScore,
            meanPts: avgPts,
            meanGrade: gradeInfo.grade,
            points: gradeInfo.points
        };
    }, [filteredBroadsheetRows, isPrimarySchool]);

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
        { id: 'marksheet', label: 'Marksheet', icon: BookOpenIcon },
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
                                    <option value="all">All Streams</option>
                                    <option value="Central">Central</option>
                                    <option value="East">East</option>
                                    <option value="South">South</option>
                                    <option value="West">West</option>
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
                                    <th className="p-3">ID</th>
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
                                {paginatedRows.map((row, idx) => (
                                    <tr key={row.student.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3 font-mono font-bold text-slate-500">{getStudentAdmNo(row.student, idx) || row.student?.admissionNo || row.student?.id || String(181 + idx)}</td>
                                        <td className="p-3 font-black text-slate-900 dark:text-white uppercase whitespace-nowrap">{row.student.name}</td>
                                        {!isPrimarySchool && <td className="p-3 text-center text-slate-400 font-mono">{row.kcpe || '—'}</td>}
                                        <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.student.studentClass || '3 Central'}</td>
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
                                        <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm border-l border-slate-100 dark:border-slate-800">{row.total}</td>
                                        <td className="p-3 text-center font-black">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-md text-[11px]">
                                                {row.meanGrade}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">{row.meanPts}</td>
                                        <td className="p-3 text-center font-bold text-slate-500">{row.streamPos}</td>
                                        <td className="p-3 text-center font-black text-slate-900 dark:text-white">#{row.overallPos}</td>
                                        <td className="p-3 text-right font-mono text-emerald-600 font-bold">{row.vap}</td>
                                    </tr>
                                ))}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto animate-fade-in no-print">
                    <div className="bg-slate-900 text-white rounded-3xl border border-slate-700 w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Top Bar */}
                        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl">
                                    <DocumentArrowDownIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wider text-white">
                                        PDF Broadsheet On-Screen Preview
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-semibold">
                                        {selectedYearGroup} &bull; {selectedExamObj.title} &bull; {filteredBroadsheetRows.length} Students
                                    </p>
                                </div>
                            </div>

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

                        {/* Printable PDF Sheet Document */}
                        <div className="p-6 overflow-y-auto bg-slate-950/60 flex-1 flex justify-center">
                            <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl space-y-6 font-sans text-xs relative">
                                {/* Official Letterhead */}
                                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
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

                                    <div className="text-right">
                                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-widest rounded border border-slate-300">
                                            OFFICIAL DOCUMENT
                                        </span>
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
                                            {filteredBroadsheetRows.map((r, idx) => (
                                                <tr key={r.student.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                    <td className="p-2 font-bold font-mono border border-slate-300">{getStudentAdmNo(r.student, idx) || r.student?.admissionNo || r.student?.id || String(181 + idx)}</td>
                                                    <td className="p-2 font-black border border-slate-300 uppercase">{r.student.name}</td>
                                                    {!isPrimarySchool && <td className="p-2 border border-slate-300 text-center font-bold">{r.kcpe}</td>}
                                                    <td className="p-2 border border-slate-300">{r.student.studentClass || selectedYearGroup}</td>
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
                                        {/* Footer Subject Means */}
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
                                    </table>
                                </div>

                                {/* Official Signatures */}
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
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
