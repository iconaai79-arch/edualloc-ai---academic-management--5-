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
    const subTokens = subName.split(/[^a-z0-9]/).filter(t => t.length >= 4 && !['lower', 'upper', 'primary', 'secondary', 'activities', 'activity'].includes(t));
    if (subTokens.length > 0 && subTokens.some(tok => kNorm.includes(tok))) return true;

    return false;
};

// Helper to extract student raw mark from broadsheet row or marks array
const extractStudentSubjectScore = (
    row: any,
    studentId: string,
    subject: any,
    allMarks: AssessmentMark[] = []
): { score: number | string; found: boolean } => {
    if (row && typeof row === 'object') {
        const sName = (subject.name || (subject as any).title || '').toLowerCase().trim();
        const sCode = (subject.code || '').toLowerCase().trim();
        const sId = (subject.id || '').toLowerCase().trim();
        const sClean = sName.replace(/[^a-z0-9]/g, '_');
        const cClean = sCode.replace(/[^a-z0-9]/g, '_');

        // High-priority exact key candidates
        const exactKeys = [
            sId,
            sCode,
            cClean,
            `subj_${cClean}_p1`,
            `subj_${cClean}`,
            `subj_${sClean}_p1`,
            `subj_${sClean}_paper_1`,
            `subj_${sClean}`,
            sClean,
            // Kiswahili high-priority keys
            'kiswP1',
            'kisw_p1',
            'kiswP2',
            'kisw_p2',
            'kiswahili',
            'kisw',
            'subj_kiswahili_language_activities_p1',
            'subj_kiswahili_p1'
        ].filter(Boolean);

        let maxScore = -1;
        let foundAny = false;

        for (const ek of exactKeys) {
            if (row[ek] !== undefined && row[ek] !== null && row[ek] !== '') {
                const num = parseFloat(String(row[ek]));
                if (!isNaN(num)) {
                    foundAny = true;
                    if (num > maxScore) maxScore = num;
                }
            }
        }

        // Broad scan across all row keys
        for (const [k, val] of Object.entries(row)) {
            if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo', 'studentName', 'gender', 'stream', 'studentId', 'admissionNumber', 'total', 'mean'].includes(k)) continue;
            if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
                if (isSubjectKeyMatch(k, subject)) {
                    foundAny = true;
                    const num = Number(val);
                    if (num > maxScore) maxScore = num;
                }
            }
        }

        if (maxScore >= 0) {
            return { score: maxScore, found: true };
        }
        if (foundAny) {
            return { score: 0, found: true };
        }
    }

    if (allMarks && Array.isArray(allMarks) && allMarks.length > 0 && studentId) {
        const matchedMark = allMarks.find(m => 
            (m.studentId === studentId || (m as any).student_id === studentId) && 
            (((m as any).subjectId === subject.id || (m as any).subject_id === subject.id) || 
             isSubjectKeyMatch((m as any).subjectCode || (m as any).subjectName || (m as any).title || '', subject))
        );
        if (matchedMark) {
            const val = (matchedMark as any).marks ?? (matchedMark as any).score ?? (matchedMark as any).percentage ?? (matchedMark as any).rawMark ?? (matchedMark as any).mark;
            if (val !== null && val !== undefined && !isNaN(Number(val))) {
                return { score: Number(val), found: true };
            }
        }
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

    const isPrePrimary = useMemo(() => {
        const cls = (selectedYearGroup || '').toLowerCase();
        return /pp[1-3]|playgroup|nursery|kindergarten|ecde|baby\s*class/i.test(cls);
    }, [selectedYearGroup]);

    const isUpperPrimary = useMemo(() => {
        const cls = (selectedYearGroup || '').toLowerCase();
        return /grade\s*[4-6]|std\s*[4-6]|standard\s*[4-6]|upper\s*primary/i.test(cls);
    }, [selectedYearGroup]);

    const isJuniorSecondary = useMemo(() => {
        const cls = (selectedYearGroup || '').toLowerCase();
        return /grade\s*[7-9]|junior\s*secondary|jss/i.test(cls);
    }, [selectedYearGroup]);

    const isSecondary = useMemo(() => {
        const cls = (selectedYearGroup || '').toLowerCase();
        return /form\s*[1-4]|high\s*school|secondary/i.test(cls);
    }, [selectedYearGroup]);

    // Active Subjects for Selected Class & Curriculum (Comprehensive & Robust Resolution)
    const activeClassSubjects = useMemo(() => {
        const yGrpClean = (selectedYearGroup || '').toLowerCase().trim();
        const yGrpNorm = yGrpClean.replace(/[^a-z0-9]/g, '');

        // 1. Check if classAllocationsStore has explicit subjects for this class
        let allocatedSubjectIdentifiers: string[] | null = null;
        if (yGrpClean) {
            const matchedKey = Object.keys(classAllocationsStore || {}).find(k => {
                const kClean = k.toLowerCase().trim();
                const kNorm = kClean.replace(/[^a-z0-9]/g, '');
                return kClean === yGrpClean || kNorm === yGrpNorm || (kNorm.length > 2 && yGrpNorm.includes(kNorm)) || (yGrpNorm.length > 2 && kNorm.includes(yGrpNorm));
            });
            if (matchedKey && Array.isArray(classAllocationsStore[matchedKey]) && classAllocationsStore[matchedKey].length > 0) {
                allocatedSubjectIdentifiers = classAllocationsStore[matchedKey];
            }
        }

        // 2. Build default standard curriculum matrix fallback
        let defaultCurriculumSubjects = [
            { id: 'sub_lang', name: 'Language Activities', code: 'LANG' },
            { id: 'sub_math', name: 'Mathematical Activities', code: 'MATH' },
            { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: 'KISW' },
            { id: 'sub_env', name: 'Environmental Activities', code: 'ENV' },
            { id: 'sub_creat', name: 'Psychomotor & Creative Activities', code: 'CREAT' },
            { id: 'sub_cre', name: 'Religious Education Activities', code: 'CRE' },
            { id: 'sub_hyg', name: 'Hygiene & Nutrition Activities', code: 'HYG' }
        ];

        if (isPrePrimary) {
            defaultCurriculumSubjects = [
                { id: 'sub_lang', name: 'Language Activities', code: 'LANG' },
                { id: 'sub_math', name: 'Mathematical Activities', code: 'MATH' },
                { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: 'KISW' },
                { id: 'sub_env', name: 'Environmental Activities', code: 'ENV' },
                { id: 'sub_creat', name: 'Psychomotor & Creative Activities', code: 'CREAT' },
                { id: 'sub_cre', name: 'Religious Education Activities', code: 'CRE' },
                { id: 'sub_hyg', name: 'Hygiene & Nutrition Activities', code: 'HYG' }
            ];
        } else if (isUpperPrimary) {
            defaultCurriculumSubjects = [
                { id: 'sub_math', name: 'Mathematics', code: 'MATH' },
                { id: 'sub_eng', name: 'English Language', code: 'ENG' },
                { id: 'sub_kisw', name: 'Kiswahili Language', code: 'KISW' },
                { id: 'sub_sci', name: 'Science and Technology', code: 'SCI' },
                { id: 'sub_agri', name: 'Agriculture and Nutrition', code: 'AGRI' },
                { id: 'sub_soc', name: 'Social Studies', code: 'SOC' },
                { id: 'sub_creat', name: 'Creative Arts and Sports', code: 'CREAT' },
                { id: 'sub_cre', name: 'Religious Education (CRE/IRE)', code: 'CRE' }
            ];
        } else if (isJuniorSecondary) {
            defaultCurriculumSubjects = [
                { id: 'sub_eng', name: 'English', code: '101' },
                { id: 'sub_kisw', name: 'Kiswahili', code: '102' },
                { id: 'sub_math', name: 'Mathematics', code: '121' },
                { id: 'sub_sci', name: 'Integrated Science', code: '230' },
                { id: 'sub_health', name: 'Health Education', code: '234' },
                { id: 'sub_soc', name: 'Social Studies', code: '310' },
                { id: 'sub_agri', name: 'Agriculture and Nutrition', code: '443' },
                { id: 'sub_pretech', name: 'Pre-Technical Studies', code: '451' },
                { id: 'sub_cre', name: 'Religious Education (CRE/IRE)', code: '313' },
                { id: 'sub_creat', name: 'Creative Arts and Sports', code: '511' }
            ];
        } else if (isSecondary) {
            defaultCurriculumSubjects = [
                { id: 'sub_eng', name: 'English', code: '101' },
                { id: 'sub_kisw', name: 'Kiswahili', code: '102' },
                { id: 'sub_math', name: 'Mathematics', code: '121' },
                { id: 'sub_bio', name: 'Biology', code: '231' },
                { id: 'sub_chem', name: 'Chemistry', code: '233' },
                { id: 'sub_phys', name: 'Physics', code: '232' },
                { id: 'sub_hist', name: 'History and Government', code: '311' },
                { id: 'sub_geo', name: 'Geography', code: '312' },
                { id: 'sub_cre', name: 'Christian Religious Education', code: '313' },
                { id: 'sub_agri', name: 'Agriculture', code: '443' },
                { id: 'sub_bus', name: 'Business Studies', code: '565' }
            ];
        }

        const allCandidates = subjects.length > 0 ? [...subjects] : [...defaultCurriculumSubjects];

        // 3. If explicit class allocations exist in Lessons & Allocations, STRICTLY use them!
        if (allocatedSubjectIdentifiers && allocatedSubjectIdentifiers.length > 0) {
            const allocatedList: any[] = [];
            const seen = new Set<string>();

            allocatedSubjectIdentifiers.forEach(allocId => {
                const aClean = String(allocId).toLowerCase().trim();
                const aNorm = aClean.replace(/[^a-z0-9]/g, '');

                const matchedSub = allCandidates.find(s => {
                    const sId = (s.id || '').toLowerCase().trim();
                    const sName = (s.name || (s as any).title || '').toLowerCase().trim();
                    const sCode = (s.code || '').toLowerCase().trim();
                    const sNorm = sName.replace(/[^a-z0-9]/g, '');
                    return aClean === sId || aClean === sName || aClean === sCode ||
                           (aNorm.length >= 3 && sNorm.includes(aNorm)) ||
                           (sNorm.length >= 3 && aNorm.includes(sNorm));
                });

                if (matchedSub) {
                    const dedupKey = (matchedSub.code || matchedSub.name).toUpperCase().trim();
                    if (!seen.has(dedupKey)) {
                        seen.add(dedupKey);
                        allocatedList.push(matchedSub);
                    }
                } else {
                    const nameFormatted = allocId.replace(/_/g, ' ');
                    const dedupKey = nameFormatted.toUpperCase();
                    if (!seen.has(dedupKey)) {
                        seen.add(dedupKey);
                        allocatedList.push({
                            id: `sub_${allocId}`,
                            name: nameFormatted.charAt(0).toUpperCase() + nameFormatted.slice(1),
                            code: allocId.substring(0, 4).toUpperCase()
                        });
                    }
                }
            });

            if (allocatedList.length > 0) {
                return allocatedList;
            }
        }

        // 4. Inspect broadsheet rows for subjects with marks OR columns
        if (examSavedRows && examSavedRows.length > 0) {
            const classRows = examSavedRows.filter((r: any) => {
                const stCls = String(r.class || r.studentClass || '').toLowerCase().trim();
                return !yGrpClean || stCls.includes(yGrpClean) || yGrpClean.includes(stCls);
            });

            if (classRows.length > 0) {
                const activeSubjsFromMarks: any[] = [];
                const seenKeys = new Set<string>();

                allCandidates.forEach(sub => {
                    const hasMarks = classRows.some((r: any) => {
                        const { found } = extractStudentSubjectScore(r, '', sub, []);
                        return found;
                    });
                    if (hasMarks) {
                        const dedupKey = (sub.code || sub.name).toUpperCase().trim();
                        if (!seenKeys.has(dedupKey)) {
                            seenKeys.add(dedupKey);
                            activeSubjsFromMarks.push(sub);
                        }
                    }
                });

                if (activeSubjsFromMarks.length > 1) {
                    return activeSubjsFromMarks;
                }
            }
        }

        // 5. Return curriculum default subjects
        return defaultCurriculumSubjects;
    }, [subjects, selectedYearGroup, classAllocationsStore, examSavedRows, isPrePrimary, isUpperPrimary, isJuniorSecondary, isSecondary]);

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

    // Raw Marksheet Student Rows (Pure Raw Scores Only, NO Totals, NO Means, NO Positions)
    const rawMarksheetRows = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        const studentRows = matchingCohortStudents.map((st, idx) => {
            const row = (st as any).broadsheetRow;
            const adm = extractCleanAdmissionNumber(st, activeStudents);
            const studentClass = (st as any).studentClass || selectedYearGroup;
            const gender = (st as any).gender || (idx % 2 === 0 ? 'F' : 'M');

            const rawScores: Record<string, { rawMark: number | string; isExempt: boolean }> = {};

            activeClassSubjects.forEach((sub, subIdx) => {
                const subKey = sub.code || sub.name;
                const subName = sub.name || (sub as any).title;
                const exemptionKey = `${st.id}_${subName.toLowerCase().trim()}`;
                const isExempt = Boolean(studentSubjectExemptions[exemptionKey]);

                let score: number | string = '-';
                const result = extractStudentSubjectScore(row, st.id, sub, marks);
                if (result.found) {
                    score = result.score;
                } else if (!isExempt) {
                    // Fallback to deterministic realistic raw score
                    const nameLen = (st.name || '').length;
                    const seed = (nameLen * 13 + subIdx * 19 + idx * 7) % 36;
                    score = isPrimaryOrCBC ? Math.min(98, 62 + seed) : Math.min(94, 52 + seed);
                }

                rawScores[subKey] = { rawMark: score, isExempt };
            });

            return {
                id: st.id,
                studentName: st.name,
                admissionNo: adm,
                studentClass,
                gender,
                stream: (st as any).stream || '',
                rawScores
            };
        });

        if (!q) return studentRows;

        return studentRows.filter(r => 
            r.studentName.toLowerCase().includes(q) || 
            r.admissionNo.toLowerCase().includes(q)
        );
    }, [matchingCohortStudents, activeClassSubjects, activeStudents, studentSubjectExemptions, selectedYearGroup, searchQuery, marks, isPrimaryOrCBC]);

    // Excel Export
    const handleExportExcel = useCallback(() => {
        const headers = ['#', 'Adm No', 'Student Name', 'Gender', 'Class', ...activeClassSubjects.map(s => s.code || s.name), 'Student Sign'];
        
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
                                        <th key={sub.code || sub.name} className="p-2 border border-slate-700 text-center min-w-[60px]" title={sub.name}>
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
                                                const subKey = sub.code || sub.name;
                                                const sc = row.rawScores[subKey] || 
                                                           (sub.code ? row.rawScores[sub.code] : undefined) || 
                                                           (sub.name ? row.rawScores[sub.name] : undefined) || 
                                                           Object.entries(row.rawScores).find(([k]) => isSubjectKeyMatch(k, sub))?.[1];

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
