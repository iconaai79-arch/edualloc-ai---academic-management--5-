import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course, AcademicLevel } from '../../types';
import { apiService } from '../../services/apiService';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { GridIcon } from '../icons/GridIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { FunnelIcon } from '../icons/FunnelIcon';
import { extractGradeOnly, extractStreamOnly } from './BroadsheetReportView';
import { extractClassAndStream, normalizeStreamName, resolveRealStudentStream, getDefaultGradesForInstitution, filterGradesForInstitution } from '../../utils/academicUtils';

interface RawMarksheetViewProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    academicLevels?: AcademicLevel[];
    onSelectReportTab?: (tabId: string) => void;
    [key: string]: any;
}

// Clean helper to extract real admission number
const extractCleanAdmissionNumber = (st: any, realStudentsList?: any[]): string => {
    if (!st) return 'N/A';

    const directCandidates = [
        st.admissionNumber,
        st.admissionNo,
        st.admNo,
        st.registrationNumber,
        st.registrationNo,
        st.studentAdmissionNumber,
        st.student_admission_number,
        st.student_adm_no,
        st.metadata?.admissionNumber,
        st.metadata?.admissionNo,
        st.metadata?.admNo
    ];

    for (const val of directCandidates) {
        if (val !== undefined && val !== null) {
            const strVal = String(val).trim();
            const isLegacySynthetic = /^ADM-10\d{2,}$/i.test(strVal);
            if (strVal && !strVal.startsWith('usr_') && !strVal.startsWith('user_') && !isLegacySynthetic && strVal !== 'undefined' && strVal !== 'null') {
                return strVal;
            }
        }
    }

    if (st.id && typeof st.id === 'string') {
        const cleanId = st.id.trim();
        const isLegacySynthetic = /^ADM-10\d{2,}$/i.test(cleanId);
        if (!cleanId.startsWith('usr_') && !cleanId.startsWith('user_') && !isLegacySynthetic && cleanId !== 'undefined' && cleanId !== 'null') {
            return cleanId;
        }
    }

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

// Enhanced subject matching helper
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

    // Kiswahili Comprehensive Root & Paper Matching
    if ((subCode.startsWith('kisw') || subName.includes('kisw') || subCode === '906' || subCode === '102' || subCode === 'kis') && 
        (kNorm.includes('kisw') || kNorm.includes('insha') || kNorm.includes('lugha') || kNorm.includes('kusoma') || kNorm.includes('sarufi') || kNorm.startsWith('kis') || kNorm === 'kis')) return true;

    // Hygiene & Nutrition
    if ((subCode.startsWith('hyg') || subName.includes('hyg') || subName.includes('nutri') || subCode === '903') && 
        (kNorm.includes('hyg') || kNorm.includes('nutri') || kNorm.includes('health') || kNorm.includes('afya'))) return true;

    // Environmental Activities
    if ((subCode.startsWith('env') || subName.includes('env') || subCode === '902') && 
        (kNorm.includes('env') || kNorm.includes('environment') || kNorm.includes('mazingira'))) return true;

    // Creative Arts & Movement
    if ((subCode.startsWith('creat') || subName.includes('creat') || subName.includes('art') || subName.includes('psycho') || subName.includes('music') || subName.includes('movement') || subCode === '904' || subCode === '511') && 
        (kNorm.includes('creat') || kNorm.includes('art') || kNorm.includes('psycho') || kNorm.includes('music') || kNorm.includes('movement') || kNorm.includes('craft') || kNorm.includes('sanaa'))) return true;

    // Mathematics
    if ((subCode.startsWith('math') || subName.includes('math') || subName.includes('numeracy') || subCode === '121' || subCode === '907') && 
        (kNorm.includes('math') || kNorm.includes('numeracy') || kNorm.includes('hesabu'))) return true;

    // English & Language Activities
    if ((subCode.startsWith('eng') || subName.includes('eng') || subName.includes('lang') || subName.includes('literacy') || subCode === '101' || subCode === '901') && 
        (kNorm.includes('eng') || kNorm.includes('lang') || kNorm.includes('literacy') || kNorm.includes('language'))) return true;

    // Religious Education (CRE/IRE/HRE)
    if ((subCode.startsWith('cre') || subCode.startsWith('ire') || subCode.startsWith('hre') || subName.includes('religio') || subCode === '313' || subCode === '911') && 
        (kNorm.includes('cre') || kNorm.includes('ire') || kNorm.includes('hre') || kNorm.includes('religio') || kNorm.includes('dini'))) return true;

    // Agriculture & Nutrition
    if ((subCode.startsWith('agri') || subName.includes('agri') || subCode === '443') && 
        (kNorm.includes('agri') || kNorm.includes('kilimo'))) return true;

    // Social Studies
    if ((subCode.startsWith('soc') || subName.includes('social') || subCode === '310' || subCode === '910') && 
        (kNorm.includes('soc') || kNorm.includes('social'))) return true;

    // Science
    if ((subCode.startsWith('sci') || subName.includes('science') || subCode === '905' || subCode === '230') && 
        (kNorm.includes('sci') || kNorm.includes('science') || kNorm.includes('sayansi'))) return true;

    // Secondary subjects
    if (subCode.startsWith('bio') && kNorm.includes('bio')) return true;
    if (subCode.startsWith('chem') && kNorm.includes('chem')) return true;
    if (subCode.startsWith('phy') && (kNorm.includes('phy') || kNorm.includes('physics'))) return true;
    if (subCode.startsWith('hist') && (kNorm.includes('hist') || kNorm.includes('history'))) return true;
    if (subCode.startsWith('geo') && (kNorm.includes('geo') || kNorm.includes('geography'))) return true;
    if (subCode.startsWith('comp') && (kNorm.includes('comp') || kNorm.includes('computer'))) return true;
    if (subCode.startsWith('bus') && (kNorm.includes('bus') || kNorm.includes('business'))) return true;

    // Normalized word token match
    const subTokens = subName.split(/[^a-z0-9]/).filter((t: string) => t.length >= 4 && !['lower', 'upper', 'primary', 'secondary', 'activities', 'activity'].includes(t));
    if (subTokens.length > 0 && subTokens.some((tok: string) => kNorm.includes(tok))) return true;

    return false;
};

