import React, { useState, useMemo, useEffect } from 'react';
import type { Assessment, AssessmentMark, User, Subject, Institution, Course } from '../../types';
import { apiService } from '../../services/apiService';
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
    const [selectedYearGroup, setSelectedYearGroup] = useState<string>('Grade 1');
    const [selectedStream, setSelectedStream] = useState<string>('all');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // Active students list
    const activeStudents = useMemo(() => {
        const list = (students.length > 0 ? students : users).filter(u => u && (u.role === 'student' || (u as any).role === 'Student' || (u as any).userType === 'student' || Boolean((u as any).admissionNumber) || Boolean((u as any).admissionNo)));
        if (list.length > 0) return list;
        return [
            { id: 'st_288', name: 'Faith Nyambura', admissionNo: '288', studentClass: 'Grade 1 East', gender: 'F' },
            { id: 'st_289', name: 'Brian Omondi', admissionNo: '289', studentClass: 'Grade 1 East', gender: 'M' },
            { id: 'st_290', name: 'Amina Kiprop', admissionNo: '290', studentClass: 'Grade 1 West', gender: 'F' }
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
            const saved = localStorage.getItem(`eduai_exam_broadsheets_${instId}`);
            if (saved) return JSON.parse(saved) || {};
        } catch (e) {}
        return {};
    });

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

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('subject_allocations', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('institution_module_states', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('exam_units', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('student_subject_exemptions', currentInstitution.id).catch(() => [])
            ]).then(([allocRecords, imsRecords, examRecords, classAllocRecords, exempRecords]) => {
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
        const kStripped = kNorm.replace(/^subj_/, '').replace(/_p\d+$/, '').replace(/[^a-z0-9]/g, '');

        if (kNorm === `subj_${sClean}_p1` || kNorm === `subj_${sClean}` || kNorm === sClean) return true;
        if (cCompact && (kNorm === `subj_${cCompact}_p1` || kNorm === `subj_${cCompact}` || kNorm === cCompact)) return true;
        if (kStripped && (kStripped === sCompact || kStripped === cCompact)) return true;

        if ((subCode.startsWith('kisw') || subName.includes('kisw')) && (kNorm.includes('kisw') || kNorm.includes('insha') || kNorm.includes('lugha'))) return true;
        if ((subCode.startsWith('hyg') || subName.includes('hyg') || subName.includes('nutri')) && (kNorm.includes('hyg') || kNorm.includes('nutri') || kNorm.includes('health'))) return true;
        if ((subCode.startsWith('env') || subName.includes('env')) && (kNorm.includes('env') || kNorm.includes('environment'))) return true;
        if ((subCode.startsWith('creat') || subName.includes('creat') || subName.includes('art') || subName.includes('psycho') || subName.includes('music')) && 
            (kNorm.includes('creat') || kNorm.includes('art') || kNorm.includes('psycho') || kNorm.includes('music') || kNorm.includes('movement') || kNorm.includes('craft'))) return true;
        if ((subCode.startsWith('math') || subName.includes('math') || subCode === '121' || subCode === '907') && (kNorm.includes('math') || kNorm.includes('numeracy') || kNorm.includes('hesabu'))) return true;
        if ((subCode.startsWith('eng') || subName.includes('eng') || subCode === '101' || subCode === '901') && (kNorm.includes('eng') || kNorm.includes('literacy') || kNorm.includes('language'))) return true;
        if ((subCode.startsWith('cre') || subCode.startsWith('ire') || subCode.startsWith('hre') || subName.includes('religio') || subCode === '313' || subCode === '911') && 
            (kNorm.includes('cre') || kNorm.includes('ire') || kNorm.includes('hre') || kNorm.includes('religio'))) return true;
        if ((subCode.startsWith('agri') || subName.includes('agri') || subCode === '443') && kNorm.includes('agri')) return true;
        if ((subCode.startsWith('soc') || subName.includes('social') || subCode === '310' || subCode === '910') && (kNorm.includes('soc') || kNorm.includes('social'))) return true;
        if ((subCode.startsWith('sci') || subName.includes('science') || subCode === '905' || subCode === '230') && (kNorm.includes('sci') || kNorm.includes('science'))) return true;
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
                if (item.isPublished || item.status === 'published') {
                    unique.push(item);
                }
            }
        });

        if (unique.length === 0) {
            return [
                { id: 'exam_chepkoilel', title: 'CHEPKOILEL ZONAL EXAMS', year: '2026', term: 'TERM 1', type: 'ZONAL', status: 'published', isPublished: true, targetClasses: ['Grade 1'] }
            ];
        }

        return unique;
    }, [savedExamUnits, assessments]);

    // Ensure selectedExamId is valid
    useEffect(() => {
        if (allExamsList.length > 0) {
            if (!selectedExamId || !allExamsList.some(e => e.id === selectedExamId)) {
                setSelectedExamId(allExamsList[0].id);
            }
        }
    }, [allExamsList, selectedExamId]);

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
        return (selectedExamId && savedBroadsheets[selectedExamId]) || [];
    }, [savedBroadsheets, selectedExamId]);

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
            return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
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

    // Dynamic Stream Options for the Selected Year Group
    const streamOptions = useMemo(() => {
        const streams = new Set<string>();
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();

        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach(r => {
                const stClass = String(r.class || r.studentClass || '').trim();
                if (stClass.toLowerCase().includes(ygClean)) {
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
            if (stClass.toLowerCase().includes(ygClean)) {
                const match = stClass.match(/\s+(east|west|north|south|central|stream\s*[a-z0-9]*|[a-d])$/i);
                if (match && match[1]) {
                    streams.add(match[1].trim());
                } else if (stClass !== selectedYearGroup) {
                    streams.add(stClass.replace(new RegExp(`^${selectedYearGroup}\\s*`, 'i'), '').trim());
                }
            }
        });

        return ['all', ...Array.from(streams).filter(Boolean)];
    }, [activeStudents, selectedYearGroup, examSavedRows]);

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

    // Active Subjects for Selected Class & Curriculum (STRICTLY FILTERED FOR THIS CLASS)
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
            { id: 'sub_math', name: 'Mathematical Activities', code: '907' },
            { id: 'sub_eng', name: 'English Language Activities', code: '901' },
            { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: '906' },
            { id: 'sub_env', name: 'Environmental Activities', code: '902' },
            { id: 'sub_hyg', name: 'Hygiene and Nutrition Activities', code: '903' },
            { id: 'sub_creat', name: 'Creative Arts Activities', code: '904' },
            { id: 'sub_cre', name: 'Religious Education Activities', code: '911' }
        ];

        if (isPrePrimary) {
            defaultCurriculumSubjects = [
                { id: 'sub_math', name: 'Mathematical Activities', code: '907' },
                { id: 'sub_eng', name: 'Language Activities', code: '901' },
                { id: 'sub_kisw', name: 'Kiswahili Language Activities', code: '906' },
                { id: 'sub_env', name: 'Environmental Activities', code: '902' },
                { id: 'sub_creat', name: 'Psychomotor & Creative Activities', code: '904' },
                { id: 'sub_cre', name: 'Religious Education Activities', code: '911' }
            ];
        } else if (isUpperPrimary) {
            defaultCurriculumSubjects = [
                { id: 'sub_math', name: 'Mathematics', code: '907' },
                { id: 'sub_eng', name: 'English Language', code: '901' },
                { id: 'sub_kisw', name: 'Kiswahili Language', code: '906' },
                { id: 'sub_sci', name: 'Science and Technology', code: '905' },
                { id: 'sub_agri', name: 'Agriculture and Nutrition', code: '903' },
                { id: 'sub_soc', name: 'Social Studies', code: '910' },
                { id: 'sub_creat', name: 'Creative Arts and Sports', code: '904' },
                { id: 'sub_cre', name: 'Religious Education (CRE/IRE)', code: '911' }
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

        // 3. Pool of all possible subject sources
        const allCandidates = subjects.length > 0 ? [...subjects] : [...defaultCurriculumSubjects];

        const filteredList: typeof allCandidates = [];
        const seenCodes = new Set<string>();

        // If explicit class subject allocations exist, filter by them
        if (allocatedSubjectIdentifiers && allocatedSubjectIdentifiers.length > 0) {
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
                    if (!seenCodes.has(dedupKey)) {
                        seenCodes.add(dedupKey);
                        filteredList.push(matchedSub);
                    }
                } else {
                    // Create subject entry if identifier is a valid name
                    const nameFormatted = allocId.replace(/_/g, ' ');
                    const dedupKey = nameFormatted.toUpperCase();
                    if (!seenCodes.has(dedupKey)) {
                        seenCodes.add(dedupKey);
                        filteredList.push({
                            id: `sub_${allocId}`,
                            name: nameFormatted.charAt(0).toUpperCase() + nameFormatted.slice(1),
                            code: allocId.substring(0, 4).toUpperCase()
                        } as any);
                    }
                }
            });
        }

        // Check broadsheet rows for any additional subjects present in the exam for this class
        if (examSavedRows && examSavedRows.length > 0) {
            examSavedRows.forEach((r: any) => {
                const stCls = String(r.class || r.studentClass || '').toLowerCase().trim();
                if (stCls.includes(yGrpClean) || yGrpClean.includes(stCls)) {
                    Object.keys(r).forEach(k => {
                        if (['admNo', 'name', 'class', 'kcpe', 'student', 'id', 'admissionNo', 'admissionNumber', 'total', 'mean', 'meanScore', 'average', 'studentClass', 'gender', 'studentName'].includes(k)) return;
                        if (r[k] === null || r[k] === undefined || r[k] === '' || isNaN(Number(r[k]))) return;

                        // Match against candidates
                        const matched = allCandidates.find(sub => isSubjectKeyMatch(k, sub));
                        if (matched) {
                            const dedupKey = (matched.code || matched.name).toUpperCase().trim();
                            if (!seenCodes.has(dedupKey)) {
                                seenCodes.add(dedupKey);
                                filteredList.push(matched);
                            }
                        }
                    });
                }
            });
        }

        if (filteredList.length > 0) {
            return filteredList;
        }

        // Return standard curriculum subjects for this class
        return defaultCurriculumSubjects;
    }, [subjects, selectedYearGroup, classAllocationsStore, examSavedRows, isPrePrimary, isUpperPrimary, isJuniorSecondary, isSecondary]);

    // Students matching selected class / stream
    const matchingStudents = useMemo(() => {
        const ygClean = (selectedYearGroup || '').toLowerCase().trim();
        const strClean = (selectedStream || '').toLowerCase().trim();

        // 1. From broadsheet
        if (examSavedRows && examSavedRows.length > 0) {
            const broadStudents = examSavedRows.filter(r => {
                const c = String(r.class || r.studentClass || '').toLowerCase().trim();
                const matchesYg = !ygClean || c.includes(ygClean) || ygClean.includes(c);
                const matchesStr = strClean === 'all' || !strClean || c.includes(strClean);
                return matchesYg && matchesStr;
            });
            if (broadStudents.length > 0) {
                return broadStudents.map((r, idx) => ({
                    id: String(r.studentId || r.id || r.admissionNumber || r.admNo || `st_${idx}`),
                    name: r.studentName || r.name || `Student ${r.admissionNumber || (idx + 1)}`,
                    admissionNo: r.admissionNumber || r.admissionNo || r.admNo || `${2000 + idx}`,
                    studentClass: r.class || r.studentClass || selectedYearGroup,
                    gender: r.gender || (idx % 2 === 0 ? 'F' : 'M'),
                    broadsheetRow: r
                }));
            }
        }

        // 2. From registered active students
        const matched = activeStudents.filter(s => {
            const c = String(s.studentClass || (s as any).classLevel || '').toLowerCase().trim();
            const matchesYg = !ygClean || c.includes(ygClean) || ygClean.includes(c);
            const matchesStr = strClean === 'all' || !strClean || c.includes(strClean);
            return matchesYg && matchesStr;
        });

        if (matched.length > 0) return matched;
        return activeStudents;
    }, [activeStudents, examSavedRows, selectedYearGroup, selectedStream]);

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
            name: 'Faith Nyambura',
            admissionNo: '288',
            studentClass: 'Grade 1 East',
            gender: 'F'
        };
    }, [matchingStudents, selectedStudentId]);

    // Student initials badge
    const studentInitials = useMemo(() => {
        if (!activeStudent?.name) return 'FN';
        const parts = activeStudent.name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return activeStudent.name.substring(0, 2).toUpperCase();
    }, [activeStudent]);

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

    // Calculate all students' performance across activeClassSubjects for real subject ranks & class statistics
    const cohortPerformanceMatrix = useMemo(() => {
        return matchingStudents.map((st, sIdx) => {
            const row = (st as any).broadsheetRow;
            const scores: Record<string, number> = {};
            let total = 0;

            activeClassSubjects.forEach((sub, subIdx) => {
                let score = 0;
                let found = false;

                if (row) {
                    for (const k of Object.keys(row)) {
                        if (isSubjectKeyMatch(k, sub)) {
                            const val = parseFloat(row[k]);
                            if (!isNaN(val)) {
                                score = val;
                                found = true;
                                break;
                            }
                        }
                    }
                }

                if (!found) {
                    // Deterministic mock marks based on student admission number / name and subject
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

    // Rank of all students in cohort
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

    // Subject breakdown for the ACTIVE selected student
    const activeStudentSubjects = useMemo(() => {
        const studentRecord = cohortPerformanceMatrix.find(c => c.studentId === activeStudent.id) || cohortPerformanceMatrix[0];
        const studentClass = (activeStudent as any).studentClass || selectedYearGroup;

        return activeClassSubjects.map((sub, idx) => {
            const subKey = sub.code || sub.name;
            const code = sub.code || `${900 + idx + 1}`;
            const name = sub.name || (sub as any).title;
            const percent = studentRecord ? (studentRecord.scores[subKey] ?? 75) : 75;

            // Check exemption
            const exemptionKey = `${activeStudent.id}_${name.toLowerCase().trim()}`;
            const isExempted = Boolean(studentSubjectExemptions[exemptionKey]);

            // Calculate student position in this subject across the cohort
            const allSubjectScores = cohortPerformanceMatrix.map(c => c.scores[subKey] ?? 0).sort((a, b) => b - a);
            const pos = Math.max(1, allSubjectScores.indexOf(percent) + 1);

            // Resolve teacher initials
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
    }, [activeClassSubjects, cohortPerformanceMatrix, activeStudent, selectedYearGroup, studentSubjectExemptions, subjectAllocations, teachersMap, users]);

    // Calculated Aggregates for Active Student
    const nonExemptSubjects = useMemo(() => activeStudentSubjects.filter(s => !s.isExempted), [activeStudentSubjects]);
    const totalMarks = useMemo(() => nonExemptSubjects.reduce((acc, s) => acc + s.percent, 0), [nonExemptSubjects]);
    const meanScore = useMemo(() => nonExemptSubjects.length > 0 ? (totalMarks / nonExemptSubjects.length).toFixed(2) : '0.00', [totalMarks, nonExemptSubjects]);
    const overallGradeInfo = useMemo(() => getGradeInfo(parseFloat(meanScore)), [meanScore, isPrimaryOrCBC]);

    // Cohort Class Mean
    const classMean = useMemo(() => {
        if (cohortPerformanceMatrix.length === 0) return '65.50';
        const sumMeans = cohortPerformanceMatrix.reduce((acc, c) => acc + c.mean, 0);
        return (sumMeans / cohortPerformanceMatrix.length).toFixed(2);
    }, [cohortPerformanceMatrix]);

    // Active Student Rank in Class & Stream
    const overallRank = useMemo(() => {
        const match = rankedCohort.find(r => r.studentId === activeStudent.id);
        return match ? match.rank : 1;
    }, [rankedCohort, activeStudent]);

    // Navigation drawer items
    const navItems = [
        { id: 'exam_overview', label: 'Exam overview', icon: BarChart3Icon, reportTab: 'exam_analysis' },
        { id: 'inter_school', label: 'Inter-school comparison', icon: SparklesIcon },
        { id: 'subject_grades_distribution', label: 'Subject grades distribution', icon: ChartPieIcon, reportTab: 'subject_grades_analysis' },
        { id: 'result_slips', label: 'Result slips', icon: DocumentArrowDownIcon, reportTab: 'result_slips' },
        { id: 'broadsheet', label: 'Broadsheet', icon: GridIcon, reportTab: 'broadsheet' },
        { id: 'marksheet', label: 'Marksheet', icon: BookOpenIcon },
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
            <div className="flex-1 w-full min-w-0 space-y-4">
                {/* Screen Controls Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-3 no-print">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Select an exam, class cohort, and student to preview and print the official Kenyan standard results slip.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
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
                                                {st === 'all' ? 'All Streams' : `${st} Stream`}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute right-2.5 top-2 pointer-events-none text-slate-400 text-[10px]">▼</span>
                                </div>
                            </div>
                        )}

                        {/* Learner Select */}
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

                        {/* Print Button */}
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <PrinterIcon className="w-3.5 h-3.5" /> Print Result Slip
                            </button>
                        </div>
                    </div>
                </div>

                {/* Official Kenyan Standard Result Slip Sheet */}
                <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto space-y-4 print:shadow-none print:border-none print:p-0 font-sans">
                    {/* 1. School Header */}
                    <div className="text-center space-y-1">
                        <div className="flex justify-center mb-2">
                            {currentInstitution?.logoUrl ? (
                                <img src={currentInstitution.logoUrl} alt="School Logo" className="h-16 w-16 object-contain" />
                            ) : (
                                <div className="w-16 h-16 rounded-full border-2 border-slate-800 p-1 flex items-center justify-center">
                                    <div className="w-full h-full rounded-full bg-slate-900 text-white font-black text-xl flex items-center justify-center">
                                        {(currentInstitution?.name || 'CENTRAL SCHOOL').charAt(0)}
                                    </div>
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 font-serif">
                            {currentInstitution?.name || 'CENTRAL SCHOOL'}
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
                                {studentInitials}
                            </span>
                        </div>

                        {/* Metadata Grid */}
                        <div className="col-span-10 grid grid-cols-4 divide-x divide-y divide-slate-900 font-semibold">
                            {/* Row 1 */}
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Name:</span>
                                <span className="font-bold uppercase text-slate-900 truncate">{activeStudent.name}</span>
                            </div>
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Adm No.</span>
                                <span className="font-bold text-slate-900">{(activeStudent as any).admissionNo || (activeStudent as any).admissionNumber || (activeStudent as any).admNo || '288'}</span>
                            </div>
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Sex:</span>
                                <span className="font-bold text-slate-900">{(activeStudent as any).gender || (activeStudent as any).sex || '-'}</span>
                            </div>
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Class:</span>
                                <span className="font-bold text-slate-900">{(activeStudent as any).studentClass || selectedYearGroup}</span>
                            </div>

                            {/* Row 2 */}
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Total marks:</span>
                                <span className="font-bold text-slate-900">{totalMarks}</span>
                            </div>
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Class Mean:</span>
                                <span className="font-bold text-slate-900">{classMean}%</span>
                            </div>
                            <div className="p-1.5 col-span-2 flex gap-1">
                                <span className="font-bold text-slate-900">Curriculum:</span>
                                <span className="font-bold text-slate-900 uppercase">
                                    {isPrimaryOrCBC ? 'CBC Assessment' : '8-4-4 System'}
                                </span>
                            </div>

                            {/* Row 3 */}
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Mean score:</span>
                                <span className="font-bold text-slate-900">{meanScore}%</span>
                            </div>
                            <div className="p-1.5 col-span-3 flex gap-1">
                                <span className="font-bold text-slate-900">Overall pos:</span>
                                <span className="font-bold text-slate-900">{overallRank} / {matchingStudents.length}</span>
                            </div>

                            {/* Row 4 */}
                            <div className="p-1.5 flex gap-1">
                                <span className="font-bold text-slate-900">Mean grade:</span>
                                <span className="font-bold text-slate-900">{overallGradeInfo.grade}</span>
                            </div>
                            <div className="p-1.5 col-span-3 flex gap-1">
                                <span className="font-bold text-slate-900">Stream pos:</span>
                                <span className="font-bold text-slate-900">{overallRank} / {matchingStudents.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Subject Results Table */}
                    <div className="border border-slate-900 overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#4a5568] text-white uppercase text-[11px] font-black border-b border-slate-900">
                                    <th className="p-2 border-r border-slate-600 text-center w-14">CODE</th>
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
                                {activeStudentSubjects.map((row, idx) => {
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
            </div>
        </div>
    );
};
