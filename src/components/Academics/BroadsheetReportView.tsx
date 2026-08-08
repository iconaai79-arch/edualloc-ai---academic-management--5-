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
import * as XLSX from 'xlsx';

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
    const activeStudents = useMemo(() => {
        if (students.length > 0) return students;
        return users.filter(u => u.role === 'student');
    }, [students, users]);

    // Navigation & Drawer states
    const [activeNavItem, setActiveNavItem] = useState<string>('broadsheet');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);

    // Exam & Year states
    const [expandedYear, setExpandedYear] = useState<string>('2026');
    const [selectedExamId, setSelectedExamId] = useState<string>(assessments[0]?.id || 'exam_midterm_1');
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('');
    const [selectedStream, setSelectedStream] = useState<string>('all');

    // Search student in broadsheet
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(25);

    const instId = currentInstitution?.id || 'default_inst';

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



    // Student broadsheet list (combining real saved marks and fallback sample students)
    const sampleStudents = useMemo(() => {
        const savedRows = savedBroadsheets[selectedExamId];
        if (savedRows && Array.isArray(savedRows) && savedRows.length > 0) {
            return savedRows.map((stRow, idx) => {
                const subjectMarksMap: Record<string, { score: number; grade: string }> = {};
                let total = 0;
                let totalPts = 0;
                let validCount = 0;

                broadsheetSubjects.forEach(sub => {
                    const subName = sub.name || (sub as any).title || '';
                    const sClean = subName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    
                    let subTotal = 0;
                    let hasMark = false;

                    Object.entries(stRow).forEach(([k, val]) => {
                        if (['admNo', 'name', 'class', 'kcpe'].includes(k)) return;
                        if (typeof val !== 'number' || isNaN(val)) return;

                        const kNorm = k.toLowerCase();
                        const sNorm = sClean.toLowerCase();
                        const subNameNorm = subName.toLowerCase().replace(/[^a-z0-9]/g, '');

                        const isMatch =
                            kNorm.includes(sNorm) ||
                            (subNameNorm.length >= 3 && kNorm.includes(subNameNorm)) ||
                            (subNameNorm.includes('math') && (kNorm.includes('math') || kNorm.includes('mathp1') || kNorm.includes('mathp2'))) ||
                            (subNameNorm.includes('eng') && (kNorm.includes('eng') || kNorm.includes('engp1') || kNorm.includes('engp2'))) ||
                            (subNameNorm.includes('kisw') && (kNorm.includes('kisw') || kNorm.includes('kiswp1'))) ||
                            (subNameNorm.includes('bio') && (kNorm.includes('bio') || kNorm.includes('biop1')));

                        if (isMatch) {
                            subTotal += val;
                            hasMark = true;
                        }
                    });

                    if (hasMark) {
                        const { grade, points } = getGradeInfo(subTotal, isPrimarySchool);
                        subjectMarksMap[sub.id] = { score: subTotal, grade };
                        total += subTotal;
                        totalPts += points;
                        validCount++;
                    }
                });

                const meanPts = validCount > 0 ? parseFloat((totalPts / validCount).toFixed(4)) : 0;
                const meanScore = validCount > 0 ? parseFloat((total / validCount).toFixed(1)) : 0;
                const { grade: meanGrade } = getGradeInfo(meanScore, isPrimarySchool);

                // Try to resolve exact student from activeStudents database
                const rowNameClean = String(stRow.name || (stRow.student as any)?.name || '').trim().toLowerCase();
                const rowAdmClean = String(stRow.admNo || stRow.admissionNo || stRow.admission_no || (stRow.student as any)?.admissionNo || (stRow.student as any)?.admNo || '').trim().toLowerCase();

                const dbStudent = activeStudents.find(s => {
                    const sName = String(s.name || '').trim().toLowerCase();
                    const sAdm = String((s as any).admissionNo || (s as any).admNo || (s as any).registrationNo || (s as any).adm_no || s.id || '').trim().toLowerCase();
                    return (rowAdmClean && sAdm === rowAdmClean) ||
                           (rowNameClean && sName === rowNameClean) ||
                           (rowNameClean && (sName.includes(rowNameClean) || rowNameClean.includes(sName)));
                });

                const rawAdm = dbStudent
                    ? ((dbStudent as any).admissionNo || (dbStudent as any).admNo || (dbStudent as any).registrationNo || dbStudent.id)
                    : (stRow.admNo || stRow.admissionNo || stRow.admission_no || (stRow.student as any)?.admissionNo || (stRow.student as any)?.admNo || String(1001 + idx));

                const realAdmNo = String(rawAdm).trim() || String(1001 + idx);
                const realClass = stRow.class || (stRow.student as any)?.studentClass || selectedYearGroup || 'Grade 6';

                return {
                    student: {
                        id: realAdmNo,
                        name: stRow.name || (stRow.student as any)?.name || `Student ${idx + 1}`,
                        admissionNo: realAdmNo,
                        studentClass: realClass
                    },
                    kcpe: 250 + (idx * 5) % 150,
                    entry: 8,
                    subjectMarksMap,
                    total,
                    meanScore,
                    meanGrade,
                    meanPts,
                    vap: 1.5
                };
            }).sort((a, b) => b.total - a.total).map((r, idx) => ({
                ...r,
                overallPos: idx + 1,
                streamPos: (idx % 5) + 1
            }));
        }

        const currentGroup = selectedYearGroup || 'Grade 6';
        const raw = activeStudents.length > 0 ? activeStudents : [
            { id: '2008', name: 'Maxine Jelimo', admissionNo: '2008', studentClass: `${currentGroup} Central` },
            { id: '2244', name: 'Dennis Kiplagat', admissionNo: '2244', studentClass: `${currentGroup} East` },
            { id: '1897', name: 'Felix Kipkosgei', admissionNo: '1897', studentClass: `${currentGroup} East` },
            { id: '1712', name: 'Job Kipkorir Kipkoech', admissionNo: '1712', studentClass: `${currentGroup} South` },
            { id: '2127', name: 'Linett Chepkorir Agui', admissionNo: '2127', studentClass: `${currentGroup} East` },
            { id: '1838', name: 'Emmanuel Kiptoo', admissionNo: '1838', studentClass: `${currentGroup} East` },
            { id: '1834', name: 'Gervasy Kiptoo', admissionNo: '1834', studentClass: `${currentGroup} East` },
            { id: '1972', name: 'Kelvin Kiprugo', admissionNo: '1972', studentClass: `${currentGroup} East` },
            { id: '1957', name: 'Shamir Lokapel', admissionNo: '1957', studentClass: `${currentGroup} West` },
            { id: '1967', name: 'Michell Chepleting', admissionNo: '1967', studentClass: `${currentGroup} West` },
            { id: '1898', name: 'Abigael Kimutai', admissionNo: '1898', studentClass: `${currentGroup} East` },
            { id: '2117', name: 'Mercy Jerono', admissionNo: '2117', studentClass: `${currentGroup} West` },
            { id: '1883', name: 'Muthoni Ann Nyaguthie', admissionNo: '1883', studentClass: `${currentGroup} Central` },
            { id: '1861', name: 'Junior Kahama', admissionNo: '1861', studentClass: `${currentGroup} West` },
            { id: '1848', name: 'Isaac Kipteting', admissionNo: '1848', studentClass: `${currentGroup} Central` },
            { id: '1853', name: 'Dennis Maina Kipkemboi', admissionNo: '1853', studentClass: `${currentGroup} South` },
            { id: '1924', name: 'Judith Jepleting', admissionNo: '1924', studentClass: `${currentGroup} East` },
            { id: '1863', name: 'Joy Jerotich', admissionNo: '1863', studentClass: `${currentGroup} East` },
            { id: '1904', name: 'Yvonne Jepleting', admissionNo: '1904', studentClass: `${currentGroup} Central` },
            { id: '1933', name: 'Leah Jerotich Kimutai', admissionNo: '1933', studentClass: `${currentGroup} East` },
            { id: '1856', name: 'Abigael Jepchumba', admissionNo: '1856', studentClass: `${currentGroup} Central` },
            { id: '1908', name: 'Emmanuel Kipkirui Simatei', admissionNo: '1908', studentClass: `${currentGroup} West` },
            { id: '1872', name: 'Marion Jerop Kemei', admissionNo: '1872', studentClass: `${currentGroup} East` },
            { id: '1947', name: 'Emmanuel Kipkorir', admissionNo: '1947', studentClass: `${currentGroup} South` },
        ];

        return raw.map((st, idx) => {
            const kcpe = 220 + ((idx * 17) % 180);
            const entry = 8 + (idx % 2);
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

            const realAdmNo = (st as any).admissionNo || (st as any).admission_no || (st as any).admNo || (st as any).adm_no || (st as any).registrationNo || (st as any).staffId || (st as any).metadata?.admissionNo || (st as any).metadata?.admNo || st.id;
            const realClass = (st as any).studentClass || (st as any).classLevel || (st as any).class_name || (st as any).class || `${currentGroup} Central`;

            return {
                student: {
                    ...st,
                    admissionNo: realAdmNo,
                    studentClass: realClass
                },
                kcpe,
                entry,
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

    // Filtered student rows
    const filteredBroadsheetRows = useMemo(() => {
        return sampleStudents.filter(r => {
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

    // Export Broadsheet Excel
    const handleExportExcel = () => {
        const exportData = filteredBroadsheetRows.map(r => {
            const rowObj: any = {
                'ID': r.student.admissionNo || r.student.id,
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

            {/* COLUMN 2: EXAM HISTORY COLUMN */}
            <div className="w-full lg:w-60 shrink-0 space-y-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
                        EXAM HISTORY & SESSIONS
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
                                                        onClick={() => setSelectedExamId(exam.id)}
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
                                    onClick={() => window.print()}
                                    className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5"
                                >
                                    <PrinterIcon className="w-4 h-4" /> Print
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Download Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search & Results Info */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search student name or admission no..."
                                className="form-input text-xs pl-9 py-2"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        </div>

                        <div className="text-xs font-bold text-slate-500">
                            Showing <strong className="text-slate-900 dark:text-white">{filteredBroadsheetRows.length}</strong> Students in Broadsheet
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
                                {paginatedRows.map(row => (
                                    <tr key={row.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3 font-mono font-bold text-slate-500">{row.student.admissionNo || row.student.id}</td>
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
                                        INSTITUTIONAL MEAN: 2.8890 (D)
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
        </div>
    );
};