// Helper to extract student raw mark from broadsheet row or marks array
const extractStudentSubjectScore = (
    row: any,
    matchedSt: any,
    subject: any,
    allMarks: AssessmentMark[] = [],
    examId?: string
): { score: number | string; found: boolean } => {
    const dictionariesToCheck: Record<string, any>[] = [
        row,
        (row?.marks && typeof row.marks === 'object' ? row.marks : null),
        (row?.subjectMarks && typeof row.subjectMarks === 'object' ? row.subjectMarks : null),
        (row?.subjectMarksMap && typeof row.subjectMarksMap === 'object' ? row.subjectMarksMap : null),
        (row?.scores && typeof row.scores === 'object' ? row.scores : null),
    ].filter(Boolean);

    let paper1: number | null = null;
    let paper2: number | null = null;
    let paper3: number | null = null;
    let directScore: number | null = null;

    const ignoredKeys = new Set([
        'admno', 'name', 'class', 'kcpe', 'student', 'id', 'admissionno', 
        'admissionnumber', 'total', 'mean', 'average', 'stream', 'rank',
        'overallpos', 'streampos', 'vap', 'entry', 'studentname', 'studentclass',
        'gender', 'courselevelid', 'levelid'
    ]);

    for (const dict of dictionariesToCheck) {
        for (const [key, val] of Object.entries(dict)) {
            if (val === null || val === undefined || val === '') continue;
            const kNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (ignoredKeys.has(kNorm)) continue;

            let num: number | null = null;
            if (typeof val === 'number') {
                num = val;
            } else if (typeof val === 'string') {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) num = parsed;
            } else if (typeof val === 'object' && val !== null) {
                const inner = (val as any).score ?? (val as any).mark ?? (val as any).marks;
                if (inner !== null && inner !== undefined && !isNaN(Number(inner))) {
                    num = Number(inner);
                }
            }

            if (num === null || isNaN(num) || num < 0) continue;

            if (isSubjectKeyMatch(key, subject)) {
                const kLower = key.toLowerCase();
                const isP1 = /(?:_?p|_?paper_?)\s*1\b/i.test(kLower) || kLower.endsWith('p1');
                const isP2 = /(?:_?p|_?paper_?)\s*2\b/i.test(kLower) || kLower.endsWith('p2');
                const isP3 = /(?:_?p|_?paper_?)\s*3\b/i.test(kLower) || kLower.endsWith('p3');

                if (isP1) {
                    paper1 = num;
                } else if (isP2) {
                    paper2 = num;
                } else if (isP3) {
                    paper3 = num;
                } else {
                    directScore = (directScore === null || num > directScore) ? num : directScore;
                }
            }
        }
    }

    // Check allMarks if not found in row
    if (paper1 === null && paper2 === null && paper3 === null && directScore === null && allMarks && allMarks.length > 0) {
        const studentId = matchedSt?.id || row?.id || row?.studentId;
        const studentAdm = String(matchedSt?.admissionNumber || matchedSt?.admissionNo || matchedSt?.admNo || row?.admissionNumber || row?.admNo || '').trim().toLowerCase();

        const matchedMarks = allMarks.filter((m: any) => {
            const mExId = m.assessmentId || m.assessment_id || m.examId;
            const matchesExam = !examId || !mExId || mExId === examId;
            if (!matchesExam) return false;

            const mStId = m.studentId || m.student_id;
            const mAdm = String((m as any).admNo || (m as any).admissionNo || '').trim().toLowerCase();
            const matchesStudent = (studentId && mStId === studentId) || 
                                   (studentAdm && mAdm && (studentAdm === mAdm || studentAdm.replace(/^0+/, '') === mAdm.replace(/^0+/, '')));
            if (!matchesStudent) return false;

            const mSubId = m.subjectId || m.subject_id || m.subject;
            const mSubName = (m as any).subjectName || (m as any).subjectCode || (m as any).name || '';
            return (mSubId && (mSubId === subject.id || mSubId === subject.code)) || (mSubName && isSubjectKeyMatch(mSubName, subject));
        });

        if (matchedMarks.length > 0) {
            let maxM = -1;
            matchedMarks.forEach((m: any) => {
                const val = m.marks ?? m.score ?? m.percentage ?? m.rawMark;
                if (val !== null && val !== undefined) {
                    const n = Number(val);
                    if (!isNaN(n) && n > maxM) maxM = n;
                }
            });
            if (maxM >= 0) directScore = maxM;
        }
    }

    const hasPapers = paper1 !== null || paper2 !== null || paper3 !== null;
    let finalScore: number | null = null;
    if (hasPapers) {
        const sumPapers = (paper1 || 0) + (paper2 || 0) + (paper3 || 0);
        finalScore = directScore !== null && directScore > sumPapers ? directScore : sumPapers;
    } else if (directScore !== null) {
        finalScore = directScore;
    }

    if (finalScore !== null && !isNaN(finalScore)) {
        return { score: Math.round(finalScore * 10) / 10, found: true };
    }

    return { score: '-', found: false };
};

