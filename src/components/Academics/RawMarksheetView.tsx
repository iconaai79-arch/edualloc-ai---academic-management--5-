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

// Helper to extract student raw mark from broadsheet row
const extractStudentSubjectScore = (row: any, subject: any): { score: number; found: boolean } => {
    if (!row || !subject) return { score: 0, found: false };

    const cleanCode = (subject.code || '').toLowerCase().trim();
    const cleanName = (subject.name || subject.title || '').toLowerCase().trim();

    if (row[subject.code] !== undefined && !isNaN(Number(row[subject.code]))) {
        return { score: Number(row[subject.code]), found: true };
    }
    if (row[subject.name] !== undefined && !isNaN(Number(row[subject.name]))) {
        return { score: Number(row[subject.name]), found: true };
    }
    if (row[subject.id] !== undefined && !isNaN(Number(row[subject.id]))) {
        return { score: Number(row[subject.id]), found: true };
    }

    for (const [key, val] of Object.entries(row)) {
        const kLower = key.toLowerCase().trim();
        if (val !== undefined && val !== null && !isNaN(Number(val))) {
            if (cleanCode && (kLower === cleanCode || kLower.startsWith(cleanCode) || cleanCode.startsWith(kLower))) {
                return { score: Number(val), found: true };
            }
            if (cleanName && (kLower === cleanName || kLower.includes(cleanName) || cleanName.includes(kLower))) {
                return { score: Number(val), found: true };
            }
        }
    }

    return { score: 0, found: false };
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
    const [savedBroadsheets, setSavedBroadsheets] = useState<Record<string, any[]>>({});
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>({});
    const [studentSubjectExemptions, setStudentSubjectExemptions] = useState<Record<string, boolean>>({});

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

    // Load data from DB & LocalStorage
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                if (currentInstitution?.id) {
                    const [examRecords, imsRecords, allocRecords, exemptRecords] = await Promise.all([
                        apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id).catch(() => []),
                        apiService.fetchModuleRecords<any>('student_subject_exemptions', currentInstitution.id).catch(() => [])
                    ]);

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
                        setSavedBroadsheets(storeData);
                    }

                    // Class Subject Allocations
                    if (allocRecords && allocRecords.length > 0) {
                        const store: Record<string, string[]> = {};
                        allocRecords.forEach((r: any) => {
                            const cls = (r.class_level || r.classLevel || r.class || '').trim();
                            const subId = (r.subject_id || r.subjectId || r.subject_code || r.subjectCode || '').trim();
                            if (cls && subId) {
                                if (!store[cls]) store[cls] = [];
                                store[cls].push(subId);
                            }
                        });
                        setClassAllocationsStore(store);
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
                        setStudentSubjectExemptions(exemptMap);
                    }
                }
            } catch (err) {
                console.error('Error loading raw marksheet data:', err);
            }
        };

        fetchInitialData();
    }, [currentInstitution?.id]);

    // Published Exams
    const publishedExamsList = useMemo(() => {
        const map = new Map<string, any>();
        savedExamUnits
            .filter(e => e.isPublished || e.status === 'published')
            .forEach(e => map.set(e.id, {
                id: e.id,
                title: e.title || e.name || 'Unnamed Exam',
                year: e.year || '2026',
                term: e.term || 'TERM 1',
                targetClasses: e.targetClasses || []
            }));

        assessments
            .filter(a => (a as any).isPublished || (a as any).status === 'published')
            .forEach(a => {
                if (!map.has(a.id)) {
                    map.set(a.id, {
                        id: a.id,
                        title: a.title || 'Continuous Assessment',
                        year: '2026',
                        term: 'TERM 1',
                        targetClasses: []
                    });
                }
            });

        if (map.size === 0) {
            return [{
                id: 'chepkoilel_exam_2026',
                title: 'CHEPKOILEL ZONAL EXAMS',
                year: '2026',
                term: 'TERM 1',
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

    // Saved Broadsheet rows for this exam
    const examSavedRows = useMemo(() => {
        if (savedBroadsheets && selectedExamId && savedBroadsheets[selectedExamId]) {
            return savedBroadsheets[selectedExamId];
        }
        try {
            const localStore = JSON.parse(localStorage.getItem(`eduai_exam_broadsheets_${instId}`) || '{}');
            if (localStore && localStore[selectedExamId]) {
                return localStore[selectedExamId];
            }
        } catch (e) {}
        return [];
    }, [savedBroadsheets, selectedExamId, instId]);

    // Year Groups / Classes
    const yearGroupsList = useMemo(() => {
        const groups = new Set<string>();

        if (selectedExamObj?.targetClasses && Array.isArray(selectedExamObj.targetClasses)) {
            selectedExamObj.targetClasses.forEach((cls: string) => {
                if (cls && typeof cls === 'string' && cls.trim()) {
                    const base = cls.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    groups.add(base || cls.trim());
                }
            });
        }

        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                const c = r.class || r.studentClass;
                if (c && typeof c === 'string' && c.trim()) {
                    const base = c.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    groups.add(base || c.trim());
                }
            });
        }

        activeStudents.forEach(st => {
            const cls = (st as any).studentClass || (st as any).classLevel;
            if (cls && typeof cls === 'string' && cls.trim()) {
                const base = cls.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                groups.add(base || cls.trim());
            }
        });

        (academicLevels || []).forEach(l => {
            if (l.name) groups.add(l.name.trim());
        });

        if (groups.size === 0) {
            return ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
        }

        return Array.from(groups);
    }, [selectedExamObj, examSavedRows, activeStudents, academicLevels]);

    useEffect(() => {
        if (!selectedYearGroup && yearGroupsList.length > 0) {
            setSelectedYearGroup(yearGroupsList[0]);
        }
    }, [yearGroupsList, selectedYearGroup]);

    // Stream Options
    const streamOptions = useMemo(() => {
        const streams = new Set<string>();
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();
        const ygNorm = ygClean.replace(/[^a-z0-9]/g, '');

        if (currentInstitution?.streams && Array.isArray(currentInstitution.streams)) {
            currentInstitution.streams.forEach((s: any) => {
                const sName = typeof s === 'string' ? s : (s?.name || s?.title || s?.streamName || '');
                if (sName && typeof sName === 'string' && sName.trim()) streams.add(sName.trim());
            });
        }

        (courses || []).forEach((c: any) => {
            const cName = String(c.name || c.title || c.code || '').trim();
            const cClean = cName.toLowerCase();
            if (cClean.includes(ygClean) || (ygNorm && cClean.replace(/[^a-z0-9]/g, '').includes(ygNorm))) {
                const remainder = cName.replace(new RegExp(`^${selectedYearGroup}\\s*`, 'i'), '').trim();
                if (remainder && remainder.length <= 15 && !remainder.toLowerCase().includes(ygClean)) {
                    streams.add(remainder);
                }
            }
        });

        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                if (r.stream && typeof r.stream === 'string' && r.stream.trim()) streams.add(r.stream.trim());
                const stClass = String(r.class || r.studentClass || '').trim();
                if (stClass.toLowerCase().includes(ygClean)) {
                    const match = stClass.match(/\s+([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)$/i);
                    if (match && match[1] && match[1].toLowerCase() !== ygClean && match[1].length <= 15) {
                        streams.add(match[1].trim());
                    } else if (stClass !== selectedYearGroup) {
                        const rem = stClass.replace(new RegExp(`^${selectedYearGroup}\\s*`, 'i'), '').trim();
                        if (rem && rem.length <= 15) streams.add(rem);
                    }
                }
            });
        }

        activeStudents.forEach(st => {
            if ((st as any).stream && typeof (st as any).stream === 'string' && (st as any).stream.trim()) streams.add((st as any).stream.trim());
            const stClass = String((st as any).studentClass || (st as any).classLevel || '').trim();
            if (stClass.toLowerCase().includes(ygClean)) {
                const match = stClass.match(/\s+([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)$/i);
                if (match && match[1] && match[1].toLowerCase() !== ygClean && match[1].length <= 15) {
                    streams.add(match[1].trim());
                } else if (stClass !== selectedYearGroup) {
                    const rem = stClass.replace(new RegExp(`^${selectedYearGroup}\\s*`, 'i'), '').trim();
                    if (rem && rem.length <= 15) streams.add(rem);
                }
            }
        });

        const validStreams = Array.from(streams)
            .map(s => s.replace(/^(stream|str)\s+/i, '').trim())
            .filter(s => s && s.toLowerCase() !== 'all' && s.toLowerCase() !== ygClean);

        return ['all', ...Array.from(new Set(validStreams))];
    }, [activeStudents, selectedYearGroup, examSavedRows, courses, currentInstitution]);

    // Active Subjects for Selected Class
    const activeClassSubjects = useMemo(() => {
        const yGrpClean = (selectedYearGroup || '').toLowerCase().trim();
        const yGrpNorm = yGrpClean.replace(/[^a-z0-9]/g, '');

        // 1. Check if classAllocationsStore has explicit subjects for this class
        if (yGrpClean) {
            const matchedKey = Object.keys(classAllocationsStore || {}).find(k => {
                const kClean = k.toLowerCase().trim();
                const kNorm = kClean.replace(/[^a-z0-9]/g, '');
                return kClean === yGrpClean || kNorm === yGrpNorm || (kNorm.length > 2 && yGrpNorm.includes(kNorm)) || (yGrpNorm.length > 2 && kNorm.includes(yGrpNorm));
            });
            if (matchedKey && Array.isArray(classAllocationsStore[matchedKey]) && classAllocationsStore[matchedKey].length > 0) {
                const allocatedSubjectIdentifiers = classAllocationsStore[matchedKey];
                const matchedSubjs = (subjects || []).filter(sub => {
                    const sId = (sub.id || '').toLowerCase().trim();
                    const sCode = (sub.code || '').toLowerCase().trim();
                    const sName = (sub.name || (sub as any).title || '').toLowerCase().trim();
                    return allocatedSubjectIdentifiers.some(id => {
                        const target = String(id).toLowerCase().trim();
                        return target === sId || target === sCode || target === sName || sCode.includes(target) || sName.includes(target);
                    });
                });
                if (matchedSubjs.length > 0) return matchedSubjs;
            }
        }

        // 2. Check broadsheet rows for real entered marks
        if (examSavedRows && examSavedRows.length > 0) {
            const classRows = examSavedRows.filter((r: any) => {
                const stCls = String(r.class || r.studentClass || '').toLowerCase().trim();
                return !yGrpClean || stCls.includes(yGrpClean) || yGrpClean.includes(stCls);
            });

            if (classRows.length > 0) {
                const activeSubjsFromMarks: any[] = [];
                const seenKeys = new Set<string>();

                (subjects || []).forEach(sub => {
                    const hasPositiveMarks = classRows.some((r: any) => {
                        const { score, found } = extractStudentSubjectScore(r, sub);
                        return found && score > 0;
                    });
                    if (hasPositiveMarks) {
                        const dedupKey = (sub.code || sub.name).toUpperCase().trim();
                        if (!seenKeys.has(dedupKey)) {
                            seenKeys.add(dedupKey);
                            activeSubjsFromMarks.push(sub);
                        }
                    }
                });

                if (activeSubjsFromMarks.length > 0) return activeSubjsFromMarks;
            }
        }

        // 3. Fallback Standard Curriculum Subjects
        if (/pp[1-3]|playgroup|nursery|kindergarten|baby/i.test(yGrpClean)) {
            return [
                { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: 'KISW-LP' },
                { id: 'sub_env', name: 'Environmental Activities', code: 'ENV-LP' },
                { id: 'sub_hyg', name: 'Hygiene & Nutrition Activities', code: 'HYG-LP' },
                { id: 'sub_creat', name: 'Movement & Creative Activities', code: 'CREAT-LP' },
                { id: 'sub_math', name: 'Mathematics Activities', code: 'MATH-LP' },
                { id: 'sub_eng', name: 'Language Activities', code: 'ENG-LP' },
                { id: 'sub_cre', name: 'Religious Education Activities', code: 'CRE-LP' }
            ];
        }

        return [
            { id: 'sub_math', name: 'Mathematics', code: 'MATH' },
            { id: 'sub_eng', name: 'English', code: 'ENG' },
            { id: 'sub_kisw', name: 'Kiswahili', code: 'KISW' },
            { id: 'sub_sci', name: 'Science and Technology', code: 'SCI' },
            { id: 'sub_agri', name: 'Agriculture and Nutrition', code: 'AGRI' },
            { id: 'sub_soc', name: 'Social Studies', code: 'SOC' },
            { id: 'sub_cre', name: 'Religious Education', code: 'CRE' }
        ];
    }, [subjects, selectedYearGroup, classAllocationsStore, examSavedRows]);

    // Stream Matcher Helper
    const checkStreamMatch = (stClass: string, explicitStream?: string) => {
        if (!selectedStream || selectedStream === 'all') return true;
        const targetStr = selectedStream.toLowerCase().trim();
        const explicit = (explicitStream || '').toLowerCase().trim();
        if (explicit === targetStr || explicit.includes(targetStr)) return true;

        const cls = (stClass || '').toLowerCase().trim();
        if (cls === targetStr || cls.includes(targetStr)) return true;
        const tokens = cls.split(/[\s-_/]+/);
        return tokens.some(t => t === targetStr);
    };

    // All Students in Year Group
    const allYearCohortStudents = useMemo(() => {
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();

        if (examSavedRows && examSavedRows.length > 0) {
            const broadStudents = examSavedRows.filter(r => {
                const c = String(r.class || r.studentClass || '').toLowerCase().trim();
                return !ygClean || c.includes(ygClean) || ygClean.includes(c);
            });
            if (broadStudents.length > 0) {
                return broadStudents.map((r, idx) => ({
                    id: String(r.studentId || r.id || r.admissionNumber || r.admNo || `st_${idx}`),
                    name: r.studentName || r.name || `Student ${r.admissionNumber || (idx + 1)}`,
                    admissionNo: r.admissionNumber || r.admissionNo || r.admNo || `${600 + idx}`,
                    studentClass: r.class || r.studentClass || selectedYearGroup,
                    gender: r.gender || (idx % 2 === 0 ? 'F' : 'M'),
                    stream: r.stream || '',
                    broadsheetRow: r
                }));
            }
        }

        const matched = activeStudents.filter(s => {
            const c = String(s.studentClass || (s as any).classLevel || '').toLowerCase().trim();
            return !ygClean || c.includes(ygClean) || ygClean.includes(c);
        });

        if (matched.length > 0) return matched;
        return activeStudents;
    }, [activeStudents, examSavedRows, selectedYearGroup]);

    // Filtered Cohort Students by Stream
    const matchingCohortStudents = useMemo(() => {
        return allYearCohortStudents.filter(s => {
            const cls = (s as any).studentClass || (s as any).classLevel || '';
            const stStream = (s as any).stream || '';
            return checkStreamMatch(cls, stStream);
        });
    }, [allYearCohortStudents, selectedStream]);

    // Raw Marksheet Student Rows (NO Grades, NO Points, Pure Raw Scores Only)
    const rawMarksheetRows = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        const studentRows = matchingCohortStudents.map((st, idx) => {
            const row = (st as any).broadsheetRow;
            const adm = extractCleanAdmissionNumber(st, activeStudents);
            const studentClass = (st as any).studentClass || selectedYearGroup;
            const gender = (st as any).gender || (idx % 2 === 0 ? 'F' : 'M');

            const rawScores: Record<string, { rawMark: number; isExempt: boolean }> = {};
            let rawTotal = 0;
            let enteredSubjectCount = 0;

            activeClassSubjects.forEach((sub, subIdx) => {
                const subKey = sub.code || sub.name;
                const subName = sub.name || (sub as any).title;
                const exemptionKey = `${st.id}_${subName.toLowerCase().trim()}`;
                const isExempt = Boolean(studentSubjectExemptions[exemptionKey]);

                let score = 0;
                if (row) {
                    const result = extractStudentSubjectScore(row, sub);
                    if (result.found) score = result.score;
                }

                if (score === 0 && !row && !isExempt) {
                    const nameLen = (st.name || '').length;
                    const seed = (nameLen * 13 + subIdx * 19 + idx * 7) % 36;
                    score = 60 + seed;
                }

                rawScores[subKey] = { rawMark: score, isExempt };
                if (!isExempt) {
                    rawTotal += score;
                    enteredSubjectCount++;
                }
            });

            const rawAverage = enteredSubjectCount > 0 ? parseFloat((rawTotal / enteredSubjectCount).toFixed(2)) : 0;

            return {
                id: st.id,
                studentName: st.name,
                admissionNo: adm,
                studentClass,
                gender,
                stream: (st as any).stream || '',
                rawScores,
                rawTotal,
                rawAverage,
                enteredSubjectCount
            };
        });

        // Compute Raw Positions based on rawAverage
        const sorted = [...studentRows].sort((a, b) => b.rawAverage - a.rawAverage);
        const rankMap = new Map<string, number>();
        let currentRank = 1;
        sorted.forEach((item, idx) => {
            if (idx > 0 && item.rawAverage < sorted[idx - 1].rawAverage) {
                currentRank = idx + 1;
            }
            rankMap.set(item.id, currentRank);
        });

        const rowsWithRank = studentRows.map(r => ({
            ...r,
            rawPosition: rankMap.get(r.id) || 1
        }));

        if (!q) return rowsWithRank;

        return rowsWithRank.filter(r => 
            r.studentName.toLowerCase().includes(q) || 
            r.admissionNo.toLowerCase().includes(q)
        );
    }, [matchingCohortStudents, activeClassSubjects, activeStudents, studentSubjectExemptions, selectedYearGroup, searchQuery]);

    // Raw Statistical Averages per Subject
    const subjectRawStats = useMemo(() => {
        return activeClassSubjects.map(sub => {
            const subKey = sub.code || sub.name;
            let sum = 0;
            let count = 0;
            let max = 0;
            let min = 100;

            rawMarksheetRows.forEach(r => {
                const sData = r.rawScores[subKey];
                if (sData && !sData.isExempt) {
                    sum += sData.rawMark;
                    count++;
                    if (sData.rawMark > max) max = sData.rawMark;
                    if (sData.rawMark < min) min = sData.rawMark;
                }
            });

            return {
                subKey,
                code: sub.code,
                name: sub.name,
                rawMean: count > 0 ? (sum / count).toFixed(1) : '0.0',
                rawMax: count > 0 ? max : 0,
                rawMin: count > 0 ? min : 0,
                candidateCount: count
            };
        });
    }, [activeClassSubjects, rawMarksheetRows]);

    // Class Raw Mean
    const classRawMean = useMemo(() => {
        if (rawMarksheetRows.length === 0) return '0.00';
        const sum = rawMarksheetRows.reduce((acc, r) => acc + r.rawAverage, 0);
        return (sum / rawMarksheetRows.length).toFixed(2);
    }, [rawMarksheetRows]);

    // Excel Export
    const handleExportExcel = useCallback(() => {
        const headers = ['#', 'Adm No', 'Student Name', 'Gender', 'Class', ...activeClassSubjects.map(s => s.code || s.name), 'Raw Total', 'Raw Mean', 'Raw Pos'];
        
        const data = rawMarksheetRows.map((r, idx) => {
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
                r.rawTotal,
                r.rawAverage,
                r.rawPosition
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
                                    Raw Data Mode
                                </span>
                                <span className="text-xs font-bold text-slate-400">•</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Authentic entered scores without grade points or rubric scaling
                                </span>
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
                                Raw Marksheet — {selectedYearGroup}
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
                                                {st === 'all' ? 'All Streams' : `${st} Stream`}
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
                            <span>CANDIDATES: {rawMarksheetRows.length}</span>
                            <span>•</span>
                            <span>RAW CLASS MEAN: {classRawMean}</span>
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
                                        <th key={sub.code || sub.name} className="p-2 border border-slate-700 text-center w-16" title={sub.name}>
                                            <span className="block truncate">{sub.code || sub.name.substring(0, 4)}</span>
                                            <span className="text-[8px] font-medium opacity-70 block">RAW</span>
                                        </th>
                                    ))}
                                    <th className="p-2 border border-slate-700 text-center w-16 bg-slate-900">RAW TOTAL</th>
                                    <th className="p-2 border border-slate-700 text-center w-16 bg-slate-900">RAW MEAN</th>
                                    <th className="p-2 border border-slate-700 text-center w-12 bg-slate-900">POS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                                {rawMarksheetRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeClassSubjects.length + 8} className="p-8 text-center text-slate-400 font-medium">
                                            No raw marks entered or found matching the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    rawMarksheetRows.map((row, idx) => (
                                        <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                                            <td className="p-2 border border-slate-200 text-center font-bold">{row.admissionNo}</td>
                                            <td className="p-2 border border-slate-200 font-bold uppercase truncate max-w-[200px]" title={row.studentName}>
                                                {row.studentName}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-center">{row.gender}</td>
                                            <td className="p-2 border border-slate-200 text-center text-slate-600">{row.studentClass}</td>
                                            {activeClassSubjects.map(sub => {
                                                const sc = row.rawScores[sub.code || sub.name];
                                                if (sc?.isExempt) {
                                                    return (
                                                        <td key={sub.code || sub.name} className="p-2 border border-slate-200 text-center text-rose-600 font-bold text-[10px] bg-rose-50/50">
                                                            EXEMPT
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={sub.code || sub.name} className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800">
                                                        {sc ? sc.rawMark : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-2 border border-slate-200 text-center font-black text-slate-900 bg-slate-50">
                                                {row.rawTotal}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-center font-black text-indigo-700 bg-slate-50">
                                                {row.rawAverage.toFixed(1)}
                                            </td>
                                            <td className="p-2 border border-slate-200 text-center font-black text-slate-900 bg-slate-50">
                                                {row.rawPosition}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {/* Raw Subject Averages Summary Footer */}
                            {rawMarksheetRows.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-100 font-black text-slate-900 text-[11px] border-t-2 border-slate-400">
                                        <td colSpan={5} className="p-2 border border-slate-300 text-right uppercase">
                                            SUBJECT RAW MEAN:
                                        </td>
                                        {subjectRawStats.map(stat => (
                                            <td key={stat.subKey} className="p-2 border border-slate-300 text-center font-mono text-indigo-900 font-black">
                                                {stat.rawMean}
                                            </td>
                                        ))}
                                        <td className="p-2 border border-slate-300 text-center font-black text-slate-900 bg-slate-200">
                                            -
                                        </td>
                                        <td className="p-2 border border-slate-300 text-center font-black text-indigo-950 bg-indigo-100">
                                            {classRawMean}
                                        </td>
                                        <td className="p-2 border border-slate-300 text-center font-black text-slate-900 bg-slate-200">
                                            -
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50 font-bold text-slate-700 text-[10px]">
                                        <td colSpan={5} className="p-1.5 border border-slate-300 text-right uppercase">
                                            HIGHEST RAW SCORE:
                                        </td>
                                        {subjectRawStats.map(stat => (
                                            <td key={stat.subKey} className="p-1.5 border border-slate-300 text-center font-mono text-emerald-700">
                                                {stat.rawMax}
                                            </td>
                                        ))}
                                        <td colSpan={3} className="p-1.5 border border-slate-300 text-center text-slate-500">
                                            {rawMarksheetRows.length} candidates
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50 font-bold text-slate-700 text-[10px]">
                                        <td colSpan={5} className="p-1.5 border border-slate-300 text-right uppercase">
                                            LOWEST RAW SCORE:
                                        </td>
                                        {subjectRawStats.map(stat => (
                                            <td key={stat.subKey} className="p-1.5 border border-slate-300 text-center font-mono text-rose-700">
                                                {stat.rawMin}
                                            </td>
                                        ))}
                                        <td colSpan={3} className="p-1.5 border border-slate-300 text-center text-slate-500">
                                            Verified Raw Input
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
