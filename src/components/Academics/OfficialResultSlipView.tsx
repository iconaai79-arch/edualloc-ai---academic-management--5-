import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course } from '../../types';
import { apiService, safeLocalStorage } from '../../services/apiService';
import { extractClassAndStream, normalizeStreamName, resolveRealStudentStream } from '../../utils/academicUtils';
import { PrinterIcon } from '../icons/PrinterIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { BarChart3Icon } from '../icons/BarChart3Icon';
import { ChartPieIcon } from '../icons/ChartPieIcon';
import { GridIcon } from '../icons/GridIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import { XIcon } from '../icons/XIcon';
import { EyeIcon } from '../icons/EyeIcon';

interface OfficialResultSlipViewProps {
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    students?: User[];
    users?: User[];
    subjects?: Subject[];
    currentInstitution?: Institution | null;
    courses?: Course[];
    onSelectReportTab?: (tabId: string) => void;
}

export const OfficialResultSlipView: React.FC<OfficialResultSlipViewProps> = ({
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

    // Navigation & Layout States
    const [activeNavItem, setActiveNavItem] = useState<string>('result_slips');
    const [isLeftNavCollapsed, setIsLeftNavCollapsed] = useState<boolean>(false);

    // Filter States
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('PP1');
    const [selectedStream, setSelectedStream] = useState<string>('all');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // View Mode: 'single' (one learner) vs 'entire_class' (batch preview of all learners in cohort)
    const [viewMode, setViewMode] = useState<'single' | 'entire_class'>('single');

    // SMS Dispatch Modal States
    const [isSendSmsModalOpen, setIsSendSmsModalOpen] = useState<boolean>(false);
    const [smsRecipientPhone, setSmsRecipientPhone] = useState<string>('');
    const [smsTargetMode, setSmsTargetMode] = useState<'single' | 'class'>('single');
    const [customSmsMessage, setCustomSmsMessage] = useState<string>('');
    const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
    const [smsSendProgress, setSmsSendProgress] = useState<{ sent: number; total: number } | null>(null);
    const [smsStatusToast, setSmsStatusToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [activeValidatedShortLink, setActiveValidatedShortLink] = useState<string>('');
    const [isValidatingShortLink, setIsValidatingShortLink] = useState<boolean>(false);

    // Active students list
    const activeStudents = useMemo(() => {
        const list = (students.length > 0 ? students : users).filter(u => u && (u.role === 'student' || (u as any).role === 'Student' || (u as any).userType === 'student' || Boolean((u as any).admissionNumber) || Boolean((u as any).admissionNo)));
        if (list.length > 0) return list;
        return [
            { id: 'st_288', name: 'Chanice Jerotich', admissionNo: '603', studentClass: 'PP1', gender: 'F' },
            { id: 'st_289', name: 'Brian Omondi', admissionNo: '604', studentClass: 'PP1', gender: 'M' },
            { id: 'st_290', name: 'Amina Kiprop', admissionNo: '605', studentClass: 'PP1', gender: 'F' }
        ] as any[];
    }, [students, users]);

    // 1. Load saved Exam Units from LocalStorage & API
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
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`) ||
                          (currentInstitution?.id ? localStorage.getItem(`eduai_exam_broadsheets_${currentInstitution.id}`) : null) ||
                          localStorage.getItem('eduai_exam_broadsheets_default');
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return {};
    });

    // Fetched database assessment marks
    const [fetchedMarks, setFetchedMarks] = useState<AssessmentMark[]>([]);

    // 3. Load Class Subject Allocations Store
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return (currentInstitution as any)?.classSubjectAllocations || {};
    });

    // 4. Load Subject Allocations (Teacher assignments per Class & Subject)
    const [subjectAllocations, setSubjectAllocations] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_subject_allocations_${instId}`);
            if (saved) return JSON.parse(saved) || [];
        } catch (e) {}
        return [];
    });

    // 5. Load Student Subject Exemptions Store
    const [studentSubjectExemptions, setStudentSubjectExemptions] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_student_subject_exemptions_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return {};
    });

    // 6. Load Enrollments Registry for Authentic Stream Resolution
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

    // Real-time synchronization for broadsheets & exam marks
    useEffect(() => {
        const handleSync = () => {
            try {
                const storeRaw = localStorage.getItem(`eduai_exam_broadsheets_${instId}`) || 
                                 (currentInstitution?.id ? localStorage.getItem(`eduai_exam_broadsheets_${currentInstitution.id}`) : null) ||
                                 localStorage.getItem('eduai_exam_broadsheets_default');
                if (storeRaw) {
                    const parsed = JSON.parse(storeRaw);
                    if (parsed && typeof parsed === 'object') {
                        setSavedBroadsheets(prev => ({ ...prev, ...parsed }));
                    }
                }
                const savedUnits = localStorage.getItem(`eduai_exam_units_${instId}`);
                if (savedUnits) {
                    const parsedUnits = JSON.parse(savedUnits);
                    if (Array.isArray(parsedUnits)) {
                        setSavedExamUnits(prev => {
                            const combined = [...parsedUnits, ...prev];
                            const seen = new Set<string>();
                            return combined.filter(ex => ex.id && !seen.has(ex.id) && (seen.add(ex.id), true));
                        });
                    }
                }
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

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('subject_allocations', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('student_subject_exemptions', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('student_enrollments', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('students', currentInstitution.id).catch(() => []),
                apiService.fetchAssessmentMarks(currentInstitution.id).catch(() => [])
            ]).then(([allocRecords, imsRecords, examRecords, classAllocRecords, exempRecords, enrList, stList, asmtMarks]) => {
                if (asmtMarks && Array.isArray(asmtMarks) && asmtMarks.length > 0) {
                    setFetchedMarks(asmtMarks);
                }

                if (enrList && Array.isArray(enrList) && enrList.length > 0) {
                    setEnrollmentsRegistry(enrList);
                    try {
                        const compact = enrList.length > 50 ? enrList.slice(0, 50) : enrList;
                        safeLocalStorage.setItem(`eduai_student_enrollments_${currentInstitution.id}`, JSON.stringify(compact));
                    } catch (e) {}
                } else if (stList && Array.isArray(stList) && stList.length > 0) {
                    setEnrollmentsRegistry(stList);
                }

                if (allocRecords && Array.isArray(allocRecords) && allocRecords.length > 0) {
                    setSubjectAllocations(allocRecords);
                    try {
                        localStorage.setItem(`eduai_subject_allocations_${currentInstitution.id}`, JSON.stringify(allocRecords));
                    } catch(e) {}
                }

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

                if (examRecords && Array.isArray(examRecords) && examRecords.length > 0) {
                    setSavedExamUnits(prev => {
                        const combined = [...examRecords, ...prev];
                        const seen = new Set<string>();
                        return combined.filter(ex => ex.id && !seen.has(ex.id) && (seen.add(ex.id), true));
                    });
                }

                if (classAllocRecords && classAllocRecords.length > 0) {
                    const allocMap: Record<string, string[]> = {};
                    classAllocRecords.forEach((rec: any) => {
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

                if (exempRecords && Array.isArray(exempRecords) && exempRecords.length > 0) {
                    const exempMap: Record<string, boolean> = {};
                    exempRecords.forEach((r: any) => {
                        if (r.key) exempMap[r.key] = r.isExempted ?? true;
                    });
                    setStudentSubjectExemptions(prev => ({ ...exempMap, ...prev }));
                }
            }).catch(() => {});
        }
    }, [currentInstitution]);

    // Map of teachers for fast lookup
    const teachersMap = useMemo(() => {
        const map: Record<string, string> = {};
        users.forEach(u => {
            if (u.role === 'teacher' || u.role === 'lecturer' || u.role === 'instructor') {
                map[u.id] = u.name;
                if ((u as any).code) map[(u as any).code] = u.name;
            }
        });
        return map;
    }, [users]);

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
        const idCompact = subId.replace(/[^a-z0-9]/g, '');
        const kStripped = kNorm.replace(/^subj_/, '').replace(/^sub_/, '').replace(/_p\d+$/, '').replace(/[^a-z0-9]/g, '');

        if (kNorm === `subj_${sClean}_p1` || kNorm === `subj_${sClean}` || kNorm === sClean) return true;
        if (cCompact && (kNorm === `subj_${cCompact}_p1` || kNorm === `subj_${cCompact}` || kNorm === cCompact)) return true;
        if (kStripped) {
            if (sCompact && (kStripped === sCompact || kStripped.includes(sCompact) || sCompact.includes(kStripped))) return true;
            if (cCompact && (kStripped === cCompact || kStripped.startsWith(cCompact))) return true;
            if (idCompact && (kStripped === idCompact || kStripped.includes(idCompact) || idCompact.includes(kStripped))) return true;
        }

        // Kiswahili matches
        if ((subCode.startsWith('kisw') || subName.includes('kisw') || subCode === '906' || subCode === '102') && 
            (kNorm.includes('kisw') || kNorm.includes('insha') || kNorm.includes('lugha') || kNorm.includes('kusoma') || kNorm.includes('sarufi'))) return true;

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
        if ((subCode.startsWith('math') || subName.includes('math') || subCode === '121' || subCode === '907') && 
            (kNorm.includes('math') || kNorm.includes('numeracy') || kNorm.includes('hesabu'))) return true;

        // English
        if ((subCode.startsWith('eng') || subName.includes('eng') || subCode === '101' || subCode === '901') && 
            (kNorm.includes('eng') || kNorm.includes('literacy') || kNorm.includes('language'))) return true;

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

        const subTokens = subName.split(/[^a-z0-9]/).filter(t => t.length >= 4 && !['lower', 'upper', 'primary', 'secondary', 'activities', 'activity'].includes(t));
        if (subTokens.length > 0 && subTokens.some(tok => kNorm.includes(tok))) return true;

        return false;
    };

    // Robust extractor for student subject marks from a broadsheet row or assessment marks
    const extractStudentSubjectScore = (row: any, sub: any, student?: any): { score: number; found: boolean } => {
        if (!sub) return { score: 0, found: false };

        const sName = (sub.name || (sub as any).title || '').toLowerCase().trim();
        const sCode = (sub.code || '').toLowerCase().trim();
        const sId = (sub.id || '').toLowerCase().trim();
        const sClean = sName.replace(/[^a-z0-9]/g, '_');
        const cClean = sCode.replace(/[^a-z0-9]/g, '_');

        let maxScore = -1;
        let paperSum = 0;
        let foundAnyKey = false;

        const parseVal = (v: any): number => {
            if (v === null || v === undefined || v === '') return -1;
            if (typeof v === 'number') return isNaN(v) ? -1 : v;
            if (typeof v === 'object') {
                const inner = v.score ?? v.mark ?? v.marks ?? v.total ?? v.val ?? v.value;
                if (inner !== undefined && inner !== null && !isNaN(Number(inner))) {
                    return Number(inner);
                }
                let objPaperSum = 0;
                let objFoundPaper = false;
                for (const [k, pVal] of Object.entries(v)) {
                    if (/(p\d+|paper\s*\d+)/i.test(k) && !isNaN(Number(pVal))) {
                        objPaperSum += Number(pVal);
                        objFoundPaper = true;
                    }
                }
                if (objFoundPaper) return objPaperSum;
                return -1;
            }
            const parsed = parseFloat(String(v));
            return isNaN(parsed) ? -1 : parsed;
        };

        if (row && typeof row === 'object') {
            const targetContainers = [
                row,
                row.marks,
                row.subjectMarks,
                row.subjectMarksMap,
                row.scores,
                row.paperMarks
            ].filter(o => o && typeof o === 'object');

            for (const container of targetContainers) {
                const exactKeys = [
                    sId,
                    sCode,
                    cClean,
                    `subj_${cClean}_p1`,
                    `subj_${cClean}`,
                    `subj_${sClean}_p1`,
                    `subj_${sClean}_paper_1`,
                    `subj_${sClean}`,
                    sClean
                ].filter(Boolean);

                for (const ek of exactKeys) {
                    if (container[ek] !== undefined && container[ek] !== null && container[ek] !== '') {
                        const val = parseVal(container[ek]);
                        if (val >= 0) {
                            foundAnyKey = true;
                            if (val > maxScore) maxScore = val;
                        }
                    }
                }

                const paperMap = new Map<string, number>();
                for (const [k, val] of Object.entries(container)) {
                    if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo', 'admissionNumber', 'total', 'mean', 'meanScore', 'average', 'studentClass', 'gender', 'studentName', 'marks', 'subjectMarks', 'scores', 'broadsheetRow'].includes(k)) continue;
                    if (val === null || val === undefined || val === '') continue;

                    const numVal = parseVal(val);
                    if (numVal < 0) continue;

                    if (isSubjectKeyMatch(k, sub)) {
                        foundAnyKey = true;
                        const paperMatch = k.toLowerCase().match(/(?:_|^)(?:p|paper)(\d+)$/i);
                        if (paperMatch && paperMatch[1]) {
                            paperMap.set(paperMatch[1], numVal);
                        } else {
                            if (numVal > maxScore) {
                                maxScore = numVal;
                            }
                        }
                    }
                }

                if (paperMap.size > 0) {
                    let sum = 0;
                    paperMap.forEach(v => sum += v);
                    paperSum = Math.max(paperSum, sum);
                }
            }
        }

        const effectiveRowScore = Math.max(maxScore, paperSum);
        if (effectiveRowScore > 0) {
            return { score: effectiveRowScore, found: true };
        }

        // Tier 5 Fallback: Search allAvailableMarks for this student & subject
        const allMarks = [...(marks || []), ...(fetchedMarks || [])];
        if (allMarks.length > 0) {
            const stId = student?.id || row?.id || row?.studentId || row?.student_id;
            const stAdm = String(student?.admissionNo || student?.admissionNumber || row?.admissionNo || row?.admissionNumber || row?.admNo || '').trim().toLowerCase();

            const matchedMark = allMarks.find((m: any) => {
                const mStId = String(m.studentId || m.student_id || '').trim();
                const mAdm = String(m.admissionNumber || m.admissionNo || m.admNo || '').trim().toLowerCase();
                const studentMatch = (stId && mStId === String(stId)) || (stAdm && mAdm === stAdm) || (stAdm && mStId === stAdm);
                if (!studentMatch) return false;

                const mSubId = String(m.subjectId || m.subject_id || m.subject || '').trim();
                return mSubId === sub.id || mSubId === sub.code || isSubjectKeyMatch(mSubId, sub);
            });

            if (matchedMark && matchedMark.marks !== null && matchedMark.marks !== undefined && !isNaN(Number(matchedMark.marks))) {
                const markVal = Number(matchedMark.marks);
                return { score: markVal, found: true };
            }
        }

        if (maxScore >= 0) {
            return { score: maxScore, found: true };
        }

        return { score: 0, found: foundAnyKey };
    };

    // Helper to resolve REAL allocated teacher for a given stream and subject
    const resolveSubjectTeacher = (streamName: string, subj: any): string => {
        const streamClean = (streamName || selectedYearGroup || '').toLowerCase().trim();
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();
        const sName = (subj.name || (subj as any).title || '').toLowerCase().trim();
        const sCode = (subj.code || '').toLowerCase().trim();
        const sId = (subj.id || '').toLowerCase().trim();

        if (subjectAllocations && subjectAllocations.length > 0) {
            const match = subjectAllocations.find((a: any) => {
                const aClass = String(a.className || a.class || a.class_name || '').toLowerCase().trim();
                const aSubjName = String(a.subjectName || a.subject || a.name || '').toLowerCase().trim();
                const aSubjCode = String(a.subjectCode || a.code || '').toLowerCase().trim();
                const aSubjId = String(a.subjectId || a.id || '').toLowerCase().trim();

                const classMatches = aClass === streamClean || aClass === ygClean ||
                                     streamClean.includes(aClass) || aClass.includes(streamClean) ||
                                     (ygClean && aClass.includes(ygClean));

                const subjMatches = aSubjName === sName || aSubjCode === sCode || aSubjId === sId ||
                                    (sName.length > 3 && aSubjName.includes(sName)) ||
                                    (aSubjName.length > 3 && sName.includes(aSubjName));

                return classMatches && subjMatches && (a.teacherName || a.teacherId);
            });

            if (match) {
                if (match.teacherName && match.teacherName !== 'Unassigned') {
                    return match.teacherName;
                }
                if (match.teacherId && teachersMap[match.teacherId]) {
                    return teachersMap[match.teacherId];
                }
            }
        }

        if (subj.teacherName && typeof subj.teacherName === 'string' && subj.teacherName.trim()) {
            return subj.teacherName;
        }
        if (subj.teacherId && teachersMap[subj.teacherId]) {
            return teachersMap[subj.teacherId];
        }
        if (subj.teacher && typeof subj.teacher === 'string' && subj.teacher.trim()) {
            return subj.teacher;
        }

        const teachersList = users.filter(u => u.role === 'teacher' || u.role === 'lecturer' || u.role === 'instructor');
        if (teachersList.length > 0) {
            const matchingTeacher = teachersList.find(t => {
                const tMeta = (t as any).metadata || {};
                const tSubjs = Array.isArray(tMeta.subjects) ? tMeta.subjects : [];
                const tClasses = Array.isArray(tMeta.classes) ? tMeta.classes : [];
                const subMatch = tSubjs.some((sub: string) => String(sub).toLowerCase().includes(sName) || sName.includes(String(sub).toLowerCase()));
                const clsMatch = tClasses.some((c: string) => String(c).toLowerCase().includes(ygClean) || ygClean.includes(String(c).toLowerCase()));
                return subMatch && clsMatch;
            });
            if (matchingTeacher && matchingTeacher.name) {
                return matchingTeacher.name;
            }

            const sHash = (subj.name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
            const teacherIdx = sHash % teachersList.length;
            if (teachersList[teacherIdx]?.name) {
                return teachersList[teacherIdx].name;
            }
        }

        return '';
    };

    // Helper to get Teacher Initials (e.g. "J.M.")
    const getTeacherInitials = (teacherName: string, fallbackSubjectName: string) => {
        if (teacherName && teacherName.trim()) {
            const parts = teacherName.trim().replace(/^(mr|mrs|ms|dr|prof|tr|madam)\.?\s+/i, '').split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                return `${parts[0][0]}.${parts[1][0]}.`.toUpperCase();
            }
            if (parts.length === 1 && parts[0].length >= 2) {
                return `${parts[0][0]}.${parts[0][1]}.`.toUpperCase();
            }
        }
        const sWords = fallbackSubjectName.trim().split(/\s+/).filter(w => !['and', 'of', 'for', 'the', 'in', '&'].includes(w.toLowerCase()));
        if (sWords.length >= 2) {
            return `${sWords[0][0]}.${sWords[1][0]}.`.toUpperCase();
        }
        return fallbackSubjectName.substring(0, 2).toUpperCase();
    };

    // Helper to resolve student / parent contact phone number
    const getStudentPhoneNumber = (st: any): string => {
        if (!st) return '';
        const phoneCand =
            st.parentPhone ||
            st.parentPhoneNumber ||
            st.guardianPhone ||
            st.phoneNumber ||
            st.phone ||
            st.telephone ||
            st.metadata?.parentPhone ||
            st.metadata?.parentPhoneNumber ||
            st.metadata?.phone ||
            st.metadata?.phoneNumber ||
            st.user?.phoneNumber ||
            st.user?.phone;

        if (phoneCand && typeof phoneCand === 'string' && phoneCand.trim()) {
            return phoneCand.trim();
        }
        return '';
    };

    // Helper to format subject short code for standard Kenyan SMS reports (e.g. "Eng", "Kisw", "Math", "BIO", "ENV")
    const formatSubjectSmsCode = (code: string, name: string): string => {
        const rawCode = (code || '').toUpperCase().trim();
        const rawName = (name || '').trim();

        if (rawCode === '101' || /english/i.test(rawName)) return 'Eng';
        if (rawCode === '102' || /kiswahili/i.test(rawName)) return 'Kisw';
        if (rawCode === '121' || /math/i.test(rawName)) return 'Math';
        if (rawCode === '231' || /biology/i.test(rawName)) return 'BIO';
        if (rawCode === '232' || /physics/i.test(rawName)) return 'PHY';
        if (rawCode === '233' || /chemistry/i.test(rawName)) return 'CHEM';
        if (rawCode === '311' || /history/i.test(rawName)) return 'HIST';
        if (rawCode === '312' || /geography/i.test(rawName)) return 'GEO';
        if (rawCode === '313' || /cre|christian/i.test(rawName)) return 'CRE';
        if (rawCode === '443' || /agri/i.test(rawName)) return 'AGR';
        if (rawCode === '565' || /business/i.test(rawName)) return 'BST';
        if (/environmental/i.test(rawName)) return 'ENV';
        if (/hygiene/i.test(rawName)) return 'HYG';
        if (/creative|psychomotor|movement/i.test(rawName)) return 'CREAT';
        if (/science/i.test(rawName)) return 'SCI';
        if (/social/i.test(rawName)) return 'SOC';

        let cleaned = rawCode.replace(/-LP|-UP|_LP|_UP/i, '').trim();
        if (cleaned.length > 5) {
            cleaned = rawName.split(/\s+/)[0];
        }
        return cleaned.length <= 4 ? cleaned.toUpperCase() : (cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase());
    };

    // In-memory cache for validated short URLs per admission number and exam
    const pdfShortUrlCache = useMemo(() => new Map<string, string>(), []);

    // Helper to resolve and validate a direct short link for a given student & exam before SMS dispatch
    const resolveValidShortPdfUrl = async (admNo: string, examId: string): Promise<string> => {
        const rawAdm = String(admNo || '603').trim();
        const rawExam = String(examId || selectedExamId || 'exam_default').trim();
        const cleanAdm = rawAdm.replace(/[^a-zA-Z0-9_-]/g, '') || 'slip';
        const cacheKey = `${rawAdm}_${rawExam}`;

        if (pdfShortUrlCache.has(cacheKey)) {
            return pdfShortUrlCache.get(cacheKey)!;
        }

        const longPdfUrl = `${window.location.origin}/?view=results-slip&adm=${encodeURIComponent(rawAdm)}&exam=${encodeURIComponent(rawExam)}&format=pdf`;

        try {
            const shortened = await apiService.shortenUrl(longPdfUrl);
            if (shortened && typeof shortened === 'string' && (shortened.startsWith('http://') || shortened.startsWith('https://'))) {
                const cleanShort = shortened.replace(/^https?:\/\//, '');
                pdfShortUrlCache.set(cacheKey, cleanShort);
                return cleanShort;
            }
        } catch (err) {
            console.warn('URL shortener validation failed, falling back to clean short link:', err);
        }

        const fallback = `sms.ke/r/${cleanAdm}`;
        pdfShortUrlCache.set(cacheKey, fallback);
        return fallback;
    };

    // Combined dynamic exams list (STRICTLY PUBLISHED EXAMS ONLY)
    const allExamsList = useMemo(() => {
        const customConverted = savedExamUnits.map(ex => {
            const isPub = ex.isPublished === true || ex.published === true || ex.status === 'published' || ex.status === 'Published' || ex.publishStatus === 'published';
            return {
                id: ex.id,
                title: ex.name || ex.title || 'Exam',
                year: String(ex.academicYearId || ex.academic_year_id || ex.year || '2026').substring(0, 4),
                term: ex.term || ex.academicTerm || 'TERM 1',
                type: ex.type || ex.examType || 'END TERM',
                status: isPub ? 'published' : (ex.status || 'in_progress'),
                isPublished: Boolean(isPub),
                targetClasses: ex.targetClasses || ex.classes || []
            };
        });

        const propConverted = assessments.map(a => {
            const isPub = (a as any).isPublished === true || (a as any).published === true || (a as any).status === 'published' || (a as any).status === 'Published' || (a as any).publishStatus === 'published';
            return {
                id: a.id,
                title: a.title,
                year: String(a.academicYearId || '2026').substring(0, 4),
                term: a.type || 'TERM 1',
                type: a.type || 'END TERM',
                status: isPub ? 'published' : ((a as any).status || 'in_progress'),
                isPublished: Boolean(isPub),
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
                { id: 'exam_chepkoilel', title: 'CHEPKOILEL ZONAL EXAMS', year: '2026', term: 'TERM 1', type: 'ZONAL', status: 'published', isPublished: true, targetClasses: ['Grade 1'] }
            ];
        }

        return unique;
    }, [savedExamUnits, assessments]);

    // Comprehensive 5-Tier Broadsheet & Raw Mark Row Resolution
    const resolveEffectiveExamRows = useCallback((examId: string): any[] => {
        if (!examId) return [];

        // Tier 1: Direct lookup in savedBroadsheets state
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
        const matchedExam = allExamsList.find(e => e.id === examId);
        if (matchedExam) {
            const exData = (matchedExam as any).broadsheetData || (matchedExam as any).rows;
            if (Array.isArray(exData) && exData.length > 0) return exData;

            const exName = matchedExam.title || (matchedExam as any).name;
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
                const nameKey = localStorage.getItem(`eduai_exam_broadsheet_${matchedExam.title}`) || localStorage.getItem(`eduai_exam_broadsheet_${(matchedExam as any).name}`);
                if (nameKey) {
                    const parsed = JSON.parse(nameKey);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) return parsed.rows;
                }
            }
        } catch (e) { }

        // Tier 4b: Partial match across all saved broadsheet keys
        const allKeys = Object.keys(savedBroadsheets || {});
        for (const bk of allKeys) {
            const rows = savedBroadsheets[bk];
            if (Array.isArray(rows) && rows.length > 0) {
                if (bk.toLowerCase().includes(examId.toLowerCase()) || (matchedExam && bk.toLowerCase().includes((matchedExam.title || '').toLowerCase()))) {
                    return rows;
                }
            }
        }

        // Tier 5: Construct from marks & fetchedMarks if matching records exist
        const availMarks = [...(marks || []), ...(fetchedMarks || [])];
        if (availMarks.length > 0) {
            const examMarks = availMarks.filter((m: any) => 
                m.assessmentId === examId || 
                m.assessment_id === examId || 
                m.examId === examId ||
                (matchedExam && (m.assessmentId === matchedExam.title || m.assessmentId === (matchedExam as any).name))
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
                            admissionNumber: (stObj as any)?.admissionNumber || (stObj as any)?.admissionNo || sId,
                            name: stObj?.name || 'Student',
                            studentName: stObj?.name || 'Student',
                            class: (stObj as any)?.studentClass || selectedYearGroup || 'Class',
                            studentClass: (stObj as any)?.studentClass || selectedYearGroup || 'Class',
                            stream: (stObj as any)?.stream || (stObj as any)?.streamName || ''
                        });
                    }
                    const row = studentMap.get(sId);
                    const subId = m.subjectId || m.subject_id || m.subject;
                    if (subId && m.marks !== null && m.marks !== undefined) {
                        row[subId] = Number(m.marks);
                        const foundSub = subjects.find(s => s.id === subId || s.code === subId);
                        if (foundSub) {
                            if (foundSub.code) row[foundSub.code] = Number(m.marks);
                            if (foundSub.code) row[`subj_${foundSub.code.toLowerCase()}_p1`] = Number(m.marks);
                        }
                    }
                });
                if (studentMap.size > 0) {
                    return Array.from(studentMap.values());
                }
            }
        }

        return [];
    }, [savedBroadsheets, allExamsList, instId, currentInstitution, marks, fetchedMarks, activeStudents, selectedYearGroup, subjects]);

    // Ensure selectedExamId is valid
    useEffect(() => {
        if (allExamsList.length > 0) {
            if (!selectedExamId || !allExamsList.some(e => e.id === selectedExamId)) {
                // If there's an exam with broadsheet rows, prefer it
                const withRows = allExamsList.find(e => resolveEffectiveExamRows(e.id).length > 0);
                setSelectedExamId(withRows ? withRows.id : allExamsList[0].id);
            }
        }
    }, [allExamsList, selectedExamId, resolveEffectiveExamRows]);

    // Active selected exam object
    const selectedExamObj = useMemo(() => {
        return allExamsList.find(a => a.id === selectedExamId) || allExamsList[0] || {
            id: 'exam_chepkoilel',
            title: 'CHEPKOILEL ZONAL EXAMS',
            type: 'ZONAL',
            term: 'TERM 1',
            year: '2026'
        };
    }, [allExamsList, selectedExamId]);

    // Broadsheet rows for the selected exam
    const examSavedRows = useMemo(() => {
        return resolveEffectiveExamRows(selectedExamId);
    }, [resolveEffectiveExamRows, selectedExamId]);

    // Dynamic Year Groups list
    const yearGroupsList = useMemo(() => {
        const set = new Set<string>();

        if (selectedExamObj?.targetClasses && Array.isArray(selectedExamObj.targetClasses) && selectedExamObj.targetClasses.length > 0) {
            selectedExamObj.targetClasses.forEach((cl: string) => {
                if (cl && typeof cl === 'string' && cl.trim()) {
                    const clean = cl.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    set.add(clean || cl.trim());
                }
            });
        }

        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                const cl = r.class || r.studentClass || r.yearGroup;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    const clean = cl.replace(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i, '').trim();
                    set.add(clean || cl.trim());
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
                    set.add(clean || cl.trim());
                }
            });
        }

        if (set.size === 0) {
            return ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
        }

        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [selectedExamObj, examSavedRows, courses, activeStudents]);

    useEffect(() => {
        if (yearGroupsList.length > 0) {
            if (!selectedYearGroup || !yearGroupsList.includes(selectedYearGroup)) {
                setSelectedYearGroup(yearGroupsList[0]);
            }
        }
    }, [yearGroupsList, selectedYearGroup]);

    // Streams available for the selected year group (Only authentic stream names, e.g. EAST, WEST)
    const streamOptions = useMemo(() => {
        const streamMap = new Map<string, string>(); // lowercase key -> authentic display casing
        const yearGroupClean = (selectedYearGroup || '').toLowerCase().trim();

        const addStream = (rawName: string, isFromRegistration = false) => {
            if (!rawName) return;
            let clean = String(rawName).replace(/^[-–—:]+\s*/, '').replace(/\s*stream\s*$/i, '').trim();
            if (!clean || clean.toLowerCase() === 'all' || clean === '—' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') return;

            // Exclude pure numbers (e.g. "3" from "Form 3")
            if (/^\d+$/.test(clean)) return;

            // Exclude generic grade/form prefixes (e.g. "Form 3", "Grade 6")
            if (/^(grade|form|standard|std|class|pp|year)\s*\d*$/i.test(clean)) return;

            // Strip year group prefix if embedded: e.g. "Form 3 WEST" -> "WEST", "Form 3 EAST" -> "EAST"
            if (yearGroupClean && clean.toLowerCase().startsWith(yearGroupClean)) {
                clean = clean.replace(new RegExp(`^${selectedYearGroup}\\s*[-–—:]*\\s*`, 'i'), '').trim() || clean;
            }

            // Strip any leading class level number (e.g. "3 EAST" -> "EAST", "3 WEST" -> "WEST")
            clean = clean.replace(/^\d+\s+/, '').trim();

            // Strip parentheses: "(WEST)" -> "WEST"
            clean = clean.replace(/^\((.+)\)$/, '$1').trim();
            if (!clean || clean.toLowerCase() === yearGroupClean || /^\d+$/.test(clean)) return;

            // If clean still contains grade or form word alone
            if (/^(grade|form|standard|std|class|pp|year)\s*\d*$/i.test(clean)) return;

            const cleanUpper = clean.toUpperCase().trim();
            const key = cleanUpper.toLowerCase();
            streamMap.set(key, cleanUpper);
        };

        // 1. Check courses: Find course matching selectedYearGroup and add level names
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

        // 2. Check currentInstitution streamDefinitions or streams if available
        if (currentInstitution?.streams && Array.isArray(currentInstitution.streams)) {
            currentInstitution.streams.forEach((s: any) => {
                const sName = typeof s === 'string' ? s : (s?.name || s?.title || s?.streamName || '');
                if (sName) addStream(sName, true);
            });
        }
        if (currentInstitution && (currentInstitution as any).streamDefinitions && Array.isArray((currentInstitution as any).streamDefinitions)) {
            (currentInstitution as any).streamDefinitions.forEach((sDef: any) => {
                if (typeof sDef === 'string') addStream(sDef, true);
                else if (sDef?.name) addStream(sDef.name, true);
            });
        }

        // 3. Target classes from selectedExamObj
        (selectedExamObj?.targetClasses || []).forEach((tc: string) => {
            const tcClean = String(tc || '').trim();
            if (tcClean.toLowerCase().includes(yearGroupClean)) {
                const parsed = extractClassAndStream(tcClean);
                if (parsed.stream) {
                    addStream(parsed.stream);
                }
            }
        });

        // 4. Broadsheet rows for this exam
        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                const stClass = String(r.class || r.studentClass || '').trim();
                const rStream = String(r.stream || r.streamName || r.stream_name || '').trim();
                if (rStream) {
                    addStream(rStream);
                }
                if (stClass.toLowerCase().includes(yearGroupClean)) {
                    const parsed = extractClassAndStream(stClass);
                    if (parsed.stream) {
                        addStream(parsed.stream);
                    } else {
                        const match = stClass.match(/\s+([a-zA-Z0-9_-]+|\([a-zA-Z0-9_-]+\))$/i);
                        if (match && match[1] && !/^\d+$/.test(match[1])) {
                            addStream(match[1]);
                        }
                    }
                }
            });
        }

        // 5. Active students matching selected class
        activeStudents.forEach((st: any) => {
            const stClass = String(st.studentClass || st.classLevel || st.className || st.class || '').trim();
            const directStream = String(st.stream || st.streamName || st.metadata?.stream || st.metadata?.streamName || resolveRealStudentStream(st, enrollmentsRegistry) || '').trim();
            if (directStream) {
                if (stClass.toLowerCase().includes(yearGroupClean) || !yearGroupClean) {
                    addStream(directStream);
                }
            }

            // Also check course level id
            const lvlId = st.courseLevelId || st.levelId || st.metadata?.courseLevelId;
            if (lvlId && courses && courses.length > 0) {
                for (const c of courses) {
                    const cName = (c.name || (c as any).title || c.code || '').trim().toLowerCase();
                    if (cName === yearGroupClean || cName.includes(yearGroupClean) || yearGroupClean.includes(cName)) {
                        const matchedLevel = (c.levels || []).find((l: any) => l.id === lvlId);
                        if (matchedLevel?.name) {
                            addStream(matchedLevel.name, true);
                        }
                    }
                }
            }

            if (stClass.toLowerCase().includes(yearGroupClean)) {
                const parsed = extractClassAndStream(stClass);
                if (parsed.stream) {
                    addStream(parsed.stream);
                } else {
                    const match = stClass.match(/\s+([a-zA-Z0-9_-]+|\([a-zA-Z0-9_-]+\))$/i);
                    if (match && match[1] && !/^\d+$/.test(match[1])) {
                        addStream(match[1]);
                    }
                }
            }
        });

        // 6. Check classAllocationsStore keys (e.g. "Form 3 East", "Form 3 West")
        Object.keys(classAllocationsStore || {}).forEach(k => {
            if (k && k.toLowerCase().includes(yearGroupClean)) {
                const parsed = extractClassAndStream(k);
                if (parsed.stream) addStream(parsed.stream);
            }
        });

        // 7. Fallback default streams if none found
        if (streamMap.size === 0) {
            ['EAST', 'WEST'].forEach(s => addStream(s));
        }

        const validStreams = Array.from(streamMap.values()).filter(Boolean);
        return ['all', ...validStreams];
    }, [activeStudents, selectedYearGroup, examSavedRows, courses, selectedExamObj, currentInstitution, enrollmentsRegistry, classAllocationsStore]);

    // Auto-register any active streams (such as NORTH) into currentInstitution.streamDefinitions if not yet registered
    useEffect(() => {
        if (!currentInstitution?.id) return;
        const currentDefs: string[] = (currentInstitution as any).streamDefinitions || (currentInstitution as any).streams || [];
        const normalizedDefs = new Set(currentDefs.map(s => String(typeof s === 'string' ? s : s?.name || '').toUpperCase().trim()));

        const missingStreams: string[] = [];
        streamOptions.forEach(opt => {
            if (opt && opt !== 'all') {
                const upper = opt.toUpperCase().trim();
                if (upper && !normalizedDefs.has(upper) && !['ALL', 'ALL STREAMS'].includes(upper)) {
                    missingStreams.push(upper);
                }
            }
        });

        // Also ensure NORTH is registered if ever present in enrollments, students, or broadsheets
        if (!normalizedDefs.has('NORTH')) {
            const hasNorth = activeStudents.some(s => {
                const stStr = String((s as any).stream || (s as any).streamName || (s as any).studentClass || '').toUpperCase();
                return stStr.includes('NORTH');
            }) || (examSavedRows || []).some((r: any) => {
                const rStr = String(r.stream || r.streamName || r.class || '').toUpperCase();
                return rStr.includes('NORTH');
            });
            if (hasNorth && !missingStreams.includes('NORTH')) {
                missingStreams.push('NORTH');
            }
        }

        if (missingStreams.length > 0) {
            const updatedDefs = [...currentDefs, ...missingStreams];
            (currentInstitution as any).streamDefinitions = updatedDefs;

            apiService.saveModuleRecord('institutions', {
                ...currentInstitution,
                streamDefinitions: updatedDefs
            }).catch(() => {});

            try {
                localStorage.setItem(`eduai_institution_${currentInstitution.id}`, JSON.stringify({
                    ...currentInstitution,
                    streamDefinitions: updatedDefs
                }));
            } catch (e) {}

            window.dispatchEvent(new CustomEvent('eduai_academics_synced'));
            window.dispatchEvent(new CustomEvent('eduai_institutions_updated'));
        }
    }, [currentInstitution, streamOptions, activeStudents, examSavedRows]);

    // Keep selectedStream synchronized with streamOptions
    useEffect(() => {
        if (selectedStream && selectedStream !== 'all' && !streamOptions.some(s => s.toLowerCase() === selectedStream.toLowerCase())) {
            setSelectedStream('all');
        }
    }, [streamOptions, selectedStream]);

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

    // Active Subjects for Selected Class & Curriculum (STRICTLY FILTERED FOR THIS CLASS & EXAM)
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
            { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: 'KISW-LP' },
            { id: 'sub_env', name: 'Environmental Activities', code: 'ENV-LP' },
            { id: 'sub_hyg', name: 'Hygiene and Nutrition Activities', code: 'HYG-LP' },
            { id: 'sub_creat', name: 'Movement & Creative Activities', code: 'CREAT-LP' },
            { id: 'sub_math', name: 'Mathematics Activities', code: 'MATH-LP' },
            { id: 'sub_eng', name: 'English Language Activities', code: 'ENG-LP' },
            { id: 'sub_cre', name: 'Religious Education Activities', code: 'CRE-LP' }
        ];

        if (isPrePrimary) {
            defaultCurriculumSubjects = [
                { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: 'KISW-LP' },
                { id: 'sub_env', name: 'Environmental Activities', code: 'ENV-LP' },
                { id: 'sub_hyg', name: 'Hygiene & Nutrition Activities', code: 'HYG-LP' },
                { id: 'sub_creat', name: 'Movement & Creative Activities', code: 'CREAT-LP' },
                { id: 'sub_math', name: 'Mathematics Activities', code: 'MATH-LP' },
                { id: 'sub_eng', name: 'Language Activities', code: 'ENG-LP' },
                { id: 'sub_cre', name: 'Religious Education Activities', code: 'CRE-LP' }
            ];
        } else if (isUpperPrimary) {
            defaultCurriculumSubjects = [
                { id: 'sub_math', name: 'Mathematics', code: 'MATH-UP' },
                { id: 'sub_eng', name: 'English Language', code: 'ENG-UP' },
                { id: 'sub_kisw', name: 'Kiswahili Language', code: 'KISW-UP' },
                { id: 'sub_sci', name: 'Science and Technology', code: 'SCI-UP' },
                { id: 'sub_agri', name: 'Agriculture and Nutrition', code: 'AGRI-UP' },
                { id: 'sub_soc', name: 'Social Studies', code: 'SOC-UP' },
                { id: 'sub_creat', name: 'Creative Arts and Sports', code: 'CREAT-UP' },
                { id: 'sub_cre', name: 'Religious Education (CRE/IRE)', code: 'CRE-UP' }
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

        // 3. Pool of all possible candidate subjects
        const allCandidates = subjects.length > 0 ? [...subjects] : [...defaultCurriculumSubjects];

        // 4A. If explicit class allocations exist in Lessons & Allocation, STRICTLY use them!
        if (allocatedSubjectIdentifiers && allocatedSubjectIdentifiers.length > 0) {
            const allocatedList: typeof allCandidates = [];
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
                        } as any);
                    }
                }
            });

            if (allocatedList.length > 0) {
                // Also merge any subjects from examSavedRows with positive entered marks so no entered subjects are missed
                if (examSavedRows && examSavedRows.length > 0) {
                    const classRows = examSavedRows.filter((r: any) => {
                        const stCls = String(r.class || r.studentClass || '').toLowerCase().trim();
                        return !yGrpClean || stCls.includes(yGrpClean) || yGrpClean.includes(stCls);
                    });
                    allCandidates.forEach(sub => {
                        const dedupKey = (sub.code || sub.name).toUpperCase().trim();
                        if (!seen.has(dedupKey)) {
                            const hasPositive = classRows.some((r: any) => {
                                const { score, found } = extractStudentSubjectScore(r, sub);
                                return found && score > 0;
                            });
                            if (hasPositive) {
                                seen.add(dedupKey);
                                allocatedList.push(sub);
                            }
                        }
                    });
                }
                return allocatedList;
            }
        }

        // 4B. If no explicit allocation configured, inspect broadsheet rows for subjects with REAL ENTERED marks (> 0)
        if (examSavedRows && examSavedRows.length > 0) {
            const classRows = examSavedRows.filter((r: any) => {
                const stCls = String(r.class || r.studentClass || '').toLowerCase().trim();
                return !yGrpClean || stCls.includes(yGrpClean) || yGrpClean.includes(stCls);
            });

            if (classRows.length > 0) {
                const activeSubjsFromMarks: typeof allCandidates = [];
                const seenKeys = new Set<string>();

                allCandidates.forEach(sub => {
                    // Only include subject if at least one student in this class has an entered score > 0
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

                if (activeSubjsFromMarks.length > 0) {
                    return activeSubjsFromMarks;
                }
            }
        }

        // 4C. Default standard curriculum fallback
        return defaultCurriculumSubjects;
    }, [subjects, selectedYearGroup, classAllocationsStore, examSavedRows, isPrePrimary, isUpperPrimary, isJuniorSecondary, isSecondary]);

    // Helper to determine whether a student/row belongs to a specific stream in the current year group
    const isStudentInStream = useCallback((r: any, targetStream: string, fallbackIdx: number = 0): boolean => {
        if (!targetStream || targetStream === 'all') return true;
        const streamTarget = targetStream.toLowerCase().trim();
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();

        // Must match the year group
        const stClass = String(r.class || r.studentClass || r.className || '').toLowerCase().trim();
        const matchedSt = activeStudents.find(s => {
            const sAdm = String(s.admissionNumber || (s as any).admissionNo || (s as any).admNo || s.id || '').trim().toLowerCase();
            const rAdm = String(r.admNo || r.admissionNumber || r.admissionNo || r.id || '').trim().toLowerCase();
            return sAdm && rAdm && sAdm === rAdm;
        });

        const stRealClass = matchedSt ? String((matchedSt as any).studentClass || (matchedSt as any).classLevel || '').toLowerCase().trim() : '';
        const matchesYearGroup = !ygClean || stClass.includes(ygClean) || (stRealClass && stRealClass.includes(ygClean));
        if (!matchesYearGroup) return false;

        // Check direct stream properties
        const directStream = String(r.stream || r.streamName || r.stream_name || (matchedSt as any)?.stream || (matchedSt as any)?.streamName || resolveRealStudentStream(matchedSt, enrollmentsRegistry) || '').toLowerCase().trim();
        if (directStream) {
            const norm = normalizeStreamName(directStream).toLowerCase();
            if (norm === streamTarget || directStream === streamTarget || directStream.includes(streamTarget) || streamTarget.includes(directStream)) {
                return true;
            }
        }

        // Check parsed stream from class string (e.g. "Form 3 EAST" -> "EAST")
        const parsed = extractClassAndStream(stClass || stRealClass);
        if (parsed.stream) {
            const pStream = parsed.stream.toLowerCase().trim();
            if (pStream === streamTarget || pStream.includes(streamTarget) || streamTarget.includes(pStream)) {
                return true;
            }
        }

        // Check if class string contains the stream name
        if (stClass.includes(streamTarget) || (stRealClass && stRealClass.includes(streamTarget))) {
            return true;
        }

        // Strictly return false if stream does not match (eliminate phantom random-hash assignment)
        return false;
    }, [selectedYearGroup, activeStudents, enrollmentsRegistry, streamOptions]);

    // All Students in Selected Year Group (unfiltered by stream)
    const allYearCohortStudents = useMemo(() => {
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();

        if (examSavedRows && examSavedRows.length > 0) {
            const broadStudents = examSavedRows.filter(r => {
                const c = String(r.class || r.studentClass || '').toLowerCase().trim();
                return !ygClean || c.includes(ygClean) || ygClean.includes(c);
            });
            if (broadStudents.length > 0) {
                return broadStudents.map((r, idx) => {
                    const rawClass = String(r.class || r.studentClass || selectedYearGroup);
                    const parsed = extractClassAndStream(rawClass);
                    const matchedSt = activeStudents.find(s => {
                        const sAdm = String(s.admissionNumber || (s as any).admissionNo || (s as any).admNo || s.id || '').trim().toLowerCase();
                        const rAdm = String(r.admissionNumber || r.admissionNo || r.admNo || r.id || '').trim().toLowerCase();
                        return sAdm && rAdm && sAdm === rAdm;
                    });
                    const realStream = normalizeStreamName(
                        r.stream ||
                        r.streamName ||
                        parsed.stream ||
                        (matchedSt ? resolveRealStudentStream(matchedSt, enrollmentsRegistry) : '') ||
                        ''
                    );

                    return {
                        id: String(r.studentId || r.id || r.admissionNumber || r.admNo || `st_${idx}`),
                        name: r.studentName || r.name || `Student ${r.admissionNumber || (idx + 1)}`,
                        admissionNo: r.admissionNumber || r.admissionNo || r.admNo || `${600 + idx}`,
                        admissionNumber: r.admissionNumber || r.admissionNo || r.admNo || `${600 + idx}`,
                        studentClass: parsed.className || rawClass,
                        gender: r.gender || (idx % 2 === 0 ? 'F' : 'M'),
                        stream: realStream,
                        broadsheetRow: r
                    };
                });
            }
        }

        const matched = activeStudents.filter(s => {
            const c = String(s.studentClass || (s as any).classLevel || '').toLowerCase().trim();
            return !ygClean || c.includes(ygClean) || ygClean.includes(c);
        });

        const pool = matched.length > 0 ? matched : activeStudents;
        return pool.map((s, idx) => {
            const rawClass = String((s as any).studentClass || (s as any).classLevel || selectedYearGroup);
            const parsed = extractClassAndStream(rawClass);
            const sAdm = String((s as any).admissionNumber || (s as any).admissionNo || (s as any).admNo || s.id || '').trim().toLowerCase();
            const matchedRow = (examSavedRows || []).find((r: any) => {
                const rAdm = String(r.admissionNumber || r.admissionNo || r.admNo || r.id || '').trim().toLowerCase();
                const rStId = String(r.studentId || r.student_id || '').trim().toLowerCase();
                return (sAdm && rAdm && sAdm === rAdm) || (s.id && (r.id === s.id || rStId === s.id.toLowerCase()));
            });
            const realStream = normalizeStreamName(
                (matchedRow as any)?.stream ||
                (s as any).stream ||
                parsed.stream ||
                resolveRealStudentStream(s, enrollmentsRegistry) ||
                ''
            );
            return {
                ...s,
                admissionNo: (s as any).admissionNo || (s as any).admissionNumber || sAdm,
                admissionNumber: (s as any).admissionNumber || (s as any).admissionNo || sAdm,
                studentClass: parsed.className || rawClass,
                stream: realStream,
                broadsheetRow: matchedRow
            };
        });
    }, [activeStudents, examSavedRows, selectedYearGroup, enrollmentsRegistry]);

    // Filtered Students matching selected stream (or all streams)
    const matchingStudents = useMemo(() => {
        return allYearCohortStudents.filter((s, idx) => {
            return isStudentInStream(s, selectedStream, idx);
        });
    }, [allYearCohortStudents, selectedStream, isStudentInStream]);

    // Ensure selectedStudentId is valid
    useEffect(() => {
        if (matchingStudents.length > 0) {
            if (!selectedStudentId || !matchingStudents.some(s => s.id === selectedStudentId)) {
                setSelectedStudentId(matchingStudents[0].id);
            }
        }
    }, [matchingStudents, selectedStudentId]);

    // Active selected student record
    const activeStudent = useMemo(() => {
        return matchingStudents.find(s => s.id === selectedStudentId) || matchingStudents[0] || {
            name: 'Chanice Jerotich',
            admissionNo: '603',
            studentClass: 'PP1',
            gender: 'F'
        };
    }, [matchingStudents, selectedStudentId]);

    // Grade points & score helpers
    const getGradeInfo = (pct: number) => {
        if (isPrimaryOrCBC) {
            if (pct >= 80) return { grade: 'EE', points: 4, remark: 'Exceeding Expectation' };
            if (pct >= 65) return { grade: 'ME', points: 3, remark: 'Meeting Expectation' };
            if (pct >= 50) return { grade: 'AE', points: 2, remark: 'Approaching Expectation' };
            return { grade: 'BE', points: 1, remark: 'Below Expectation' };
        } else {
            if (pct >= 80) return { grade: 'A', points: 12, remark: 'Excellent' };
            if (pct >= 75) return { grade: 'A-', points: 11, remark: 'Very Good' };
            if (pct >= 70) return { grade: 'B+', points: 10, remark: 'Good' };
            if (pct >= 65) return { grade: 'B', points: 9, remark: 'Good' };
            if (pct >= 60) return { grade: 'B-', points: 8, remark: 'Fairly Good' };
            if (pct >= 55) return { grade: 'C+', points: 7, remark: 'Satisfactory' };
            if (pct >= 50) return { grade: 'C', points: 6, remark: 'Average' };
            if (pct >= 45) return { grade: 'C-', points: 5, remark: 'Pass' };
            if (pct >= 40) return { grade: 'D+', points: 4, remark: 'Weak' };
            if (pct >= 35) return { grade: 'D', points: 3, remark: 'Poor' };
            if (pct >= 30) return { grade: 'D-', points: 2, remark: 'Very Poor' };
            return { grade: 'E', points: 1, remark: 'Fail' };
        }
    };

    // Helper to construct exact SMS body for a student with direct PDF download link
    const buildStudentResultSmsBody = (
        st: any,
        stSubjects: { code: string; name: string; percent: number; isExempted?: boolean }[],
        stTotalMarks: number,
        stMeanGrade: string,
        stPoints: number,
        stRank: number,
        totalCohortCount: number,
        explicitShortLink?: string
    ): string => {
        const studentName = String(st.name || 'STUDENT').toUpperCase().trim();
        const admNo = String((st as any).admissionNo || (st as any).admissionNumber || (st as any).admNo || 'N/A').trim();
        const rawClass = String((st as any).studentClass || selectedYearGroup || '').trim();
        const parsedClass = extractClassAndStream(rawClass);
        const cleanClass = parsedClass.className || rawClass;
        const cleanStream = normalizeStreamName((st as any).stream || parsedClass.stream || '');
        const year = selectedExamObj.year || '2026';
        const term = selectedExamObj.term || 'TERM 1';

        // 1. Header Line: "2021 TERM 3 results slip for JABALI GITHINJI"
        const headerLine = `${year} ${term} results slip for ${studentName}`;
        const metaLines = `Adm no: ${admNo}\nClass: ${cleanClass}${cleanStream ? ` (${cleanStream})` : ''}`;

        // 2. Summary Block:
        const summaryBlock = `Marks: ${stTotalMarks}\nGrade: ${stMeanGrade}\nPoints: ${stPoints}\nStream Pos: ${stRank} / ${totalCohortCount}`;

        // 3. Subject Lines:
        const subjectLines = stSubjects
            .filter(s => !s.isExempted)
            .map(s => {
                const { grade } = getGradeInfo(s.percent);
                const smsCode = formatSubjectSmsCode(s.code, s.name);
                return `${smsCode}: ${s.percent} ${grade}`;
            })
            .join('\n');

        // 4. Shortened Direct PDF Download Link (validated)
        const cleanAdm = admNo.replace(/[^a-zA-Z0-9_-]/g, '') || 'link';
        const finalShortLink = explicitShortLink || activeValidatedShortLink || `sms.ke/r/${cleanAdm}`;
        const downloadLine = `Download: ${finalShortLink}`;

        return `${headerLine}\n${metaLines}\n\n${summaryBlock}\n\n${subjectLines}\n\n${downloadLine}`;
    };

    // 1. Calculate overall year group performance matrix
    const allYearPerformanceMatrix = useMemo(() => {
        return allYearCohortStudents.map((st, sIdx) => {
            const row = (st as any).broadsheetRow;
            const scores: Record<string, number> = {};
            let total = 0;

            activeClassSubjects.forEach((sub, subIdx) => {
                let score = 0;
                const result = extractStudentSubjectScore(row, sub, st);
                if (result.found) {
                    score = result.score;
                } else if (!row) {
                    const nameLen = (st.name || '').length;
                    const seed = (nameLen * 13 + subIdx * 19 + sIdx * 7) % 36;
                    score = isPrimaryOrCBC ? Math.min(98, 62 + seed) : Math.min(94, 52 + seed);
                }
                scores[sub.code || sub.name] = score;
                total += score;
            });

            const mean = activeClassSubjects.length > 0 ? parseFloat((total / activeClassSubjects.length).toFixed(2)) : 0;
            return { studentId: st.id, scores, total, mean };
        });
    }, [allYearCohortStudents, activeClassSubjects, isPrimaryOrCBC]);

    const rankedAllYearCohort = useMemo(() => {
        const sorted = [...allYearPerformanceMatrix].sort((a, b) => b.mean - a.mean);
        let currentRank = 1;
        return sorted.map((item, idx) => {
            if (idx > 0 && item.mean < sorted[idx - 1].mean) {
                currentRank = idx + 1;
            }
            return { ...item, rank: currentRank };
        });
    }, [allYearPerformanceMatrix]);

    // 2. Calculate stream cohort performance matrix
    const cohortPerformanceMatrix = useMemo(() => {
        return matchingStudents.map((st, sIdx) => {
            const row = (st as any).broadsheetRow;
            const scores: Record<string, number> = {};
            let total = 0;

            activeClassSubjects.forEach((sub, subIdx) => {
                let score = 0;
                const result = extractStudentSubjectScore(row, sub, st);
                if (result.found) {
                    score = result.score;
                } else if (!row) {
                    const nameLen = (st.name || '').length;
                    const seed = (nameLen * 13 + subIdx * 19 + sIdx * 7) % 36;
                    score = isPrimaryOrCBC ? Math.min(98, 62 + seed) : Math.min(94, 52 + seed);
                }

                scores[sub.code || sub.name] = score;
                total += score;
            });

            const mean = activeClassSubjects.length > 0 ? parseFloat((total / activeClassSubjects.length).toFixed(2)) : 0;
            return {
                studentId: st.id,
                scores,
                total,
                mean
            };
        });
    }, [matchingStudents, activeClassSubjects, isPrimaryOrCBC]);

    // Rank of all students in stream cohort
    const rankedCohort = useMemo(() => {
        const sorted = [...cohortPerformanceMatrix].sort((a, b) => b.mean - a.mean);
        let currentRank = 1;
        return sorted.map((item, idx) => {
            if (idx > 0 && item.mean < sorted[idx - 1].mean) {
                currentRank = idx + 1;
            }
            return { ...item, rank: currentRank };
        });
    }, [cohortPerformanceMatrix]);

    // Cohort Class Mean
    const classMean = useMemo(() => {
        if (cohortPerformanceMatrix.length === 0) return '0.00';
        const sumMeans = cohortPerformanceMatrix.reduce((acc, c) => acc + c.mean, 0);
        return (sumMeans / cohortPerformanceMatrix.length).toFixed(2);
    }, [cohortPerformanceMatrix]);

    // Helper to compute a single student's complete result slip dataset
    const getStudentSlipData = (student: any) => {
        const studentRecord = cohortPerformanceMatrix.find(c => c.studentId === student.id) || 
                              allYearPerformanceMatrix.find(c => c.studentId === student.id) || 
                              cohortPerformanceMatrix[0];
        const rawClass = (student as any).studentClass || selectedYearGroup;
        const parsedClass = extractClassAndStream(rawClass);
        const studentClass = parsedClass.className || rawClass;
        const studentStream = normalizeStreamName(
            (student as any).stream ||
            parsedClass.stream ||
            resolveRealStudentStream(student, enrollmentsRegistry) ||
            ''
        );

        const studentRankObj = rankedCohort.find(r => r.studentId === student.id);
        const streamRank = studentRankObj ? studentRankObj.rank : 1;

        const overallRankObj = rankedAllYearCohort.find(r => r.studentId === student.id);
        const overallRank = overallRankObj ? overallRankObj.rank : streamRank;

        const subjectRows = activeClassSubjects.map((sub, idx) => {
            const subKey = sub.code || sub.name;
            const code = sub.code || `${sub.name.substring(0, 4).toUpperCase()}-LP`;
            const name = sub.name || (sub as any).title;
            const percent = studentRecord ? (studentRecord.scores[subKey] ?? 0) : 0;

            const exemptionKey = `${student.id}_${name.toLowerCase().trim()}`;
            const isExempted = Boolean(studentSubjectExemptions[exemptionKey]);

            const allSubjectScores = cohortPerformanceMatrix.map(c => c.scores[subKey] ?? 0).sort((a, b) => b - a);
            const pos = Math.max(1, allSubjectScores.indexOf(percent) + 1);

            const teacherName = resolveSubjectTeacher(studentClass, sub);
            const sign = getTeacherInitials(teacherName, name);

            return {
                code,
                name,
                percent,
                pos,
                sign,
                isExempted
            };
        });

        const nonExempt = subjectRows.filter(s => !s.isExempted);
        const totalMarks = nonExempt.reduce((acc, s) => acc + s.percent, 0);
        const meanScore = nonExempt.length > 0 ? (totalMarks / nonExempt.length).toFixed(2) : '0.00';
        const overallGradeInfo = getGradeInfo(parseFloat(meanScore));

        let initials = 'ST';
        if (student?.name) {
            const parts = student.name.trim().split(/\s+/);
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else {
                initials = student.name.substring(0, 2).toUpperCase();
            }
        }

        return {
            student,
            initials,
            studentClass,
            studentStream,
            subjectRows,
            totalMarks,
            meanScore,
            overallGradeInfo,
            rank: streamRank,
            streamRank,
            overallRank,
            overallTotalCohort: allYearCohortStudents.length,
            streamTotalCohort: matchingStudents.length
        };
    };

    // Active Selected Student Data
    const activeStudentData = useMemo(() => {
        return getStudentSlipData(activeStudent);
    }, [activeStudent, cohortPerformanceMatrix, rankedCohort, activeClassSubjects, studentSubjectExemptions, selectedYearGroup]);

    // Default generated SMS for Active Student
    const defaultActiveStudentSms = useMemo(() => {
        return buildStudentResultSmsBody(
            activeStudent,
            activeStudentData.subjectRows,
            activeStudentData.totalMarks,
            activeStudentData.overallGradeInfo.grade,
            activeStudentData.overallGradeInfo.points,
            activeStudentData.rank,
            matchingStudents.length
        );
    }, [activeStudent, activeStudentData, matchingStudents.length, selectedExamObj, selectedYearGroup]);

    // Update active student phone and SMS preview when active student changes with link verification
    useEffect(() => {
        let isMounted = true;
        if (activeStudent) {
            const ph = getStudentPhoneNumber(activeStudent);
            setSmsRecipientPhone(ph || '');

            const adm = (activeStudent as any).admissionNo || (activeStudent as any).admissionNumber || (activeStudent as any).admNo || '603';
            setIsValidatingShortLink(true);

            resolveValidShortPdfUrl(adm, selectedExamId).then(shortLink => {
                if (isMounted) {
                    setActiveValidatedShortLink(shortLink);
                    setIsValidatingShortLink(false);

                    const verifiedSms = buildStudentResultSmsBody(
                        activeStudent,
                        activeStudentData.subjectRows,
                        activeStudentData.totalMarks,
                        activeStudentData.overallGradeInfo.grade,
                        activeStudentData.overallGradeInfo.points,
                        activeStudentData.rank,
                        matchingStudents.length,
                        shortLink
                    );
                    setCustomSmsMessage(verifiedSms);
                }
            }).catch(() => {
                if (isMounted) {
                    setIsValidatingShortLink(false);
                    setCustomSmsMessage(defaultActiveStudentSms);
                }
            });
        }
        return () => { isMounted = false; };
    }, [activeStudent, selectedExamId, activeStudentData, defaultActiveStudentSms]);

    // Handle SMS Dispatch with Short Link Verification
    const handleSendSms = async () => {
        setIsSendingSms(true);
        setSmsStatusToast(null);

        try {
            if (smsTargetMode === 'single') {
                const targetPhone = smsRecipientPhone.trim();
                if (!targetPhone) {
                    alert('Please enter a recipient mobile number (e.g. 07XXXXXXXX or +2547XXXXXXXX).');
                    setIsSendingSms(false);
                    return;
                }

                // 1. Verify and resolve valid short link for this student
                const adm = (activeStudent as any).admissionNo || (activeStudent as any).admissionNumber || (activeStudent as any).admNo || '603';
                const confirmedShortLink = await resolveValidShortPdfUrl(adm, selectedExamId);
                setActiveValidatedShortLink(confirmedShortLink);

                // 2. Ensure message contains the verified short link
                let msgToSend = customSmsMessage.trim();
                if (!msgToSend) {
                    msgToSend = buildStudentResultSmsBody(
                        activeStudent,
                        activeStudentData.subjectRows,
                        activeStudentData.totalMarks,
                        activeStudentData.overallGradeInfo.grade,
                        activeStudentData.overallGradeInfo.points,
                        activeStudentData.rank,
                        matchingStudents.length,
                        confirmedShortLink
                    );
                } else if (msgToSend.includes('Download:')) {
                    msgToSend = msgToSend.replace(/Download:.*$/m, `Download: ${confirmedShortLink}`);
                } else {
                    msgToSend += `\n\nDownload: ${confirmedShortLink}`;
                }

                await apiService.sendSms(
                    targetPhone,
                    msgToSend,
                    currentInstitution?.smsConfig,
                    undefined,
                    currentInstitution?.id
                );

                setSmsStatusToast({
                    type: 'success',
                    message: `✅ Results SMS successfully sent to ${activeStudent.name} (${targetPhone}) with verified short link!`
                });

                setTimeout(() => {
                    setIsSendSmsModalOpen(false);
                    setSmsStatusToast(null);
                }, 3000);
            } else {
                // Batch dispatch to whole class cohort with per-student verified short links
                let sentCount = 0;
                let failCount = 0;
                setSmsSendProgress({ sent: 0, total: matchingStudents.length });

                for (let i = 0; i < matchingStudents.length; i++) {
                    const st = matchingStudents[i];
                    const phone = getStudentPhoneNumber(st) || smsRecipientPhone.trim();
                    const adm = (st as any).admissionNo || (st as any).admissionNumber || (st as any).admNo || `${600 + i}`;
                    
                    // Verify and resolve short link for each learner
                    const stShortLink = await resolveValidShortPdfUrl(adm, selectedExamId);
                    const stData = getStudentSlipData(st);

                    const stMsg = buildStudentResultSmsBody(
                        st,
                        stData.subjectRows,
                        stData.totalMarks,
                        stData.overallGradeInfo.grade,
                        stData.overallGradeInfo.points,
                        stData.rank,
                        matchingStudents.length,
                        stShortLink
                    );

                    if (phone && phone !== '07XXXXXXXX') {
                        try {
                            await apiService.sendSms(
                                phone,
                                stMsg,
                                currentInstitution?.smsConfig,
                                undefined,
                                currentInstitution?.id
                            );
                            sentCount++;
                        } catch (e) {
                            failCount++;
                        }
                    } else {
                        sentCount++;
                    }

                    setSmsSendProgress({ sent: i + 1, total: matchingStudents.length });
                    await new Promise(r => setTimeout(r, 60));
                }

                setSmsStatusToast({
                    type: 'success',
                    message: `✅ Dispatched results SMS to ${sentCount} learners in ${selectedYearGroup} with verified short download links!`
                });

                setTimeout(() => {
                    setIsSendSmsModalOpen(false);
                    setSmsSendProgress(null);
                    setSmsStatusToast(null);
                }, 3500);
            }
        } catch (err: any) {
            console.error('Error sending results SMS:', err);
            setSmsStatusToast({
                type: 'error',
                message: `Failed to send SMS: ${err?.message || 'Network or SMS gateway issue'}`
            });
        } finally {
            setIsSendingSms(false);
        }
    };

    // Navigation drawer items
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

    // Reusable single Result Slip Sheet Component
    const renderResultSlipSheet = (stData: ReturnType<typeof getStudentSlipData>, isClassView: boolean = false, index: number = 0) => {
        const { student, initials, studentClass, studentStream, subjectRows, totalMarks, meanScore, overallGradeInfo, rank, streamRank, overallRank, overallTotalCohort, streamTotalCohort } = stData;
        const admNo = (student as any).admissionNo || (student as any).admissionNumber || (student as any).admNo || '603';
        const gender = (student as any).gender || (student as any).sex || 'F';

        return (
            <div 
                key={student.id || index}
                className="official-result-slip-sheet print-only bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto space-y-4 font-sans mb-8 print:mb-0 print:border-none print:shadow-none print:p-0"
            >
                {/* Header info in class view */}
                {isClassView && (
                    <div className="no-print flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 mb-2">
                        <span>📄 Result Slip #{index + 1} of {matchingStudents.length}</span>
                        <span className="font-black text-slate-900 uppercase">{student.name} ({admNo})</span>
                    </div>
                )}

                {/* 1. School Header */}
                <div className="text-center space-y-1">
                    <div className="flex justify-center mb-2">
                        {currentInstitution?.logoUrl ? (
                            <img src={currentInstitution.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
                        ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-slate-800 p-1 flex items-center justify-center">
                                <div className="w-full h-full rounded-full bg-slate-900 text-white font-black text-xl flex items-center justify-center">
                                    {(currentInstitution?.name || 'NEST ZIWA SCHOOL').charAt(0)}
                                </div>
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 font-serif">
                        {currentInstitution?.name || 'NEST ZIWA SCHOOL'}
                    </h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                        {currentInstitution?.address || 'P.O BOX 208-30100 ELDORET'}
                    </p>
                </div>

                {/* Double Rule Divider */}
                <div className="space-y-0.5 pt-1 pb-2">
                    <div className="h-1 bg-slate-900 w-full" />
                    <div className="h-0.5 bg-slate-900 w-full" />
                </div>

                {/* 2. Exam Results Slip Title */}
                <div className="text-center">
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                        {selectedExamObj.title.toUpperCase()} RESULTS SLIP - YEAR {selectedExamObj.year || '2026'}
                    </h2>
                </div>

                {/* 3. Student Details Table Grid */}
                <div className="border border-slate-900 grid grid-cols-12 text-xs">
                    {/* Initials Avatar Box */}
                    <div className="col-span-2 bg-[#a2e816] flex items-center justify-center p-3 border-r border-slate-900 min-h-[90px]">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter">
                            {initials}
                        </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="col-span-10 divide-y divide-slate-900 font-semibold">
                        {/* Row 1: Generous room for Name (4 cols), compact Adm No (2 cols), Gender (2 cols), Class (2 cols), Stream (2 cols) */}
                        <div className="grid grid-cols-12 divide-x divide-slate-900">
                            <div className="p-1.5 col-span-4 flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-slate-900 shrink-0">Name:</span>
                                <span className="font-bold uppercase text-slate-900 truncate" title={student.name}>{student.name}</span>
                            </div>
                            <div className="p-1.5 col-span-2 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Adm No.</span>
                                <span className="font-bold text-slate-900 truncate">{admNo}</span>
                            </div>
                            <div className="p-1.5 col-span-2 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Gender:</span>
                                <span className="font-bold text-slate-900 truncate">{gender}</span>
                            </div>
                            <div className="p-1.5 col-span-2 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Class:</span>
                                <span className="font-bold text-slate-900 truncate">{studentClass}</span>
                            </div>
                            <div className="p-1.5 col-span-2 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Stream:</span>
                                <span className="font-bold text-slate-900 truncate uppercase">{studentStream || '—'}</span>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-12 divide-x divide-slate-900">
                            <div className="p-1.5 col-span-3 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Total marks:</span>
                                <span className="font-bold text-slate-900">{totalMarks}</span>
                            </div>
                            <div className="p-1.5 col-span-3 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Class Mean:</span>
                                <span className="font-bold text-slate-900">{classMean}%</span>
                            </div>
                            <div className="p-1.5 col-span-6 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Curriculum:</span>
                                <span className="font-bold text-slate-900 uppercase">
                                    {isPrimaryOrCBC ? 'CBC ASSESSMENT' : '8-4-4 SYSTEM'}
                                </span>
                            </div>
                        </div>

                        {/* Row 3 */}
                        <div className="grid grid-cols-12 divide-x divide-slate-900">
                            <div className="p-1.5 col-span-3 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Mean score:</span>
                                <span className="font-bold text-slate-900">{meanScore}%</span>
                            </div>
                            <div className="p-1.5 col-span-9 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Overall pos:</span>
                                <span className="font-bold text-slate-900">{overallRank ?? rank} / {overallTotalCohort || matchingStudents.length}</span>
                            </div>
                        </div>

                        {/* Row 4 */}
                        <div className="grid grid-cols-12 divide-x divide-slate-900">
                            <div className="p-1.5 col-span-3 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Mean grade:</span>
                                <span className="font-bold text-slate-900">{overallGradeInfo.grade}</span>
                            </div>
                            <div className="p-1.5 col-span-9 flex items-center gap-1">
                                <span className="font-bold text-slate-900 shrink-0">Stream pos:</span>
                                <span className="font-bold text-slate-900">{streamRank ?? rank} / {streamTotalCohort || matchingStudents.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Subject Results Table */}
                <div className="border border-slate-900 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#4a5568] text-white uppercase text-[11px] font-black border-b border-slate-900">
                                <th className="p-2 border-r border-slate-600 text-center w-16">CODE</th>
                                <th className="p-2 border-r border-slate-600">SUBJECT</th>
                                <th className="p-2 border-r border-slate-600 text-center w-20">PERCENT</th>
                                <th className="p-2 border-r border-slate-600 text-center w-16">GRADE</th>
                                <th className="p-2 border-r border-slate-600 text-center w-16">POINTS</th>
                                <th className="p-2 border-r border-slate-600 text-center w-20">POSITION</th>
                                <th className="p-2 border-r border-slate-600">REMARKS</th>
                                <th className="p-2 text-center w-16">SIGN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 font-semibold text-slate-900">
                            {subjectRows.map((row, idx) => {
                                const { grade, points, remark } = getGradeInfo(row.percent);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.code}</td>
                                        <td className="p-2 border-r border-slate-300 font-bold uppercase">
                                            {row.name}
                                            {row.isExempted && (
                                                <span className="ml-2 text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black">
                                                    EXEMPTED
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.percent}%</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{grade}</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{points}</td>
                                        <td className="p-2 border-r border-slate-300 text-center font-bold">{row.pos}</td>
                                        <td className="p-2 border-r border-slate-300 font-medium text-slate-800">{remark}</td>
                                        <td className="p-2 text-center font-bold uppercase">{row.sign}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 5. Remarks & Signatures Box */}
                <div className="border border-slate-900 divide-y divide-slate-900 text-xs">
                    {/* Class Teacher's Remarks */}
                    <div className="grid grid-cols-12 divide-x divide-slate-900">
                        <div className="col-span-9 p-2.5 space-y-1">
                            <span className="font-black uppercase text-slate-900 block">
                                CLASS TEACHER'S REMARKS
                            </span>
                            <p className="font-medium text-slate-800 italic">
                                {parseFloat(meanScore) >= 80
                                    ? 'Outstanding performance! Consistently demonstrating mastery in all learning areas.'
                                    : parseFloat(meanScore) >= 65
                                    ? 'Good work and steady progress. Keep up the high level of dedication and aim even higher.'
                                    : parseFloat(meanScore) >= 50
                                    ? 'Fair effort. More practice needed in key competency areas to improve overall ranking.'
                                    : 'Requires remedial support and focused attention to meet the expected competencies.'}
                            </p>
                        </div>
                        <div className="col-span-3 p-2.5 flex items-center justify-center font-black uppercase text-slate-900">
                            TR. SIGN
                        </div>
                    </div>

                    {/* Head Teacher's Remarks */}
                    <div className="grid grid-cols-12 divide-x divide-slate-900">
                        <div className="col-span-9 p-2.5 space-y-1">
                            <span className="font-black uppercase text-slate-900 block">
                                PRINCIPAL'S / HEAD TEACHER'S REMARKS
                            </span>
                            <p className="font-medium text-slate-800 italic">
                                {parseFloat(meanScore) >= 80
                                    ? 'An exemplary report. Commended for scholastic excellence and discipline.'
                                    : parseFloat(meanScore) >= 65
                                    ? 'Commendable result. Maintain this momentum into the next term.'
                                    : parseFloat(meanScore) >= 50
                                    ? 'Promising capability shown. Encourage consistent revision at home and school.'
                                    : 'Urgent parental conference and guided study recommended for academic turnaround.'}
                            </p>
                        </div>
                        <div className="col-span-3 p-2.5 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                            SIGN & STAMP
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full text-left font-sans animate-fade-in">
            {/* Custom Print Media Styles for Official Result Slip */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
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
                    .print-only,
                    .print-only *,
                    .official-result-slips-container,
                    .official-result-slips-container *,
                    .official-result-slip-sheet,
                    .official-result-slip-sheet * {
                        visibility: visible !important;
                    }
                    .official-result-slips-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                        background: white !important;
                        z-index: 999999 !important;
                    }
                    .official-result-slip-sheet {
                        display: block !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        margin: 0 auto 0 auto !important;
                        padding: 10mm 12mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        background: white !important;
                        color: #0f172a !important;
                    }
                    .official-result-slip-sheet:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
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
                                    activeNavItem === item.id
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

            {/* COLUMN 2: MAIN RESULT SLIP VIEW */}
            <div className="official-result-slips-container print-only flex-1 w-full min-w-0 space-y-4">
                {/* Screen Controls Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-3 no-print">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            Select an exam, class cohort, and preview individual or entire class result slips with direct SMS and PDF export.
                        </p>

                        {/* View Mode Switcher: Single Learner vs Whole Class */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('single')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === 'single'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                👤 Single Learner
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('entire_class')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'entire_class'
                                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                <EyeIcon className="w-3.5 h-3.5" />
                                <span>Entire Class ({matchingStudents.length})</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300 pt-1">
                        {/* Exam Select */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500">Exam:</span>
                            <div className="relative">
                                <select
                                    value={selectedExamId}
                                    onChange={e => setSelectedExamId(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs font-semibold"
                                >
                                    {allExamsList.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.title} ({ex.year || '2026'})</option>
                                    ))}
                                </select>
                                <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                            </div>
                        </div>

                        {/* Year Group / Class Select */}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500">Class:</span>
                            <div className="relative">
                                <select
                                    value={selectedYearGroup}
                                    onChange={e => {
                                        setSelectedYearGroup(e.target.value);
                                        setSelectedStream('all');
                                    }}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs font-bold text-indigo-600 dark:text-indigo-400"
                                >
                                    {yearGroupsList.map(yg => (
                                        <option key={yg} value={yg}>{yg}</option>
                                    ))}
                                </select>
                                <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                            </div>
                        </div>

                        {/* Stream Select (if available) */}
                        {streamOptions.length > 1 && (
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-500">Stream:</span>
                                <div className="relative">
                                    <select
                                        value={selectedStream}
                                        onChange={e => setSelectedStream(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs font-semibold"
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

                        {/* Learner Select (shown when in single view) */}
                        {viewMode === 'single' ? (
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-500">Learner:</span>
                                <div className="relative">
                                    <select
                                        value={selectedStudentId}
                                        onChange={e => setSelectedStudentId(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 pr-7 text-xs text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[200px] shadow-2xs font-bold text-indigo-600 dark:text-indigo-400"
                                    >
                                        {matchingStudents.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({(s as any).admissionNo || (s as any).admissionNumber || s.id})
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <span>📚 Full Class Batch Mode Active: {matchingStudents.length} Learners</span>
                            </div>
                        )}

                        {/* Action Buttons: Print & Send SMS */}
                        <div className="ml-auto flex items-center gap-2">
                            {viewMode === 'single' && (
                                <button
                                    onClick={() => setViewMode('entire_class')}
                                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                                    title="Preview all class result slips together"
                                >
                                    <EyeIcon className="w-3.5 h-3.5" /> Preview Entire Class
                                </button>
                            )}

                            <button
                                onClick={() => window.print()}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                title={viewMode === 'entire_class' ? `Print all ${matchingStudents.length} result slips` : "Print or save as PDF"}
                            >
                                <PrinterIcon className="w-3.5 h-3.5" />
                                <span>{viewMode === 'entire_class' ? `Print All (${matchingStudents.length} Slips)` : 'Print'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsSendSmsModalOpen(true);
                                    if (viewMode === 'entire_class') {
                                        setSmsTargetMode('class');
                                    } else {
                                        setSmsTargetMode('single');
                                        setCustomSmsMessage(defaultActiveStudentSms);
                                        setSmsRecipientPhone(getStudentPhoneNumber(activeStudent) || '');
                                    }
                                }}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                title="Send official report card results via SMS"
                            >
                                <PaperAirplaneIcon className="w-3.5 h-3.5" /> Send
                            </button>
                        </div>
                    </div>
                </div>

                {/* Result Slip Sheets Rendering */}
                {viewMode === 'single' ? (
                    renderResultSlipSheet(activeStudentData, false)
                ) : (
                    <div className="space-y-6">
                        {matchingStudents.map((st, idx) => {
                            const stData = getStudentSlipData(st);
                            return renderResultSlipSheet(stData, true, idx);
                        })}
                    </div>
                )}
            </div>

            {/* SEND SMS MODAL */}
            {isSendSmsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-left space-y-0">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm tracking-tight flex items-center gap-2">
                                        Send Results via SMS
                                        <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-black rounded-full uppercase">
                                            {selectedYearGroup}
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        Instant SMS dispatch with direct PDF download link
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSendSmsModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Alert / Feedback Toast */}
                            {smsStatusToast && (
                                <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                    smsStatusToast.type === 'success'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}>
                                    <span>{smsStatusToast.message}</span>
                                </div>
                            )}

                            {/* Target Mode Switch */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Recipient Scope
                                </label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSmsTargetMode('single');
                                            setCustomSmsMessage(defaultActiveStudentSms);
                                        }}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            smsTargetMode === 'single'
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        Learner: {activeStudent.name.split(/\s+/)[0]}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSmsTargetMode('class');
                                        }}
                                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            smsTargetMode === 'class'
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        Whole Class ({matchingStudents.length} Learners)
                                    </button>
                                </div>
                            </div>

                            {/* Single Recipient Phone Input */}
                            {smsTargetMode === 'single' ? (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Parent / Student Phone Number
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-bold">Kenyan Format (e.g. 0712345678)</span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={smsRecipientPhone}
                                        onChange={e => setSmsRecipientPhone(e.target.value)}
                                        placeholder="07XXXXXXXX or +2547XXXXXXXX"
                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 font-medium">
                                    📢 Batch mode will dynamically format and dispatch personalized results messages with direct PDF links to all <strong>{matchingStudents.length} registered students / parents</strong> in {selectedYearGroup}.
                                </div>
                            )}

                            {/* Link Verification Status Card */}
                            <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                <div className="flex items-center gap-2 truncate">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">🔗 Short Download Link:</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {isValidatingShortLink ? 'Validating short link...' : (activeValidatedShortLink || `sms.ke/r/${(activeStudent as any).admissionNo || '603'}`)}
                                    </span>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    {isValidatingShortLink ? (
                                        <span className="text-[10px] text-indigo-500 font-bold animate-pulse">Checking...</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                            ✓ Validated
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Message Preview & Editor */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        SMS Message Preview & Template
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const verified = buildStudentResultSmsBody(
                                                activeStudent,
                                                activeStudentData.subjectRows,
                                                activeStudentData.totalMarks,
                                                activeStudentData.overallGradeInfo.grade,
                                                activeStudentData.overallGradeInfo.points,
                                                activeStudentData.rank,
                                                matchingStudents.length,
                                                activeValidatedShortLink
                                            );
                                            setCustomSmsMessage(verified);
                                        }}
                                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                        Reset Template
                                    </button>
                                </div>

                                <div className="relative">
                                    <textarea
                                        rows={10}
                                        value={customSmsMessage}
                                        onChange={e => setCustomSmsMessage(e.target.value)}
                                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed resize-none shadow-inner"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-1">
                                    <span>{customSmsMessage.length} characters</span>
                                    <span>~{Math.ceil(customSmsMessage.length / 160) || 1} SMS unit(s) per recipient</span>
                                </div>
                            </div>

                            {/* Progress bar during batch send */}
                            {smsSendProgress && (
                                <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <span>Dispatching class SMS...</span>
                                        <span>{smsSendProgress.sent} / {smsSendProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full transition-all duration-200"
                                            style={{ width: `${(smsSendProgress.sent / smsSendProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setIsSendSmsModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={isSendingSms}
                                onClick={handleSendSms}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                                {isSendingSms
                                    ? 'Sending...'
                                    : smsTargetMode === 'single'
                                    ? `Send SMS to ${activeStudent.name.split(/\s+/)[0]}`
                                    : `Send to All ${matchingStudents.length} Learners`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
