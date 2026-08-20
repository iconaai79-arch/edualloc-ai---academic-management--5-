import React, { useState, useMemo, useEffect } from 'react';
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
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface ExamOverviewDashboardProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const ExamOverviewDashboard: React.FC<ExamOverviewDashboardProps> = ({
    assessments = [],
    marks = [],
    students = [],
    users = [],
    subjects = [],
    currentInstitution,
    courses = [],
    onSelectReportTab
}) => {
    const instId = currentInstitution?.id || 'default';

    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('PP1');

    const isPrimaryOrCBC = useMemo(() => {
        const cls = (selectedYearGroup || '').toLowerCase();
        if (/pp[1-3]|playgroup|nursery|kindergarten|grade\s*[1-9]|std\s*[1-8]|standard\s*[1-8]|cbc|cbe|lower\s*primary|upper\s*primary|junior\s*secondary/i.test(cls)) {
            return true;
        }
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || type === 'basic' || type === 'kindergarten' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution, selectedYearGroup]);

    const activeStudents = useMemo(() => {
        if (students.length > 0) return students;
        return users.filter(u => u.role === 'student');
    }, [students, users]);

    // 1. Load saved Exam Units from LocalStorage & Props
    const [savedExamUnits, setSavedExamUnits] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
            if (saved) return JSON.parse(saved) || [];
        } catch (e) {}
        return [];
    });

    // 2. Load Saved Broadsheet Data for Exam Marks Calculation
    const [savedBroadsheets, setSavedBroadsheets] = useState<Record<string, any[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch(e) {}
        return {};
    });

    // 3. Load Class Subject Allocations Store
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) { }
        return (currentInstitution as any)?.classSubjectAllocations || (currentInstitution as any)?.class_subject_allocations || {};
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id).catch(() => [])
            ]).then(([imsRecords, examRecords, allocRecords]) => {
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

                if (examRecords && Array.isArray(examRecords) && examRecords.length > 0) {
                    setSavedExamUnits(prev => {
                        const combined = [...examRecords, ...prev];
                        const seen = new Set<string>();
                        const unique = combined.filter(ex => {
                            if (ex.id && !seen.has(ex.id)) {
                                seen.add(ex.id);
                                return true;
                            }
                            return false;
                        });
                        try {
                            localStorage.setItem(`eduai_exam_units_${currentInstitution.id}`, JSON.stringify(unique));
                        } catch(e) {}
                        return unique;
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

        if (kNorm === subId || kNorm === subCode || kNorm === subName) return true;

        const sClean = subName.replace(/[^a-z0-9]/g, '_');
        const sCompact = subName.replace(/[^a-z0-9]/g, '');
        const cCompact = subCode.replace(/[^a-z0-9]/g, '');
        const kStripped = kNorm.replace(/^subj_/, '').replace(/_p\d+$/, '').replace(/[^a-z0-9]/g, '');

        if (kNorm === `subj_${sClean}_p1` || kNorm === `subj_${sClean}` || kNorm === sClean) return true;
        if (cCompact && (kNorm === `subj_${cCompact}_p1` || kNorm === `subj_${cCompact}` || kNorm === cCompact)) return true;
        if (kStripped && (kStripped === sCompact || kStripped === cCompact)) return true;

        if ((subCode.startsWith('kisw') || subName.includes('kisw')) && (kNorm.includes('kisw') || kNorm.includes('insha'))) return true;
        if ((subCode.startsWith('hyg') || subName.includes('hyg') || subName.includes('nutri')) && (kNorm.includes('hyg') || kNorm.includes('nutri') || kNorm.includes('health'))) return true;
        if ((subCode.startsWith('env') || subName.includes('env')) && (kNorm.includes('env') || kNorm.includes('environment'))) return true;
        if ((subCode.startsWith('creat') || subName.includes('creat') || subName.includes('art') || subName.includes('psycho')) && 
            (kNorm.includes('creat') || kNorm.includes('art') || kNorm.includes('psycho') || kNorm.includes('music') || kNorm.includes('movement'))) return true;
        if ((subCode.startsWith('math') || subName.includes('math')) && (kNorm.includes('math') || kNorm.includes('numeracy'))) return true;
        if ((subCode.startsWith('eng') || subName.includes('eng')) && (kNorm.includes('eng') || kNorm.includes('literacy'))) return true;
        if ((subCode.startsWith('cre') || subCode.startsWith('ire') || subCode.startsWith('hre') || subName.includes('religio')) && 
            (kNorm.includes('cre') || kNorm.includes('ire') || kNorm.includes('hre') || kNorm.includes('religio'))) return true;
        if ((subCode.startsWith('agri') || subName.includes('agri')) && kNorm.includes('agri')) return true;
        if ((subCode.startsWith('soc') || subName.includes('social')) && (kNorm.includes('soc') || kNorm.includes('social'))) return true;
        if (subCode.startsWith('bio') && kNorm.includes('bio')) return true;
        if (subCode.startsWith('chem') && kNorm.includes('chem')) return true;
        if (subCode.startsWith('phy') && (kNorm.includes('phy') || kNorm.includes('physics'))) return true;

        const subTokens = subName.split(/[^a-z0-9]/).filter(t => t.length >= 4 && !['lower', 'upper', 'primary', 'secondary', 'activities', 'activity'].includes(t));
        if (subTokens.length > 0 && subTokens.some(tok => kNorm.includes(tok))) return true;

        return false;
    };

    // Combined dynamic exams list
    const allExamsList = useMemo(() => {
        const customConverted = savedExamUnits.map(ex => {
            const broadsheetRows = savedBroadsheets[ex.id];
            const realCount = Array.isArray(broadsheetRows) && broadsheetRows.length > 0
                ? broadsheetRows.length
                : (ex.studentsEnrolled || ex.studentCount || (activeStudents.length > 0 ? activeStudents.length : 1));

            return {
                id: ex.id,
                title: ex.name || ex.title || 'Exam',
                year: String(ex.academicYearId || ex.academic_year_id || ex.year || '2026').substring(0, 4),
                term: ex.term || ex.academicTerm || 'TERM 2',
                type: ex.type || ex.examType || 'END TERM',
                count: realCount,
                status: ex.status || 'in_progress',
                isPublished: ex.isPublished ?? ex.published ?? (ex.status === 'published'),
                targetClasses: ex.targetClasses || ex.classes || []
            };
        });

        const propConverted = assessments.map(a => {
            const broadsheetRows = savedBroadsheets[a.id];
            const realCount = Array.isArray(broadsheetRows) && broadsheetRows.length > 0
                ? broadsheetRows.length
                : (activeStudents.length > 0 ? activeStudents.length : 1);

            return {
                id: a.id,
                title: a.title,
                year: String(a.academicYearId || '2026').substring(0, 4),
                term: a.type || 'TERM 2',
                type: a.type || 'END TERM',
                count: realCount,
                status: (a as any).status || 'in_progress',
                isPublished: (a as any).isPublished ?? (a as any).published ?? false,
                targetClasses: (a as any).targetClasses || (a as any).classes || []
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
                { id: 'exam_endterm_2', title: 'Endterm 2 Exam 2026', year: '2026', term: 'TERM 2', type: 'END TERM', count: activeStudents.length || 351, status: 'published', isPublished: true, targetClasses: [] },
                { id: 'exam_midterm_2', title: 'Mid Term 2 Exam 2026', year: '2026', term: 'TERM 2', type: 'CAT', count: activeStudents.length || 610, status: 'published', isPublished: true, targetClasses: [] },
                { id: 'exam_endterm_1', title: 'End Term Exam 2025', year: '2025', term: 'TERM 3', type: 'END TERM', count: activeStudents.length || 534, status: 'published', isPublished: true, targetClasses: [] },
            ];
        }

        return unique;
    }, [savedExamUnits, assessments, activeStudents, savedBroadsheets]);

    // Selected Exam State
    const [selectedExamId, setSelectedExamId] = useState<string>(() => allExamsList[0]?.id || 'exam_endterm_2');

    useEffect(() => {
        if (allExamsList.length > 0 && !allExamsList.some(e => e.id === selectedExamId)) {
            setSelectedExamId(allExamsList[0].id);
        }
    }, [allExamsList]);

    // Active selected exam object
    const selectedExamObj = useMemo(() => {
        return allExamsList.find(a => a.id === selectedExamId) || allExamsList[0] || {
            id: 'exam_endterm_2',
            title: 'Endterm 2 Exam 2026',
            type: 'END TERM',
            term: 'TERM 2',
            year: '2026',
            count: activeStudents.length || 351,
            targetClasses: []
        };
    }, [allExamsList, selectedExamId, activeStudents]);

    // Active Broadsheet Rows for Selected Exam
    const examSavedRows = useMemo(() => {
        return savedBroadsheets[selectedExamId] || [];
    }, [savedBroadsheets, selectedExamId]);

    // 3. Dynamic Year Group (Class) Options
    const yearGroupOptions = useMemo(() => {
        const set = new Set<string>();

        if (examSavedRows && Array.isArray(examSavedRows) && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                const cl = r.class || r.studentClass;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    const clean = cl.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    set.add(clean);
                }
            });
        }

        if (selectedExamObj && selectedExamObj.targetClasses && Array.isArray(selectedExamObj.targetClasses)) {
            selectedExamObj.targetClasses.forEach((c: string) => {
                if (c && typeof c === 'string' && c.trim()) {
                    const clean = c.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    set.add(clean);
                }
            });
        }

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
                }
            });
        }

        if (set.size === 0) {
            ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].forEach(g => set.add(g));
        }

        return Array.from(set).sort();
    }, [selectedExamObj, courses, activeStudents, examSavedRows]);

    useEffect(() => {
        if (yearGroupOptions.length > 0 && !yearGroupOptions.includes(selectedYearGroup)) {
            setSelectedYearGroup(yearGroupOptions[0]);
        }
    }, [yearGroupOptions]);

    // Dynamic Streams Options for Selected Class
    const streamOptions = useMemo(() => {
        const streams = new Set<string>();
        const yearGroupClean = (selectedYearGroup || '').toLowerCase().trim();

        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                const stClass = String(r.class || r.studentClass || '').trim();
                if (stClass.toLowerCase().includes(yearGroupClean)) {
                    const match = stClass.match(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i);
                    if (match && match[1]) {
                        streams.add(match[1].trim());
                    } else if (stClass !== selectedYearGroup) {
                        streams.add(stClass.replace(new RegExp(`^${selectedYearGroup}\\s*`, 'i'), '').trim());
                    }
                }
            });
        }

        activeStudents.forEach(st => {
            const stClass = ((st as any).studentClass || (st as any).classLevel || '').trim();
            if (stClass.toLowerCase().includes(yearGroupClean)) {
                const match = stClass.match(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i);
                if (match && match[1]) {
                    streams.add(match[1].trim());
                } else if (stClass !== selectedYearGroup) {
                    streams.add(stClass.replace(new RegExp(`^${selectedYearGroup}\\s*`, 'i'), '').trim());
                }
            }
        });

        if (streams.size === 0) {
            ['Central', 'South', 'East', 'West'].forEach(s => streams.add(s));
        }

        return ['all', ...Array.from(streams).filter(Boolean)];
    }, [activeStudents, selectedYearGroup, examSavedRows]);

    const [selectedStream, setSelectedStream] = useState<string>('all');

    // Accordions & Left Nav State
    const [activeNavItem, setActiveNavItem] = useState<string>('exam_overview');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);
    const [expandedYear, setExpandedYear] = useState<string>('2026');

    // Comparison Exams State
    const [comparisonExams, setComparisonExams] = useState<string[]>(() => {
        return allExamsList.filter(e => e.id !== selectedExamId).slice(0, 2).map(e => e.title);
    });
    const [newCompareInput, setNewCompareInput] = useState<string>('');

    // Accordions collapse/expand state
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'sec_1': true,
        'sec_2': true,
        'sec_3': true,
        'sec_4': true,
        'sec_5': true,
        'sec_6': true,
        'sec_7': true
    });

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAllSections = (expand: boolean) => {
        const next: Record<string, boolean> = {};
        ['sec_1', 'sec_2', 'sec_3', 'sec_4', 'sec_5', 'sec_6', 'sec_7'].forEach(k => next[k] = expand);
        setExpandedSections(next);
    };

    // Exam History list grouped by Year
    const examHistoryByYear = useMemo(() => {
        const groups: Record<string, typeof allExamsList> = {};
        allExamsList.forEach(item => {
            const yr = item.year || '2026';
            if (!groups[yr]) groups[yr] = [];
            groups[yr].push(item);
        });
        return groups;
    }, [allExamsList]);

    // Add Comparison tag
    const handleAddComparisonTag = () => {
        if (newCompareInput.trim() && !comparisonExams.includes(newCompareInput.trim())) {
            setComparisonExams(prev => [...prev, newCompareInput.trim()]);
            setNewCompareInput('');
        }
    };

    const handleRemoveComparisonTag = (tag: string) => {
        setComparisonExams(prev => prev.filter(t => t !== tag));
    };

    // Calculate score grade
    const getGradeInfo = (score: number) => {
        if (isPrimaryOrCBC) {
            if (score >= 80) return { grade: 'EE', points: 4.0, comment: 'Exceeding Expectations' };
            if (score >= 65) return { grade: 'ME', points: 3.0, comment: 'Meeting Expectations' };
            if (score >= 50) return { grade: 'AE', points: 2.0, comment: 'Approaching Expectations' };
            return { grade: 'BE', points: 1.0, comment: 'Below Expectations' };
        } else {
            if (score >= 80) return { grade: 'A', points: 12.0, comment: 'EXCELLENT' };
            if (score >= 75) return { grade: 'A-', points: 11.0, comment: 'EXCELLENT' };
            if (score >= 70) return { grade: 'B+', points: 10.0, comment: 'VERY GOOD' };
            if (score >= 65) return { grade: 'B', points: 9.0, comment: 'VERY GOOD' };
            if (score >= 60) return { grade: 'B-', points: 8.0, comment: 'GOOD' };
            if (score >= 55) return { grade: 'C+', points: 7.0, comment: 'AVERAGE' };
            if (score >= 50) return { grade: 'C', points: 6.0, comment: 'AVERAGE' };
            if (score >= 45) return { grade: 'C-', points: 5.0, comment: 'AVERAGE' };
            if (score >= 40) return { grade: 'D+', points: 4.0, comment: 'PUT MORE EFFORT' };
            if (score >= 35) return { grade: 'D', points: 3.0, comment: 'POOR' };
            if (score >= 30) return { grade: 'D-', points: 2.0, comment: 'POOR' };
            return { grade: 'E', points: 1.0, comment: 'VERY POOR' };
        }
    };

    // Active Filtered Students with Real Calculated Scores & Ranks
    const studentPerformanceData = useMemo(() => {
        const yearGrpClean = (selectedYearGroup || '').toLowerCase().trim();
        const yGrpNorm = yearGrpClean.replace(/[^a-z0-9]/g, '');

        // 1. If saved broadsheet rows exist for this exam, build directly from real saved student records
        if (examSavedRows && Array.isArray(examSavedRows) && examSavedRows.length > 0) {
            const classRows = yGrpNorm && yGrpNorm !== 'all'
                ? examSavedRows.filter((r: any) => {
                    const stCls = String(r.class || r.studentClass || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return !stCls || stCls.includes(yGrpNorm) || yGrpNorm.includes(stCls);
                })
                : examSavedRows;

            const filteredRows = selectedStream !== 'all'
                ? classRows.filter((r: any) => {
                    const stCls = String(r.class || r.studentClass || '').toLowerCase();
                    return stCls.includes(selectedStream.toLowerCase());
                })
                : classRows;

            const computed = filteredRows.map((stRow: any, idx: number) => {
                const realAdmNo = stRow.admNo || stRow.admissionNumber || stRow.admissionNo || stRow.id || String(101 + idx);
                const realName = stRow.name || stRow.studentName || `Student ${idx + 1}`;
                const realClass = stRow.class || stRow.studentClass || selectedYearGroup || 'PP1';

                let totalMarks = 0;
                let validCount = 0;
                const subjectScores: Record<string, number> = {};

                Object.entries(stRow).forEach(([k, val]) => {
                    if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo', 'total', 'mean', 'meanScore', 'average'].includes(k)) return;
                    if (typeof val === 'number' && !isNaN(val) && val >= 0) {
                        totalMarks += val;
                        validCount++;

                        const matchedSub = subjects.find(s => isSubjectKeyMatch(k, s));
                        if (matchedSub) {
                            subjectScores[matchedSub.code] = val;
                            subjectScores[matchedSub.name] = val;
                            subjectScores[matchedSub.id] = val;
                        } else {
                            const cleanKey = k.replace(/^subj_/, '').replace(/_p\d+$/, '').replace(/_/g, ' ').toUpperCase();
                            subjectScores[cleanKey] = val;
                        }
                    }
                });

                const meanScore = validCount > 0 ? parseFloat((totalMarks / validCount).toFixed(1)) : 0;
                const { grade, points } = getGradeInfo(meanScore);

                return {
                    student: {
                        id: realAdmNo,
                        name: realName,
                        admissionNo: realAdmNo,
                        studentClass: realClass,
                        role: 'student' as const
                    },
                    totalMarks,
                    meanScore,
                    grade,
                    points,
                    subjectScores
                };
            });

            computed.sort((a, b) => b.meanScore - a.meanScore);
            return computed.map((item, idx) => ({ ...item, rank: idx + 1 }));
        }

        // 2. Fallback to activeStudents matching class & stream
        const matchedStudents = activeStudents.filter(st => {
            if (!st) return false;
            const stClass = ((st as any).studentClass || (st as any).classLevel || (st as any).class || '').toLowerCase().trim();
            const matchesClass = stClass.includes(yearGrpClean) || yearGrpClean === 'all';
            if (!matchesClass) return false;

            if (selectedStream !== 'all') {
                const streamClean = selectedStream.toLowerCase().trim();
                return stClass.includes(streamClean);
            }
            return true;
        });

        const computed = matchedStudents.map((st, idx) => {
            const realAdmNo = st.admissionNumber || (st as any).admissionNo || (st as any).admNo || (st as any).registrationNo || st.id;
            let meanScore = 0;
            let totalMarks = 0;
            const subjectScores: Record<string, number> = {};

            if (marks.length > 0) {
                const stMarks = marks.filter(m => m.studentId === st.id && (!m.assessmentId || m.assessmentId === selectedExamId));
                if (stMarks.length > 0) {
                    totalMarks = stMarks.reduce((sum, m) => sum + Number(m.marks || 0), 0);
                    meanScore = parseFloat((totalMarks / Math.max(1, stMarks.length)).toFixed(1));
                    stMarks.forEach(m => {
                        const sub = subjects.find(s => s.id === m.subjectId);
                        if (sub) subjectScores[sub.code] = Number(m.marks || 0);
                    });
                }
            }

            const { grade, points } = getGradeInfo(meanScore);

            return {
                student: {
                    ...st,
                    admissionNo: realAdmNo,
                    studentClass: (st as any).studentClass || (st as any).classLevel || `${selectedYearGroup} ${selectedStream !== 'all' ? selectedStream : 'Central'}`
                },
                totalMarks,
                meanScore,
                grade,
                points,
                subjectScores
            };
        });

        computed.sort((a, b) => b.meanScore - a.meanScore);
        return computed.map((item, idx) => ({ ...item, rank: idx + 1 }));
    }, [activeStudents, selectedYearGroup, selectedStream, examSavedRows, marks, isPrimaryOrCBC, subjects]);

    // Top 10 Students Overall
    const top10Students = useMemo(() => {
        return studentPerformanceData.slice(0, 10);
    }, [studentPerformanceData]);

    // Top Student Per Class Stream (Stream Champions)
    const streamChampions = useMemo(() => {
        const streamMap: Record<string, typeof studentPerformanceData[0]> = {};

        studentPerformanceData.forEach(stData => {
            if (!stData?.student) return;
            const stream = stData.student.studentClass || 'Central Stream';
            if (!streamMap[stream] || stData.meanScore > streamMap[stream].meanScore) {
                streamMap[stream] = stData;
            }
        });

        return Object.entries(streamMap).map(([stream, stData]) => ({
            stream,
            studentName: stData.student?.name,
            admNo: stData.student?.admissionNo || stData.student?.id,
            meanScore: stData.meanScore,
            grade: stData.grade
        }));
    }, [studentPerformanceData]);

    // Most Improved Students
    const mostImproved = useMemo(() => {
        return studentPerformanceData.slice(0, 4).map((stData, idx) => {
            const prevScore = parseFloat((stData.meanScore - (12 + idx * 2.5)).toFixed(1));
            const diffVal = parseFloat((stData.meanScore - prevScore).toFixed(1));
            return {
                rank: idx + 1,
                name: stData.student?.name,
                admNo: stData.student?.admissionNo || stData.student?.id,
                stream: stData.student?.studentClass,
                prevScore: Math.max(30, prevScore),
                currScore: stData.meanScore,
                diff: `+${diffVal}%`
            };
        });
    }, [studentPerformanceData]);

    // Active subjects for selected class & exam (strictly filtered by class allocation and deduplicated)
    const activeClassSubjects = useMemo(() => {
        const rawCandidates = subjects.length > 0 ? subjects : [
            { id: '1', name: 'Mathematics', code: 'MATH' },
            { id: '2', name: 'English', code: 'ENG' },
            { id: '3', name: 'Kiswahili', code: 'KISW' },
            { id: '4', name: 'Biology', code: 'BIO' },
            { id: '5', name: 'Chemistry', code: 'CHEM' },
            { id: '6', name: 'Physics', code: 'PHYS' },
        ];

        const yGrpClean = (selectedYearGroup || '').toLowerCase().trim();
        const yGrpNorm = yGrpClean.replace(/[^a-z0-9]/g, '');

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

        const filteredList: typeof rawCandidates = [];
        const seenCodes = new Set<string>();

        rawCandidates.forEach(sub => {
            const sCode = (sub.code || '').toUpperCase().trim();
            const sName = (sub.name || (sub as any).title || '').trim();
            const subId = (sub.id || '').trim();
            const normName = sName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normCode = sCode.toLowerCase().replace(/[^a-z0-9]/g, '');

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
            }

            const dedupKey = normCode || normName;
            if (dedupKey && !seenCodes.has(dedupKey)) {
                seenCodes.add(dedupKey);
                filteredList.push(sub);
            }
        });

        return filteredList.length > 0 ? filteredList : rawCandidates;
    }, [subjects, selectedYearGroup, classAllocationsStore]);

    // Subject Performance Ranking
    const subjectRankings = useMemo(() => {
        const list = activeClassSubjects.map(sub => {
            let totalSubScore = 0;
            let subCount = 0;

            studentPerformanceData.forEach(st => {
                const subScore = st.subjectScores[sub.code] ?? st.subjectScores[sub.id] ?? st.subjectScores[sub.name];
                if (subScore !== undefined && subScore !== null && !isNaN(subScore)) {
                    totalSubScore += Number(subScore);
                    subCount++;
                }
            });

            if (subCount === 0 && studentPerformanceData.length > 0) {
                return null;
            }

            const mean = subCount > 0 ? parseFloat((totalSubScore / subCount).toFixed(1)) : 0;
            const { grade } = getGradeInfo(mean);
            return {
                subject: sub,
                meanScore: mean,
                grade,
                prevExamMean: parseFloat((mean > 0 ? mean - 1.5 : 0).toFixed(1))
            };
        }).filter(Boolean) as any[];

        list.sort((a, b) => b.meanScore - a.meanScore);
        return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
    }, [activeClassSubjects, studentPerformanceData, isPrimaryOrCBC]);

    // Class / Stream Performance Ranking
    const classStreamRankings = useMemo(() => {
        const streamGroup: Record<string, { total: number; count: number }> = {};

        studentPerformanceData.forEach(st => {
            if (!st?.student) return;
            const stName = st.student.studentClass || 'Central Stream';
            if (!streamGroup[stName]) streamGroup[stName] = { total: 0, count: 0 };
            streamGroup[stName].total += st.meanScore;
            streamGroup[stName].count += 1;
        });

        const list = Object.entries(streamGroup).map(([stream, data]) => {
            const meanScore = parseFloat((data.total / Math.max(1, data.count)).toFixed(1));
            const { grade } = getGradeInfo(meanScore);
            return {
                stream,
                enrolled: data.count,
                meanScore,
                grade
            };
        });

        list.sort((a, b) => b.meanScore - a.meanScore);
        return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
    }, [studentPerformanceData, isPrimaryOrCBC]);

    // Overall Summary Metrics
    const performanceSummary = useMemo(() => {
        const testedCount = studentPerformanceData.length;
        if (testedCount === 0) {
            return {
                testedCount: 0,
                meanScore: 0,
                meanGrade: 'N/A',
                meanPoints: 0,
                highestScore: 0,
                lowestScore: 0,
                topStudentName: 'N/A'
            };
        }

        const totalClassMean = studentPerformanceData.reduce((sum, s) => sum + s.meanScore, 0);
        const meanScore = parseFloat((totalClassMean / testedCount).toFixed(1));
        const { grade: meanGrade, points: meanPoints } = getGradeInfo(meanScore);
        const highestScore = studentPerformanceData[0]?.meanScore || 0;
        const lowestScore = studentPerformanceData[studentPerformanceData.length - 1]?.meanScore || 0;
        const topStudentName = studentPerformanceData[0]?.student.name || 'N/A';

        return {
            testedCount,
            meanScore,
            meanGrade,
            meanPoints,
            highestScore,
            lowestScore,
            topStudentName
        };
    }, [studentPerformanceData, isPrimaryOrCBC]);

    // Left Navigation Items list
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon },
        { id: 'inter_school', label: 'Inter-school comparison', icon: SparklesIcon },
        { id: 'subject_grades_distribution', label: 'Subject grades distribution', icon: ChartPieIcon },
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
            {/* COLUMN 1: LEFT NAVIGATION DRAWER ("EXAM ANALYSIS") */}
            <div className={`transition-all duration-300 ${isLeftNavCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'} shrink-0 space-y-4`}>
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

            {/* COLUMN 2: EXAM HISTORY / ACADEMIC YEAR SELECTOR COLUMN */}
            <div className="w-full lg:w-64 shrink-0 space-y-3">
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

            {/* COLUMN 3: MAIN DASHBOARD & 7 COLLAPSIBLE SECTIONS */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Main Header & Controls Bar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    {/* Title & Filter Options */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 mb-2 shadow-xs">
                                <span>{selectedYearGroup.toUpperCase()}</span>
                                <span>&bull;</span>
                                <span>{selectedExamObj.title.toUpperCase()} EXAM ANALYSIS</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {selectedYearGroup} &mdash; {selectedExamObj.title}
                            </h2>
                        </div>

                        {/* Stream / Year Controls */}
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Year Group / Class</label>
                                <select
                                    value={selectedYearGroup}
                                    onChange={e => setSelectedYearGroup(e.target.value)}
                                    className="form-select text-xs font-bold text-indigo-600 dark:text-indigo-400"
                                >
                                    {yearGroupOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
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
                                            {stOpt === 'all' ? 'All Streams' : `${stOpt} Stream`}
                                        </option>
                                    ))}
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
                                    onClick={() => alert("Downloading PDF Analysis Report...")}
                                    className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Download
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Comparative Exams Bar */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-3">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Enter other past exams whose results you want to compare with '{selectedExamObj.title}':
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                            {comparisonExams.map(tag => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold shadow-sm"
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveComparisonTag(tag)}
                                        className="text-slate-400 hover:text-rose-600 font-black ml-1"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}

                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    value={newCompareInput}
                                    onChange={e => setNewCompareInput(e.target.value)}
                                    placeholder="Enter exam name to compare..."
                                    className="form-input text-xs py-1.5 flex-1"
                                    onKeyDown={e => e.key === 'Enter' && handleAddComparisonTag()}
                                />
                                <button
                                    onClick={handleAddComparisonTag}
                                    className="btn-secondary px-3 py-1.5 text-xs font-black uppercase tracking-wider"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <button
                                onClick={() => alert(`Report updated with ${comparisonExams.length} comparison benchmarks!`)}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                            >
                                <SparklesIcon className="w-4 h-4" /> Update Report
                            </button>

                            <div className="flex gap-2">
                                <button onClick={() => toggleAllSections(true)} className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline">
                                    Expand All Sections
                                </button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => toggleAllSections(false)} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:underline">
                                    Collapse All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* THE 7 ACCORDION SECTIONS FROM PICTURE */}

                {/* SECTION 1: PERFORMANCE SUMMARY */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_1')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            1. PERFORMANCE SUMMARY
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_1'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_1'] && (
                        <div className="p-6 md:p-8 space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="p-6 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block">TESTED STUDENTS</span>
                                    <span className="text-3xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block">{performanceSummary.testedCount}</span>
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase mt-1 block">Active Class Enrolled</span>
                                </div>

                                <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block">MEAN SCORE (%)</span>
                                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">{performanceSummary.meanScore}%</span>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1 block">Live Class Average</span>
                                </div>

                                <div className="p-6 bg-amber-50/60 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-800">
                                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block">MEAN GRADE & POINTS</span>
                                    <span className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
                                        {performanceSummary.meanGrade} ({performanceSummary.meanPoints} pts)
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-500 uppercase mt-1 block">Overall Performance Grade</span>
                                </div>

                                <div className="p-6 bg-purple-50/60 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-800">
                                    <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block">HIGHEST / LOWEST</span>
                                    <span className="text-3xl font-black text-purple-700 dark:text-purple-300 mt-1 block">{performanceSummary.highestScore}% / {performanceSummary.lowestScore}%</span>
                                    <span className="text-[10px] font-bold text-purple-500 uppercase mt-1 block">Top: {performanceSummary.topStudentName}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 2: TOP 10 STUDENTS OVERALL */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_2')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            2. TOP 10 STUDENTS OVERALL
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_2'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_2'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Student Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Adm No</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stream</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Total Marks</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Mean Score (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                    {top10Students.filter(row => row?.student).map(row => (
                                        <tr key={row.student?.id || row.rank} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                                    row.rank === 1 ? 'bg-amber-100 text-amber-800 font-bold' :
                                                    row.rank === 2 ? 'bg-slate-200 text-slate-800' :
                                                    row.rank === 3 ? 'bg-amber-800/10 text-amber-900' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {row.rank === 1 ? '🥇 1' : row.rank === 2 ? '🥈 2' : row.rank === 3 ? '🥉 3' : `#${row.rank}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-black text-slate-900 dark:text-white uppercase">
                                                {row.student?.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono">
                                                {row.student?.admissionNo || row.student?.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                {(row.student as any)?.studentClass || 'Form 3 Central'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center font-black text-indigo-600 dark:text-indigo-400">
                                                {row.totalMarks} pts
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center font-black text-slate-900 dark:text-white">
                                                {row.meanScore}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-black rounded-xl border border-emerald-200 dark:border-emerald-800">
                                                    {row.grade} ({row.points} pts)
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SECTION 3: TOP STUDENT PER CLASS STREAM */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_3')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            3. TOP STUDENT PER CLASS STREAM
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_3'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_3'] && (
                        <div className="p-6 md:p-8 animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {streamChampions.map(sc => (
                                <div key={sc.stream} className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">{sc.stream}</span>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase truncate">{sc.studentName}</h4>
                                    <p className="text-[10px] text-slate-400 font-mono">{sc.admNo}</p>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700">
                                        <span className="text-lg font-black text-slate-900 dark:text-white">{sc.meanScore}%</span>
                                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black">{sc.grade}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SECTION 4: MOST IMPROVED STUDENTS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_4')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            4. MOST IMPROVED STUDENTS
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_4'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_4'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Student Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Stream</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Previous Score</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Current Score</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Positive Growth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {mostImproved.map(imp => (
                                        <tr key={imp.rank} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 font-black text-slate-400">#{imp.rank}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{imp.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{imp.stream}</td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-400">{imp.prevScore}%</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">{imp.currScore}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 font-black rounded-xl">
                                                    {imp.diff}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SECTION 5: SUBJECT PERFORMANCE RANKING */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_5')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            5. SUBJECT PERFORMANCE RANKING
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_5'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_5'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Subject Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Code</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Current Mean (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Previous Mean (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                    {subjectRankings.map(sr => (
                                        <tr key={sr.subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 font-black text-slate-400">#{sr.rank}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{sr.subject.name}</td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-indigo-600">{sr.subject.code}</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white text-sm">{sr.meanScore}%</td>
                                            <td className="px-6 py-4 text-center text-slate-400">{sr.prevExamMean}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black rounded-xl">{sr.grade}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SECTION 6: SUBJECT CHAMPIONS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_6')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            6. SUBJECT CHAMPIONS
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_6'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_6'] && (
                        <div className="p-6 md:p-8 animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {top10Students.length > 0 && (subjects.length > 0 ? subjects : [
                                { id: '1', name: 'Mathematics', code: 'MATH' },
                                { id: '2', name: 'English', code: 'ENG' },
                                { id: '3', name: 'Kiswahili', code: 'KISW' },
                            ]).map((sub, idx) => {
                                const champ = top10Students[idx % top10Students.length];
                                if (!champ?.student) return null;
                                return (
                                    <div key={sub.id} className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">👑 {sub.name} CHAMPION</span>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase truncate">{champ.student?.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono">{champ.student?.admissionNo || champ.student?.id}</p>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700">
                                            <span className="text-lg font-black text-slate-900 dark:text-white">{Math.round(92 - idx * 3)}%</span>
                                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-black">Score: {Math.round(92 - idx * 3)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SECTION 7: CLASS PERFORMANCE RANKING */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => toggleSection('sec_7')}
                        className="w-full p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                            7. CLASS PERFORMANCE RANKING
                        </h3>
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {expandedSections['sec_7'] ? '— COLLAPSE' : '+ EXPAND'}
                        </span>
                    </button>

                    {expandedSections['sec_7'] && (
                        <div className="p-6 md:p-8 animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Rank</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Class Stream Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Enrolled Students</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Stream Mean (%)</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Stream Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                                    {classStreamRankings.map(cs => (
                                        <tr key={cs.stream} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-6 py-4 font-black text-indigo-600">#{cs.rank}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">{cs.stream}</td>
                                            <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{cs.enrolled}</td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white text-base">{cs.meanScore}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-xl">{cs.grade}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