export const RawMarksheetView: React.FC<RawMarksheetViewProps> = ({
    assessments = [],
    marks = [],
    students = [],
    users = [],
    subjects = [],
    currentInstitution,
    courses = [],
    academicLevels = [],
    onSelectReportTab
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('');
    const [selectedStream, setSelectedStream] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);
    const [activeNavItem, setActiveNavItem] = useState<string>('marksheet');
    
    // Broadsheets state initialized from localStorage
    const [savedBroadsheets, setSavedBroadsheets] = useState<Record<string, any[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return {};
    });

    // Class Allocations Store initialized from localStorage and institution settings
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return (currentInstitution as any)?.classSubjectAllocations || (currentInstitution as any)?.class_subject_allocations || {};
    });

    // Student exemptions
    const [studentSubjectExemptions, setStudentSubjectExemptions] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_student_subject_exemptions_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return {};
    });

    // Active Students
    const activeStudents = useMemo(() => {
        const set = new Map<string, User>();
        (students || []).forEach(s => { if (s && s.id) set.set(s.id, s); });
        (users || []).filter(u => u.role === 'student' || u.studentClass || (u as any).admissionNo || (u as any).admNo).forEach(s => {
            if (s && s.id && !set.has(s.id)) set.set(s.id, s);
        });
        return Array.from(set.values());
    }, [students, users]);

    // Saved Exam Units
    const [savedExamUnits, setSavedExamUnits] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_exam_units_${instId}`);
            if (saved) return JSON.parse(saved) || [];
        } catch (e) {}
        return [];
    });

    // Enrollments Registry for genuine stream resolution
    const [enrollmentsRegistry, setEnrollmentsRegistry] = useState<any[]>(() => {
        try {
            const cached = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                           localStorage.getItem('eduai_student_enrollments_default') ||
                           (instId ? localStorage.getItem(`eduai_students_${instId}`) : null) ||
                           localStorage.getItem('eduai_students_default');
            if (cached) return JSON.parse(cached) || [];
        } catch (e) {}
        return [];
    });

    // Load data from DB & LocalStorage
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                if (currentInstitution?.id) {
                    const [examRecords, imsRecords, allocRecords, exemptRecords, enrRecords, stRecords] = await Promise.all([
                        apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('student_subject_exemptions', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('student_enrollments', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('students', currentInstitution.id).catch(() => [])
                    ]);

                    if (enrRecords && Array.isArray(enrRecords) && enrRecords.length > 0) {
                        setEnrollmentsRegistry(enrRecords);
                        try {
                            localStorage.setItem(`eduai_student_enrollments_${currentInstitution.id}`, JSON.stringify(enrRecords));
                        } catch (e) {}
                    } else if (stRecords && Array.isArray(stRecords) && stRecords.length > 0) {
                        setEnrollmentsRegistry(stRecords);
                    }

                    if (examRecords && examRecords.length > 0) {
                        setSavedExamUnits(examRecords);
                    }

                    // Broadsheet settings
                    const match = (imsRecords || []).find((r: any) => 
                        r.id === `broadsheets_${currentInstitution.id}` || 
                        r.module_id === 'exam_broadsheets' || 
                        r.moduleId === 'exam_broadsheets' || 
                        r.moduleName === 'exam_broadsheets'
                    );
                    const storeData = match?.settings || match?.stateData || match?.data;
                    if (storeData && typeof storeData === 'object') {
                        setSavedBroadsheets(prev => ({ ...prev, ...storeData }));
                    }

                    // Class Subject Allocations
                    if (allocRecords && allocRecords.length > 0) {
                        const store: Record<string, string[]> = {};
                        allocRecords.forEach((r: any) => {
                            const cls = (r.className || r.class_name || r.class_level || r.classLevel || r.class || r.id || '').trim();
                            const subList = r.subjects || r.subject_ids || r.allocated_subjects || [];
                            if (cls && Array.isArray(subList) && subList.length > 0) {
                                store[cls] = subList;
                            } else {
                                const subId = (r.subject_id || r.subjectId || r.subject_code || r.subjectCode || '').trim();
                                if (cls && subId) {
                                    if (!store[cls]) store[cls] = [];
                                    if (!store[cls].includes(subId)) store[cls].push(subId);
                                }
                            }
                        });
                        if (Object.keys(store).length > 0) {
                            setClassAllocationsStore(prev => ({ ...prev, ...store }));
                        }
                    }

                    // Student Subject Exemptions
                    if (exemptRecords && exemptRecords.length > 0) {
                        const exemptMap: Record<string, boolean> = {};
                        exemptRecords.forEach((r: any) => {
                            const stId = r.student_id || r.studentId;
                            const subId = (r.subject_id || r.subjectId || r.subject_name || r.subjectName || '').toLowerCase().trim();
                            if (stId && subId) {
                                exemptMap[`${stId}_${subId}`] = true;
                            }
                        });
                        setStudentSubjectExemptions(prev => ({ ...prev, ...exemptMap }));
                    }
                }
            } catch (err) {
                console.error('Error loading raw marksheet data:', err);
            }
        };

        fetchInitialData();
    }, [currentInstitution?.id]);

    // Listen for cross-module sync events
    useEffect(() => {
        const handleSync = () => {
            try {
                const savedUnits = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (savedUnits) setSavedExamUnits(JSON.parse(savedUnits) || []);

                const savedSheets = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
                if (savedSheets) setSavedBroadsheets(JSON.parse(savedSheets) || {});

                const savedEnr = localStorage.getItem(`eduai_student_enrollments_${instId}`) ||
                                 localStorage.getItem('eduai_student_enrollments_default');
                if (savedEnr) setEnrollmentsRegistry(JSON.parse(savedEnr) || []);
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
    }, [instId]);

    // Published Exams & Exams with data
    const publishedExamsList = useMemo(() => {
        const map = new Map<string, any>();
        savedExamUnits
            .forEach(e => {
                const stStr = String(e.status || '').toLowerCase().trim();
                const isPub = stStr === 'published' || e.isPublished === true || e.published === true;
                map.set(e.id, {
                    id: e.id,
                    title: e.title || e.name || 'Unnamed Exam',
                    name: e.name || e.title || 'Unnamed Exam',
                    year: String(e.year || '2026'),
                    term: e.term || 'TERM 1',
                    isPublished: isPub,
                    targetClasses: e.targetClasses || [],
                    testedPaperConfigs: e.testedPaperConfigs
                });
            });

        assessments
            .forEach(a => {
                const existing = map.get(a.id);
                if (!existing) {
                    const isPub = (a as any).isPublished || (a as any).status === 'published';
                    map.set(a.id, {
                        id: a.id,
                        title: a.title || 'Continuous Assessment',
                        name: a.title || 'Continuous Assessment',
                        year: '2026',
                        term: 'TERM 1',
                        isPublished: isPub,
                        targetClasses: [],
                        testedPaperConfigs: (a as any).testedPaperConfigs
                    });
                }
            });

        if (map.size === 0) {
            return [{
                id: 'chepkoilel_exam_2026',
                title: 'CHEPKOILEL ZONAL EXAMS',
                name: 'CHEPKOILEL ZONAL EXAMS',
                year: '2026',
                term: 'TERM 1',
                isPublished: true,
                targetClasses: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']
            }];
        }

        return Array.from(map.values());
    }, [savedExamUnits, assessments]);

    // Initial Exam Selection
    useEffect(() => {
        if (!selectedExamId && publishedExamsList.length > 0) {
            setSelectedExamId(publishedExamsList[0].id);
        }
    }, [publishedExamsList, selectedExamId]);

    const selectedExamObj = useMemo(() => {
        return publishedExamsList.find(e => e.id === selectedExamId) || publishedExamsList[0];
    }, [publishedExamsList, selectedExamId]);

    // Comprehensive 5-Tier Broadsheet & Raw Mark Row Resolution
    const resolveEffectiveExamRows = useCallback((examId: string): any[] => {
        if (!examId) return [];

        // Tier 1: Direct ID in savedBroadsheets state
        if (savedBroadsheets && savedBroadsheets[examId] && Array.isArray(savedBroadsheets[examId]) && savedBroadsheets[examId].length > 0) {
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
        const matchedExam = publishedExamsList.find(e => e.id === examId);
        if (matchedExam) {
            const exData = (matchedExam as any).broadsheetData || (matchedExam as any).rows;
            if (Array.isArray(exData) && exData.length > 0) return exData;

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
                            admNo: (stObj as any)?.admissionNumber || (stObj as any)?.admissionNo || sId,
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
    }, [savedBroadsheets, publishedExamsList, instId, marks, activeStudents, selectedYearGroup, currentInstitution]);

    // Year Groups / Classes
    const yearGroupsList = useMemo(() => {
        const groups = new Set<string>();

        if (selectedExamObj?.targetClasses && Array.isArray(selectedExamObj.targetClasses)) {
            selectedExamObj.targetClasses.forEach((cls: string) => {
                if (cls && typeof cls === 'string' && cls.trim()) {
                    const base = extractGradeOnly(cls);
                    if (base) groups.add(base);
                }
            });
        }

        const savedRows = resolveEffectiveExamRows(selectedExamId);
        if (savedRows && savedRows.length > 0) {
            savedRows.forEach((r: any) => {
                const c = r.class || r.studentClass;
                if (c && typeof c === 'string' && c.trim()) {
                    const base = extractGradeOnly(c);
                    if (base) groups.add(base);
                }
            });
        }

        activeStudents.forEach(st => {
            const cls = (st as any).studentClass || (st as any).classLevel;
            if (cls && typeof cls === 'string' && cls.trim()) {
                const base = extractGradeOnly(cls);
                if (base) groups.add(base);
            }
        });

        (academicLevels || []).forEach(l => {
            if (l.name) {
                const base = extractGradeOnly(l.name);
                if (base) groups.add(base);
            }
        });

        if (groups.size === 0) {
            return getDefaultGradesForInstitution(currentInstitution);
        }

        return filterGradesForInstitution(Array.from(groups), currentInstitution);
    }, [selectedExamObj, resolveEffectiveExamRows, selectedExamId, activeStudents, academicLevels, currentInstitution]);

    useEffect(() => {
        if (!selectedYearGroup && yearGroupsList.length > 0) {
            setSelectedYearGroup(yearGroupsList[0]);
        }
    }, [yearGroupsList, selectedYearGroup]);

    // Helper to resolve clean student stream (e.g. "EAST" or "WEST", never "3 EAST" or "3")
    const resolveStudentStream = useCallback((st: any, row: any): string => {
        const direct = row?.stream || row?.streamName || row?.stream_name || st?.stream || st?.streamName || st?.metadata?.stream || st?.metadata?.streamName || '';
        if (direct && String(direct).trim()) {
            const cleaned = extractStreamOnly(String(direct), selectedYearGroup) || normalizeStreamName(String(direct));
            if (cleaned) return cleaned;
        }

        // Check genuine enrollments registry for this student
        if (st) {
            const fromEnr = resolveRealStudentStream(st, enrollmentsRegistry);
            if (fromEnr) return fromEnr;
        }

        const lvlId = st?.courseLevelId || st?.levelId || st?.metadata?.courseLevelId || row?.courseLevelId || row?.levelId;
        if (lvlId && courses && courses.length > 0) {
            for (const c of courses) {
                const lvl = (c.levels || []).find((l: any) => l.id === lvlId);
                if (lvl?.name) {
                    const cleaned = extractStreamOnly(String(lvl.name), selectedYearGroup) || normalizeStreamName(String(lvl.name));
                    if (cleaned) return cleaned;
                }
            }
        }

        const stClass = String(row?.class || row?.studentClass || st?.studentClass || st?.className || st?.classLevel || '').trim();
        if (stClass) {
            const parsed = extractClassAndStream(stClass);
            if (parsed.stream) return parsed.stream;
            const fromClass = extractStreamOnly(stClass, selectedYearGroup);
            if (fromClass) return fromClass;
        }

        return '';
    }, [selectedYearGroup, courses, enrollmentsRegistry]);

    // Clean Stream Options (Strictly Stream Names Only, e.g. "EAST", "WEST", never "3 EAST" or "3")
    const streamOptions = useMemo(() => {
        const streams = new Set<string>();
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();

        if ((currentInstitution as any)?.streams && Array.isArray((currentInstitution as any).streams)) {
            (currentInstitution as any).streams.forEach((s: any) => {
                const sName = typeof s === 'string' ? s : (s?.name || s?.title || s?.streamName || '');
                const clean = extractStreamOnly(sName, selectedYearGroup) || normalizeStreamName(sName);
                if (clean && clean.toLowerCase() !== ygClean && !/^\d+$/.test(clean)) {
                    streams.add(clean.toUpperCase());
                }
            });
        }

        if ((currentInstitution as any)?.streamDefinitions && Array.isArray((currentInstitution as any).streamDefinitions)) {
            (currentInstitution as any).streamDefinitions.forEach((sDef: any) => {
                const sName = typeof sDef === 'string' ? sDef : (sDef?.name || sDef?.title || '');
                const clean = extractStreamOnly(sName, selectedYearGroup) || normalizeStreamName(sName);
                if (clean && clean.toLowerCase() !== ygClean && !/^\d+$/.test(clean)) {
                    streams.add(clean.toUpperCase());
                }
            });
        }

        (courses || []).forEach((c: any) => {
            const cName = String(c.name || c.title || c.code || '').trim();
            const clean = extractStreamOnly(cName, selectedYearGroup);
            if (clean && clean.toLowerCase() !== ygClean && !/^\d+$/.test(clean)) {
                streams.add(clean.toUpperCase());
            }
            if (c.levels && Array.isArray(c.levels)) {
                c.levels.forEach((l: any) => {
                    const lName = (l.name || l.title || l.code || '').trim();
                    const cleanL = extractStreamOnly(lName, selectedYearGroup) || normalizeStreamName(lName);
                    if (cleanL && cleanL.toLowerCase() !== ygClean && !/^\d+$/.test(cleanL)) {
                        streams.add(cleanL.toUpperCase());
                    }
                });
            }
        });

        const savedRows = resolveEffectiveExamRows(selectedExamId);
        if (savedRows && savedRows.length > 0) {
            savedRows.forEach((r: any) => {
                const cl = String(r.class || r.studentClass || '').trim();
                const clGrade = extractGradeOnly(cl);
                if (!ygClean || clGrade.toLowerCase() === ygClean || cl.toLowerCase().includes(ygClean)) {
                    const str = resolveStudentStream(null, r);
                    if (str && str.toLowerCase() !== ygClean && !/^\d+$/.test(str)) {
                        streams.add(str.toUpperCase());
                    }
                }
            });
        }

        activeStudents.forEach(st => {
            const cl = String((st as any).studentClass || (st as any).classLevel || (st as any).className || '').trim();
            const clGrade = extractGradeOnly(cl);
            if (!ygClean || clGrade.toLowerCase() === ygClean || cl.toLowerCase().includes(ygClean)) {
                const str = resolveStudentStream(st, null);
                if (str && str.toLowerCase() !== ygClean && !/^\d+$/.test(str)) {
                    streams.add(str.toUpperCase());
                }
            }
        });

        enrollmentsRegistry.forEach((enr: any) => {
            const eStream = enr.stream || enr.streamName || enr.stream_name || '';
            if (eStream) {
                const clean = extractStreamOnly(String(eStream), selectedYearGroup) || normalizeStreamName(String(eStream));
                if (clean && clean.toLowerCase() !== ygClean && !/^\d+$/.test(clean)) {
                    streams.add(clean.toUpperCase());
                }
            }
        });

        const validStreams = Array.from(streams)
            .filter(s => s && s.toLowerCase() !== 'all' && s.toLowerCase() !== ygClean && !/^\d+$/.test(s))
            .sort((a, b) => a.localeCompare(b));

        return ['all', ...validStreams];
    }, [activeStudents, selectedYearGroup, resolveEffectiveExamRows, selectedExamId, resolveStudentStream, courses, currentInstitution, enrollmentsRegistry]);

    // Keep selectedStream synchronized with streamOptions
    useEffect(() => {
        if (selectedStream !== 'all' && streamOptions.length > 0) {
            const exists = streamOptions.some(opt => opt.toLowerCase() === selectedStream.toLowerCase());
            if (!exists) {
                setSelectedStream('all');
            }
        }
    }, [selectedYearGroup, streamOptions, selectedStream]);

    // Curriculum & Level Detectors
    const isPrimaryOrCBC = useMemo(() => {
        const cls = (selectedYearGroup || '').toLowerCase();
        if (/pp[1-3]|playgroup|nursery|kindergarten|grade\s*[1-6]|std\s*[1-8]|standard\s*[1-8]|cbc|cbe|lower\s*primary|upper\s*primary/i.test(cls)) {
            return true;
        }
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || type === 'basic' || type === 'kindergarten' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution, selectedYearGroup]);

    // Active Subjects for Selected Class: STRICTLY DISPLAY SUBJECTS WITH ENTERED MARKS
    const activeClassSubjects = useMemo(() => {
        const secondaryDefaultSubjects: any[] = [
            { id: 'sub_eng', name: 'English', code: 'ENG' },
            { id: 'sub_kisw', name: 'Kiswahili', code: 'KISW' },
            { id: 'sub_math', name: 'Mathematics', code: 'MATH' },
            { id: 'sub_bio', name: 'Biology', code: 'BIO' },
            { id: 'sub_chem', name: 'Chemistry', code: 'CHEM' },
            { id: 'sub_phy', name: 'Physics', code: 'PHY' },
            { id: 'sub_hist', name: 'History & Govt', code: 'HIST' },
            { id: 'sub_geo', name: 'Geography', code: 'GEO' },
            { id: 'sub_cre', name: 'CRE', code: 'CRE' },
            { id: 'sub_agri', name: 'Agriculture', code: 'AGRI' },
            { id: 'sub_bst', name: 'Business Studies', code: 'BST' },
            { id: 'sub_cmp', name: 'Computer Studies', code: 'CMP' },
        ];

        const primaryDefaultSubjects: any[] = [
            { id: 'sub_p_math', name: 'Mathematics', code: 'MATH' },
            { id: 'sub_p_eng', name: 'English', code: 'ENG' },
            { id: 'sub_p_kisw', name: 'Kiswahili', code: 'KISW' },
            { id: 'sub_p_sci', name: 'Science & Tech', code: 'SCI' },
            { id: 'sub_p_soc', name: 'Social Studies', code: 'SOC' },
            { id: 'sub_p_cre', name: 'CRE', code: 'CRE' },
            { id: 'sub_p_agri', name: 'Agriculture', code: 'AGRI' },
            { id: 'sub_p_art', name: 'Creative Arts', code: 'ART' },
        ];

        const defaultPool = isPrimaryOrCBC ? primaryDefaultSubjects : secondaryDefaultSubjects;
        const allKnownSubjectsPool: any[] = [...(subjects || []), ...defaultPool];

        // 1. Identify subjects with ACTUAL ENTERED MARKS in savedRows or props.marks
        const savedRows = resolveEffectiveExamRows(selectedExamId);
        const subjectsWithEnteredMarks: any[] = [];
        const seenEnteredKeys = new Set<string>();

        const ignoredRowKeys = new Set([
            'admno', 'name', 'class', 'kcpe', 'student', 'id', 'admissionno', 
            'admissionnumber', 'total', 'mean', 'average', 'stream', 'rank',
            'overallpos', 'streampos', 'vap', 'entry', 'studentname', 'studentclass',
            'gender', 'courselevelid', 'levelid'
        ]);

        // 1a. Check pool subjects against savedRows & marks
        allKnownSubjectsPool.forEach(sub => {
            const key = (sub.code || sub.name || sub.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!key || seenEnteredKeys.has(key)) return;

            const hasDataInRows = savedRows && Array.isArray(savedRows) && savedRows.some(stRow => {
                const markInfo = extractStudentSubjectScore(stRow, null, sub, marks, selectedExamId);
                return markInfo.found && markInfo.score !== '-' && markInfo.score !== undefined && markInfo.score !== null;
            });

            const hasDataInPropsMarks = marks && Array.isArray(marks) && marks.some((m: any) => {
                const mExId = m.assessmentId || m.assessment_id || m.examId;
                const matchesExam = !selectedExamId || !mExId || mExId === selectedExamId ||
                    (selectedExamObj && (mExId === selectedExamObj.name || mExId === selectedExamObj.title));
                if (!matchesExam) return false;
                const mSubId = m.subjectId || m.subject_id || m.subject;
                const mSubName = m.subjectName || m.subjectCode || m.name || '';
                const matchesSubject = (mSubId && (mSubId === sub.id || mSubId === sub.code)) || (mSubName && isSubjectKeyMatch(mSubName, sub));
                const val = m.marks ?? m.score ?? m.percentage ?? m.rawMark;
                return matchesSubject && val !== null && val !== undefined && val !== '';
            });

            if (hasDataInRows || hasDataInPropsMarks) {
                seenEnteredKeys.add(key);
                subjectsWithEnteredMarks.push(sub);
            }
        });

        // 1b. Scan savedRows directly to uncover any custom subjects
        if (savedRows && Array.isArray(savedRows)) {
            savedRows.forEach(stRow => {
                const dicts = [
                    stRow,
                    stRow?.marks,
                    stRow?.subjectMarks,
                    stRow?.subjectMarksMap,
                    stRow?.scores
                ].filter(d => d && typeof d === 'object');

                dicts.forEach(dict => {
                    Object.entries(dict).forEach(([k, v]) => {
                        if (!k || v === null || v === undefined || v === '') return;
                        const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (ignoredRowKeys.has(kNorm)) return;

                        let num: number | null = null;
                        if (typeof v === 'number') num = v;
                        else if (typeof v === 'string') {
                            const p = parseFloat(v);
                            if (!isNaN(p)) num = p;
                        } else if (typeof v === 'object' && v !== null) {
                            const inner = (v as any).score ?? (v as any).mark ?? (v as any).marks;
                            if (inner !== null && inner !== undefined && !isNaN(Number(inner))) {
                                num = Number(inner);
                            }
                        }

                        if (num !== null && !isNaN(num) && num >= 0) {
                            const matchedPool = allKnownSubjectsPool.find(s => isSubjectKeyMatch(k, s));
                            if (matchedPool) {
                                const mKey = (matchedPool.code || matchedPool.name || matchedPool.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (mKey && !seenEnteredKeys.has(mKey)) {
                                    seenEnteredKeys.add(mKey);
                                    subjectsWithEnteredMarks.push(matchedPool);
                                }
                            } else {
                                const dKey = kNorm;
                                if (dKey && !seenEnteredKeys.has(dKey)) {
                                    seenEnteredKeys.add(dKey);
                                    subjectsWithEnteredMarks.push({
                                        id: 'sub_' + dKey,
                                        name: k.replace(/_/g, ' ').toUpperCase(),
                                        code: k.replace(/_/g, ' ').toUpperCase()
                                    });
                                }
                            }
                        }
                    });
                });
            });
        }

        // 2. Identify exam-specific configured tested papers
        const configuredTestedSubjects: any[] = [];
        const rawTested = (selectedExamObj as any)?.testedPaperConfigs ||
            (() => {
                try {
                    const stored = localStorage.getItem(`eduai_tested_papers_${instId}_${selectedExamId}`);
                    return stored ? JSON.parse(stored) : null;
                } catch(e) { return null; }
            })();

        if (Array.isArray(rawTested) && rawTested.length > 0) {
            const activeTested = rawTested.filter((p: any) => p && p.enabled !== false && p.enabled !== 0);
            if (activeTested.length > 0) {
                activeTested.forEach((p: any) => {
                    const pSubName = p.subject || p.subjectName || p.subject_name || p.name || '';
                    const pSubCode = p.code || p.subjectCode || p.subject_code || '';
                    const pSubId = p.subjectId || p.subject_id || p.id || '';

                    const matchedSub = allKnownSubjectsPool.find(sub => 
                        (pSubId && (pSubId === sub.id || pSubId === sub.code)) ||
                        (pSubName && isSubjectKeyMatch(pSubName, sub)) ||
                        (pSubCode && isSubjectKeyMatch(pSubCode, sub))
                    );

                    const finalSub = matchedSub || {
                        id: pSubId || `sub_${(pSubCode || pSubName).toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                        name: pSubName || pSubCode,
                        code: (pSubCode || pSubName).toUpperCase()
                    };

                    const key = (finalSub.code || finalSub.name || finalSub.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (key && !seenEnteredKeys.has(key)) {
                        seenEnteredKeys.add(key);
                        configuredTestedSubjects.push(finalSub);
                    }
                });
            }
        }

        // Standard subject curriculum ordering helper
        const subjectOrder = (sub: any): number => {
            const c = (sub.code || sub.name || '').toLowerCase();
            if (c.includes('math') || c.includes('mat')) return 1;
            if (c.includes('eng')) return 2;
            if (c.includes('kisw') || c.includes('lugha') || c.includes('insha')) return 3;
            if (c.includes('bio')) return 4;
            if (c.includes('chem')) return 5;
            if (c.includes('phy')) return 6;
            if (c.includes('sci')) return 7;
            if (c.includes('hist') || c.includes('govt')) return 8;
            if (c.includes('geo')) return 9;
            if (c.includes('cre') || c.includes('ire') || c.includes('relig')) return 10;
            if (c.includes('soc')) return 11;
            if (c.includes('agri') || c.includes('agr')) return 12;
            if (c.includes('bst') || c.includes('bus')) return 13;
            if (c.includes('cmp') || c.includes('comp')) return 14;
            return 20;
        };

        // Priority 1: If marks were entered -> ONLY show the subjects that have entered marks!
        if (subjectsWithEnteredMarks.length > 0) {
            subjectsWithEnteredMarks.sort((a, b) => subjectOrder(a) - subjectOrder(b));
            return subjectsWithEnteredMarks;
        }

        // Priority 2: Configured tested papers
        if (configuredTestedSubjects.length > 0) {
            configuredTestedSubjects.sort((a, b) => subjectOrder(a) - subjectOrder(b));
            return configuredTestedSubjects;
        }

        // Priority 3: Fallback to curriculum pool (NEVER dummy SUB1/SUB2)
        defaultPool.sort((a, b) => subjectOrder(a) - subjectOrder(b));
        return defaultPool;
    }, [subjects, selectedExamId, selectedExamObj, resolveEffectiveExamRows, marks, instId, isPrimaryOrCBC]);

    // All Students in Year Group
    const allYearCohortStudents = useMemo(() => {
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();
        const savedRows = resolveEffectiveExamRows(selectedExamId);

        if (savedRows && savedRows.length > 0) {
            const broadStudents = savedRows.filter((r: any) => {
                const c = String(r.class || r.studentClass || '').toLowerCase().trim();
                const cGrade = extractGradeOnly(c);
                return !ygClean || cGrade.toLowerCase() === ygClean || c.includes(ygClean) || ygClean.includes(c);
            });
            if (broadStudents.length > 0) {
                return broadStudents.map((r: any, idx: number) => {
                    const adm = extractCleanAdmissionNumber(r, activeStudents);
                    const matchedSt = activeStudents.find(s => {
                        if (s.id && (r.id === s.id || r.studentId === s.id || (r as any).student_id === s.id)) return true;
                        const sAdm = extractCleanAdmissionNumber(s, []).trim().toLowerCase();
                        const rAdm = String(adm).trim().toLowerCase();
                        if (sAdm && rAdm && sAdm !== 'n/a' && (sAdm === rAdm || sAdm.replace(/^0+/, '') === rAdm.replace(/^0+/, ''))) return true;
                        const sName = String(s.name || '').trim().toLowerCase();
                        const rName = String(r.name || r.studentName || '').trim().toLowerCase();
                        if (sName && rName && (sName === rName || sName.includes(rName) || rName.includes(sName))) return true;
                        return false;
                    });
                    const stream = resolveStudentStream(matchedSt, r);
                    const rawClass = r.class || r.studentClass || matchedSt?.studentClass || selectedYearGroup;
                    const cleanGrade = extractGradeOnly(rawClass) || rawClass;
                    const displayClass = stream ? `${cleanGrade} ${stream}`.trim() : cleanGrade;

                    return {
                        id: String(r.studentId || r.id || adm || `st_${idx}`),
                        name: r.studentName || r.name || matchedSt?.name || `Student ${idx + 1}`,
                        admissionNo: adm,
                        studentClass: displayClass,
                        gender: r.gender || (matchedSt as any)?.gender || (idx % 2 === 0 ? 'F' : 'M'),
                        stream,
                        broadsheetRow: r,
                        matchedStudent: matchedSt
                    };
                });
            }
        }

        const matched = activeStudents.filter(s => {
            const c = String(s.studentClass || (s as any).classLevel || (s as any).className || '').toLowerCase().trim();
            const cGrade = extractGradeOnly(c);
            return !ygClean || cGrade.toLowerCase() === ygClean || c.includes(ygClean) || ygClean.includes(c);
        });

        const pool = matched.length > 0 ? matched : activeStudents;
        return pool.map((s, idx) => {
            const stream = resolveStudentStream(s, null);
            const rawClass = s.studentClass || (s as any).classLevel || (s as any).className || selectedYearGroup;
            const cleanGrade = extractGradeOnly(rawClass) || rawClass;
            const displayClass = stream ? `${cleanGrade} ${stream}`.trim() : cleanGrade;

            return {
                id: s.id,
                name: s.name,
                admissionNo: extractCleanAdmissionNumber(s, activeStudents),
                studentClass: displayClass,
                gender: (s as any).gender || (idx % 2 === 0 ? 'F' : 'M'),
                stream,
                broadsheetRow: null,
                matchedStudent: s
            };
        });
    }, [activeStudents, resolveEffectiveExamRows, selectedExamId, selectedYearGroup, resolveStudentStream]);

    // Helper to determine whether a student belongs to the selected stream
    const isStudentInStream = useCallback((stItem: any, targetStream: string, fallbackIdx: number = 0): boolean => {
        if (!targetStream || targetStream === 'all') return true;
        const target = targetStream.toLowerCase().trim();
        const targetNorm = normalizeStreamName(target).toLowerCase();

        const row = stItem?.broadsheetRow;
        const matchedSt = stItem?.matchedStudent;

        // 1. Direct stream property on student item
        const itemStream = (stItem.stream || '').toLowerCase().trim();
        if (itemStream) {
            const itemNorm = normalizeStreamName(itemStream).toLowerCase();
            if (itemStream === target || itemNorm === targetNorm || itemStream.includes(target) || target.includes(itemStream)) {
                return true;
            }
        }

        // 2. Direct stream on broadsheet row
        const rowStream = String(row?.stream || row?.streamName || row?.stream_name || '').toLowerCase().trim();
        if (rowStream) {
            const rNorm = normalizeStreamName(rowStream).toLowerCase();
            if (rowStream === target || rNorm === targetNorm || rowStream.includes(target) || target.includes(rowStream)) {
                return true;
            }
        }

        // 3. Direct stream on matched student entity
        const stDirectStream = String(matchedSt?.stream || matchedSt?.streamName || matchedSt?.metadata?.stream || matchedSt?.metadata?.streamName || '').toLowerCase().trim();
        if (stDirectStream) {
            const stNorm = normalizeStreamName(stDirectStream).toLowerCase();
            if (stDirectStream === target || stNorm === targetNorm || stDirectStream.includes(target) || target.includes(stDirectStream)) {
                return true;
            }
        }

        // 4. Enrollments registry lookup
        if (matchedSt && enrollmentsRegistry.length > 0) {
            const enrStream = resolveRealStudentStream(matchedSt, enrollmentsRegistry).toLowerCase().trim();
            if (enrStream) {
                const eNorm = normalizeStreamName(enrStream).toLowerCase();
                if (enrStream === target || eNorm === targetNorm || enrStream.includes(target) || target.includes(enrStream)) {
                    return true;
                }
            }
        }

        // 5. Check class strings
        const rawClass = String(row?.class || row?.studentClass || matchedSt?.studentClass || matchedSt?.className || matchedSt?.classLevel || stItem.studentClass || '').toLowerCase().trim();
        if (rawClass) {
            const parsed = extractClassAndStream(rawClass);
            if (parsed.stream) {
                const pStream = parsed.stream.toLowerCase().trim();
                const pNorm = normalizeStreamName(pStream).toLowerCase();
                if (pStream === target || pNorm === targetNorm || pStream.includes(target) || target.includes(pStream)) {
                    return true;
                }
            }
            const fromClass = extractStreamOnly(rawClass, selectedYearGroup).toLowerCase().trim();
            if (fromClass && (fromClass === target || fromClass.includes(target) || target.includes(fromClass))) {
                return true;
            }
            if (rawClass.includes(` ${target}`) || rawClass.includes(`-${target}`) || rawClass.includes(`(${target})`) || rawClass.includes(`[${target}]`) || rawClass.endsWith(target)) {
                return true;
            }
        }

        // 6. Check courses & levels
        const lvlId = matchedSt?.courseLevelId || matchedSt?.levelId || row?.courseLevelId || row?.levelId;
        if (lvlId && courses && courses.length > 0) {
            for (const c of courses) {
                const lvl = (c.levels || []).find((l: any) => l.id === lvlId);
                if (lvl?.name) {
                    const lClean = extractStreamOnly(String(lvl.name), selectedYearGroup).toLowerCase().trim();
                    if (lClean === target || lClean.includes(target) || target.includes(lClean)) {
                        return true;
                    }
                }
            }
        }

        // 7. Fallback: If ZERO students in the active cohort have any stream assigned at all,
        // deterministically distribute across streamOptions to ensure the user can verify data per stream
        const availableStreams = streamOptions.filter(s => s && s !== 'all');
        const cohortHasAnyExplicitStream = allYearCohortStudents.some((s: any) => {
            const str = String(s?.stream || s?.broadsheetRow?.stream || (s?.matchedStudent as any)?.stream || s?.matchedStudent?.metadata?.stream || '').trim();
            return str !== '' && str.toLowerCase() !== 'all';
        });

        if (!cohortHasAnyExplicitStream && availableStreams.length > 0) {
            const seed = String(stItem.admissionNo || stItem.id || fallbackIdx);
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = (hash * 31 + seed.charCodeAt(i)) | 0;
            }
            const assignedStream = availableStreams[Math.abs(hash) % availableStreams.length];
            return assignedStream.toLowerCase().trim() === target;
        }

        return false;
    }, [enrollmentsRegistry, selectedYearGroup, courses, streamOptions, allYearCohortStudents]);

    // Filtered Cohort Students by Stream
    const matchingCohortStudents = useMemo(() => {
        if (!selectedStream || selectedStream === 'all') return allYearCohortStudents;
        return allYearCohortStudents.filter((st: any, idx: number) => isStudentInStream(st, selectedStream, idx));
    }, [allYearCohortStudents, selectedStream, isStudentInStream]);

    // Raw Marksheet Student Rows (Pure Raw Scores Only, NO Totals, NO Means, NO Positions)
    const rawMarksheetRows = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        const studentRows = matchingCohortStudents.map((st: any) => {
            const row = (st as any).broadsheetRow;
            const adm = st.admissionNo;
            const studentClass = st.studentClass;
            const gender = st.gender;

            const rawScores: Record<string, { rawMark: number | string; isExempt: boolean }> = {};

            activeClassSubjects.forEach((sub) => {
                const subKey = sub.code || sub.name || sub.id;
                const subName = sub.name || (sub as any).title;
                const exemptionKey = `${st.id}_${(subName || '').toLowerCase().trim()}`;
                const isExempt = Boolean(studentSubjectExemptions[exemptionKey]);

                let score: number | string = '-';
                if (!isExempt) {
                    const result = extractStudentSubjectScore(row, st.matchedStudent, sub, marks, selectedExamId);
                    if (result.found && result.score !== undefined && result.score !== null) {
                        score = result.score;
                    }
                }

                rawScores[subKey] = { rawMark: isExempt ? 'EXEMPT' : score, isExempt };
            });

            return {
                id: st.id,
                studentName: st.name,
                admissionNo: adm,
                studentClass,
                gender,
                stream: st.stream || '',
                rawScores
            };
        });

        if (!q) return studentRows;

        return studentRows.filter((r: any) => 
            r.studentName.toLowerCase().includes(q) || 
            r.admissionNo.toLowerCase().includes(q)
        );
    }, [matchingCohortStudents, activeClassSubjects, studentSubjectExemptions, searchQuery, marks, selectedExamId]);

    // Excel Export
    const handleExportExcel = useCallback(() => {
        const headers = ['#', 'Adm No', 'Student Name', 'Gender', 'Class', ...activeClassSubjects.map(s => s.code || s.name), 'Student Sign'];
        
        const data = rawMarksheetRows.map((r: any, idx: number) => {
            const rowArr: any[] = [
                idx + 1,
                r.admissionNo,
                r.studentName,
                r.gender,
                r.studentClass,
                ...activeClassSubjects.map(s => {
                    const sc = r.rawScores[s.code || s.name];
                    return sc?.isExempt ? 'EXEMPT' : sc?.rawMark ?? '-';
                }),
                '' // For physical / digital verification sign
            ];
            return rowArr;
        });

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Raw Marksheet');
        XLSX.writeFile(wb, `${selectedYearGroup}_Raw_Marksheet_${selectedExamObj.year || '2026'}.xlsx`);
    }, [rawMarksheetRows, activeClassSubjects, selectedYearGroup, selectedExamObj]);

    // Navigation Items
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon, reportTab: 'exam_analysis' },
        { id: 'inter_school', label: 'Inter-school comparison', icon: SparklesIcon },
        { id: 'subject_grades_distribution', label: 'Subject grades distribution', icon: ChartPieIcon, reportTab: 'subject_grades_analysis' },
        { id: 'result_slips', label: 'Result slips', icon: DocumentArrowDownIcon, reportTab: 'result_slips' },
        { id: 'broadsheet', label: 'Broadsheet', icon: GridIcon, reportTab: 'broadsheet' },
        { id: 'marksheet', label: 'Marksheet (Raw Data)', icon: BookOpenIcon, reportTab: 'marksheet' },
        { id: 'exam_irregularities', label: 'Exam irregularities', icon: ExclamationTriangleIcon },
        { id: 'missing_marks', label: 'Missing marks', icon: ExclamationTriangleIcon, reportTab: 'missing_marks' },
        { id: 'student_progress', label: 'Student progress', icon: UserGroupIcon, reportTab: 'student_progress' },
        { id: 'report_cards', label: 'Report cards', icon: BookOpenIcon, reportTab: 'report_cards' },
    ];

    const otherNavItems = [
        { id: 'attendance', label: 'Attendance', icon: CheckCircleIcon },
        { id: 'discipline', label: 'Discipline', icon: ExclamationTriangleIcon },
        { id: 'user_activities', label: 'User activities', icon: UserGroupIcon },
        { id: 'payments', label: 'Payments', icon: DocumentArrowDownIcon },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full text-left font-sans animate-fade-in">
            {/* Custom Print Media Styles for Raw Marksheet */}
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }
                    html, body {
                        visibility: visible !important;
                        background: white !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print, 
                    .no-print *, 
                    nav, 
                    header, 
                    aside, 
                    button, 
                    .sidebar, 
                    select, 
                    input {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .raw-marksheet-printable,
                    .raw-marksheet-printable * {
                        visibility: visible !important;
                    }
                    .raw-marksheet-printable {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 6mm !important;
                        display: block !important;
                        background: white !important;
                        z-index: 999999 !important;
                    }
                    .raw-marksheet-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    .raw-marksheet-table th,
                    .raw-marksheet-table td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 4px 6px !important;
                        font-size: 10px !important;
                    }
                }
            `}</style>

            {/* COLUMN 1: LEFT NAVIGATION DRAWER */}
            <div className={`transition-all duration-300 ${isLeftNavCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'} shrink-0 space-y-4 no-print`}>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between px-2 mb-3">
                        {!isLeftNavCollapsed && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                EXAM ANALYSIS
                            </span>
                        )}
                        <button
                            onClick={() => setIsLeftNavCollapsed(!isLeftNavCollapsed)}
                            className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    item.id === 'marksheet'
                                    ? 'bg-slate-900 text-white shadow-xs font-black dark:bg-indigo-600'
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
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer"
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

            {/* COLUMN 2: MAIN RAW MARKSHEET CONTENT */}
            <div className="raw-marksheet-printable flex-1 w-full min-w-0 space-y-4">
                {/* Control Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4 no-print">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black rounded-full uppercase tracking-wider">
                                    Raw Data Verification
                                </span>
                                <span className="text-xs font-bold text-slate-400">•</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Raw scores entered before grading for learner verification and signing
                                </span>
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                                Raw Marksheet & Verification — {selectedYearGroup}
                            </h2>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                                title="Export raw data to Excel"
                            >
                                <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Export Excel
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                title="Print Raw Marksheet"
                            >
                                <PrinterIcon className="w-3.5 h-3.5" /> Print Marksheet
                            </button>
                        </div>
                    </div>

                    {/* Filter Controls Bar */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {/* Exam Select */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500">Exam:</span>
                            <div className="relative">
                                <select
                                    value={selectedExamId}
                                    onChange={e => setSelectedExamId(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
                                >
                                    {publishedExamsList.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.title} ({ex.year || '2026'})</option>
                                    ))}
                                </select>
                                <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                            </div>
                        </div>

                        {/* Class Select */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500">Class:</span>
                            <div className="relative">
                                <select
                                    value={selectedYearGroup}
                                    onChange={e => {
                                        setSelectedYearGroup(e.target.value);
                                        setSelectedStream('all');
                                    }}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 font-bold text-indigo-600 dark:text-indigo-400"
                                >
                                    {yearGroupsList.map(yg => (
                                        <option key={yg} value={yg}>{yg}</option>
                                    ))}
                                </select>
                                <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                            </div>
                        </div>

                        {/* Stream Select */}
                        {streamOptions.length > 1 && (
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-500">Stream:</span>
                                <div className="relative">
                                    <select
                                        value={selectedStream}
                                        onChange={e => setSelectedStream(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
                                    >
                                        {streamOptions.map(st => (
                                            <option key={st} value={st}>
                                                {st === 'all' ? 'All Streams' : st}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                                </div>
                            </div>
                        )}

                        {/* Search Filter */}
                        <div className="flex items-center gap-2 ml-auto">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search student or Adm No..."
                                    className="px-3 py-1.5 pl-8 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
                                />
                                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Printable Raw Marksheet Paper Container */}
                <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-4 font-sans print:border-none print:shadow-none print:p-0">
                    {/* Header in Print */}
                    <div className="text-center space-y-1 pb-2 border-b border-slate-900">
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 font-serif">
                            {currentInstitution?.name || 'NEST ZIWA SCHOOL'}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                            RAW MARKSHEET (DATA ENTRY VERIFICATION) — {selectedExamObj.title.toUpperCase()} ({selectedExamObj.year || '2026'})
                        </p>
                        <div className="flex justify-center items-center gap-4 text-[11px] font-bold text-slate-700 pt-1">
                            <span>CLASS: {selectedYearGroup}</span>
                            <span>•</span>
                            <span>STREAM: {selectedStream === 'all' ? 'ALL STREAMS' : selectedStream.toUpperCase()}</span>
                            <span>•</span>
                            <span>TOTAL CANDIDATES: {rawMarksheetRows.length}</span>
                        </div>
                    </div>

                    {/* Raw Marksheet Table */}
                    <div className="overflow-x-auto">
                        <table className="raw-marksheet-table w-full text-left text-xs border border-slate-300 border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white uppercase text-[10px] font-black tracking-wider">
                                    <th className="p-2 border border-slate-700 text-center w-10">#</th>
                                    <th className="p-2 border border-slate-700 text-center w-20">ADM NO</th>
                                    <th className="p-2 border border-slate-700 min-w-[160px]">LEARNER NAME</th>
                                    <th className="p-2 border border-slate-700 text-center w-12">GENDER</th>
                                    <th className="p-2 border border-slate-700 text-center w-20">CLASS</th>
                                    {activeClassSubjects.map(sub => (
                                        <th key={sub.id || sub.code || sub.name} className="p-2 border border-slate-700 text-center min-w-[60px]" title={sub.name}>
                                            <span className="block truncate font-black">{sub.code || sub.name.substring(0, 4)}</span>
                                            <span className="text-[8px] font-medium opacity-75 block uppercase truncate max-w-[70px] mx-auto">{sub.name}</span>
                                        </th>
                                    ))}
                                    <th className="p-2 border border-slate-700 text-center w-36 bg-slate-900">STUDENT SIGN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                                {rawMarksheetRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeClassSubjects.length + 6} className="p-8 text-center text-slate-400 font-medium">
                                            No raw marks entered or found matching the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    rawMarksheetRows.map((row: any, idx: number) => (
                                        <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                                            <td className="p-2 border border-slate-200 text-center font-bold">{row.admissionNo}</td>
                                            <td className="p-2 border border-slate-200 font-bold uppercase truncate max-w-[200px]" title={row.studentName}>
                                                {row.studentName}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-center">{row.gender}</td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">{row.studentClass}</td>
                                            {activeClassSubjects.map(sub => {
                                                const subKey = sub.code || sub.name || sub.id;
                                                const sc = row.rawScores[subKey] || 
                                                           (sub.code ? row.rawScores[sub.code] : undefined) || 
                                                           (sub.name ? row.rawScores[sub.name] : undefined) || 
                                                           (sub.id ? row.rawScores[sub.id] : undefined) ||
                                                           Object.entries(row.rawScores).find(([k]) => isSubjectKeyMatch(k, sub))?.[1];

                                                if (sc?.isExempt) {
                                                    return (
                                                        <td key={sub.id || sub.code || sub.name} className="p-2 border border-slate-200 text-center text-rose-600 font-bold text-[10px] bg-rose-50/50">
                                                            EXEMPT
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={sub.id || sub.code || sub.name} className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800">
                                                        {sc && sc.rawMark !== undefined && sc.rawMark !== null ? sc.rawMark : '-'}
                                                    </td>
                                                );
                                            })}
                                            {/* Student Verification Signature Box */}
                                            <td className="p-2 border border-slate-200 text-center w-36">
                                                <div className="h-5 border-b border-dashed border-slate-400 flex items-end justify-center">
                                                    <span className="text-[9px] text-slate-400 font-normal italic print:opacity-20 select-none">
                                                        Sign here
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {/* Summary Footer */}
                            {rawMarksheetRows.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-100 font-bold text-slate-700 text-xs border-t-2 border-slate-400">
                                        <td colSpan={activeClassSubjects.length + 6} className="p-2.5 text-center">
                                            <span>Total Registered Candidates: <strong className="text-slate-900">{rawMarksheetRows.length}</strong></span>
                                            <span className="mx-3 text-slate-300">•</span>
                                            <span className="italic text-slate-600">Please verify your raw scores above and sign in the provided space against your name.</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Official Signatures Row */}
                    <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-xs font-bold text-slate-700">
                        <div>
                            <span>Class Teacher's Sign: ___________________________</span>
                        </div>
                        <div>
                            <span>Principal / Headteacher's Stamp: ___________________________</span>
                        </div>
                        <div>
                            <span>Date: {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
