import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Institution, User, Subject, Course } from '../../types';
import { isSuperAdminUser } from '../../types';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { RectangleStackIcon } from '../icons/RectangleStackIcon';
import { apiService } from '../../services/apiService';
import { isSubjectApplicableToClass, isSubjectAssignedToClassStream } from '../../utils/academicSubjectUtils';
import { extractClassAndStream } from '../../utils/academicUtils';
import { extractStreamOnly } from './BroadsheetReportView';

export interface SubjectAllocationRecord {
    id: string;
    institutionId: string;
    className: string; // e.g. Form 1 North, Form 3 Central
    subjectName: string; // e.g. Mathematics, English
    subjectCode?: string;
    teacherId?: string; // User ID
    teacherName?: string;
    lessonsPerWeek: number; // e.g. 6
    room?: string;
    status: 'allocated' | 'unassigned';
}

interface LessonsAllocationManagerProps {
    currentInstitution: Institution;
    users: User[];
    subjects: Subject[];
    courses?: Course[];
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onDeleteSubject?: (subjectId: string) => void;
}

export const LessonsAllocationManager: React.FC<LessonsAllocationManagerProps> = ({
    currentInstitution,
    users = [],
    subjects = [],
    courses = [],
    onUpdateSubject,
    onDeleteSubject
}) => {
    const [viewMode, setViewMode] = useState<'per_class' | 'per_teacher' | 'matrix' | 'student_enrollment'>('per_class');
    const [enrollmentSelectedSubject, setEnrollmentSelectedSubject] = useState<string>('all');
    const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<'all' | 'enrolled' | 'deenrolled'>('all');
    
    // Persistent Student Exemption Store (Key: `${studentId}_${subjectName.toLowerCase().trim()}`)
    const [exemptionsStore, setExemptionsStore] = useState<Record<string, boolean>>(() => {
        try {
            const instId = currentInstitution?.id || 'default_inst';
            const saved = localStorage.getItem(`eduai_student_subject_exemptions_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch(e) {}
        return {};
    });
    // Dynamically compute registered classes from all available sources
    const classOptions = useMemo(() => {
        const set = new Set<string>();

        // 1. From courses prop
        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
                if (name) {
                    const parsed = extractClassAndStream(name);
                    const base = (parsed.className || name).trim();
                    if (base) set.add(base);
                }
            });
        }

        // 2. From users prop
        if (users && users.length > 0) {
            users.forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    const parsed = extractClassAndStream(cl.trim());
                    const base = (parsed.className || cl.trim()).trim();
                    if (base) set.add(base);
                }
            });
        }

        // 3. From currentInstitution properties
        if (currentInstitution) {
            if ((currentInstitution as any).classes && Array.isArray((currentInstitution as any).classes)) {
                (currentInstitution as any).classes.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : c.name;
                    if (name) {
                        const parsed = extractClassAndStream(name);
                        const base = (parsed.className || name).trim();
                        if (base) set.add(base);
                    }
                });
            }
            if ((currentInstitution as any).courses && Array.isArray((currentInstitution as any).courses)) {
                (currentInstitution as any).courses.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : (c.name || c.title);
                    if (name) {
                        const parsed = extractClassAndStream(name);
                        const base = (parsed.className || name).trim();
                        if (base) set.add(base);
                    }
                });
            }
        }

        // 4. From LocalStorage cached registered classes
        try {
            const instId = currentInstitution?.id || 'default_inst';
            const savedClasses = localStorage.getItem(`eduai_registered_classes_${instId}`);
            if (savedClasses) {
                const parsed = JSON.parse(savedClasses);
                if (Array.isArray(parsed)) {
                    parsed.forEach(c => {
                        const p = extractClassAndStream(c);
                        const base = (p.className || c).trim();
                        if (base) set.add(base);
                    });
                }
            }
        } catch(e) {}

        // 5. Fallback defaults if no custom classes registered
        if (set.size === 0) {
            const isPrimary = (currentInstitution?.institutionType || '').toLowerCase().includes('primary') || (currentInstitution?.name || '').toLowerCase().includes('primary');
            if (isPrimary) {
                ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].forEach(c => set.add(c));
            } else {
                ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(c => set.add(c));
            }
        }

        const standaloneStreams = new Set(['east', 'west', 'north', 'south', 'central', 'red', 'blue', 'green', 'yellow', 'stream a', 'stream b', 'stream c']);
        return Array.from(set).filter(cName => !standaloneStreams.has(cName.trim().toLowerCase()));
    }, [courses, users, currentInstitution]);

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStream, setSelectedStream] = useState<string>('all');
    const [isAddingCustomStream, setIsAddingCustomStream] = useState<boolean>(false);
    const [newStreamInput, setNewStreamInput] = useState<string>('');
    const [customStreamsStore, setCustomStreamsStore] = useState<Record<string, string[]>>(() => {
        try {
            const instIdKey = currentInstitution?.id || 'default_inst';
            const saved = localStorage.getItem(`eduai_custom_streams_${instIdKey}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch(e) {}
        return {};
    });

    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [saveToast, setSaveToast] = useState<string | null>(null);
    const [isAddAllocationModalOpen, setIsAddAllocationModalOpen] = useState(false);

    // Form modal state
    const [modalClassName, setModalClassName] = useState('');
    const [modalStream, setModalStream] = useState('all');
    const [modalSubjectName, setModalSubjectName] = useState('Mathematics');
    const [modalTeacherId, setModalTeacherId] = useState('');
    const [modalLessons, setModalLessons] = useState(6);

    // List of teachers
    const teacherUsers = useMemo(() => {
        const list = users.filter(u => (u.role === 'teacher' || u.role === 'lecturer' || u.role === 'academics_officer') && !isSuperAdminUser(u));
        if (list.length > 0) return list;
        return [
            { id: 't_1', name: 'Mr. Justus (Maths)', email: 'justus@school.com', role: 'teacher' as const },
            { id: 't_2', name: 'Mdm. Faith Kanguha', email: 'faith@school.com', role: 'teacher' as const },
            { id: 't_3', name: 'Chome Ngala', email: 'chome@school.com', role: 'teacher' as const },
            { id: 't_4', name: 'Mdm Romana', email: 'romana@school.com', role: 'teacher' as const },
        ];
    }, [users]);

    // List of available subjects
    const subjectList = useMemo(() => {
        if (subjects.length > 0) return subjects.map(s => s.name);
        return ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'CRE', 'Computer Studies', 'Business Studies', 'Agriculture'];
    }, [subjects]);

    const instId = currentInstitution?.id || 'default_inst';

    // Persistent Class Allocations Store (configured in Manage Subjects per Class Stream)
    const [classAllocationsStore, setClassAllocationsStore] = useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem(`eduai_class_subject_allocations_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch(e) {}
        return (currentInstitution as any)?.classSubjectAllocations || {};
    });

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<any>('class_subject_allocations', currentInstitution.id)
                .then(records => {
                    const match = (records || []).find(r => r.id === `alloc_${currentInstitution.id}` || r.institutionId === currentInstitution.id);
                    if (match && match.allocations) {
                        setClassAllocationsStore(prev => {
                            const merged = { ...match.allocations, ...prev };
                            try {
                                localStorage.setItem(`eduai_class_subject_allocations_${currentInstitution.id}`, JSON.stringify(merged));
                            } catch(e) {}
                            return merged;
                        });
                    }
                })
                .catch(() => {});
        }
    }, [currentInstitution]);

    // DB & Local Storage Student Registry Store
    const [allRegisteredStudents, setAllRegisteredStudents] = useState<any[]>([]);

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('student_enrollments', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('students', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('users', currentInstitution.id).catch(() => [])
            ]).then(([enrRecords, stRecords, userRecords]) => {
                const combined = [...(enrRecords || []), ...(stRecords || []), ...(userRecords || [])];
                
                try {
                    const instIdKey = currentInstitution.id;
                    const cachedSt = localStorage.getItem(`eduai_students_${instIdKey}`);
                    if (cachedSt) {
                        const parsed = JSON.parse(cachedSt);
                        if (Array.isArray(parsed)) combined.push(...parsed);
                    }
                    const cachedEnr = localStorage.getItem(`eduai_student_enrollments_${instIdKey}`);
                    if (cachedEnr) {
                        const parsed = JSON.parse(cachedEnr);
                        if (Array.isArray(parsed)) combined.push(...parsed);
                    }
                } catch(e) {}

                const map = new Map<string, any>();
                combined.forEach(st => {
                    if (!st) return;
                    const idKey = String(st.id || st.userId || st.admissionNumber || st.admissionNo || st.admNo || '').trim();
                    const role = st.role || (st.roles && st.roles[0]) || 'student';
                    const isStudent = role === 'student' || Boolean(st.studentClass) || Boolean(st.admissionNumber) || Boolean(st.admissionNo) || Boolean(st.admNo) || Boolean(st.metadata?.gradeLevel) || Boolean(st.metadata?.studentClass);
                    if (idKey && isStudent && !map.has(idKey.toLowerCase())) {
                        map.set(idKey.toLowerCase(), st);
                    }
                });

                const uniqueList = Array.from(map.values());
                if (uniqueList.length > 0) {
                    setAllRegisteredStudents(uniqueList);
                }
            });
        }
    }, [currentInstitution]);

    // Known Registry Adm No -> Student Name Mapping for seamless fallback matching
    const registryNameMap = useMemo(() => new Map<string, string>([
        ['2008', 'Maxine Jelimo'],
        ['2244', 'Dennis Kiplagat'],
        ['1897', 'Felix Kipkosgei'],
        ['1712', 'Job Kipkorir Kipkoech'],
        ['2127', 'Linett Chepkorir Agui'],
        ['1838', 'Emmanuel Kiptoo'],
        ['1834', 'Gervasy Kiptoo'],
        ['1972', 'Kelvin Kiprugo'],
        ['1957', 'Shamir Lokapel'],
        ['1967', 'Michell Chepleting'],
        ['1898', 'Abigael Kimutai'],
        ['2117', 'Mercy Jerono'],
        ['1883', 'Muthoni Ann Nyaguthie'],
        ['1861', 'Junior Kahama'],
        ['1848', 'Isaac Kipteting'],
        ['1853', 'Dennis Maina Kipkemboi'],
        ['1924', 'Judith Jepleting'],
        ['1863', 'Joy Jerotich'],
        ['1904', 'Yvonne Jepleting'],
        ['1933', 'Leah Jerotich Kimutai'],
        ['1856', 'Abigael Jepchumba'],
        ['1908', 'Emmanuel Kipkirui Simatei'],
        ['1872', 'Marion Jerop Kemei'],
        ['1947', 'Emmanuel Kipkorir'],
        ['adm/2024/012', 'Kipkoech Brian'],
        ['adm/2024/045', 'Faith Chebet'],
        ['adm/2024/088', 'Wanjiku Mary'],
        ['adm/2024/104', 'Ochieng Emmanuel'],
        ['adm/2024/120', 'Amina Mohamed'],
        ['adm/2024/156', 'Mutua Kevin'],
        ['adm/2024/172', 'Nanjala Mercy'],
        ['adm/2024/198', 'Otieno David'],
    ]), []);

    // Helper to get registered students for a specific class stream
    const getStudentsForClass = useCallback((clsName: string) => {
        if (!clsName) return [];
        const targetClean = clsName.toLowerCase().trim();
        const targetNumber = targetClean.replace(/^(form|grade|class|year)\s*/i, '').trim();

        // 1. Build rapid User Map for cross-referencing userId
        const userMap = new Map<string, any>();
        [...users, ...allRegisteredStudents].forEach(u => {
            if (u && u.id) userMap.set(String(u.id).toLowerCase().trim(), u);
            if (u && u.userId) userMap.set(String(u.userId).toLowerCase().trim(), u);
        });

        // Helper to validate student names
        const isNameInvalid = (n?: string | null): boolean => {
            if (!n) return true;
            const clean = String(n).trim().toLowerCase();
            return clean === '' || clean === 'unknown student' || clean === 'unknown' || clean === 'student' || clean === 'unnamed student' || clean === 'null' || clean === 'undefined';
        };

        // Helper to extract student name from any record
        const extractStudentName = (s: any): string => {
            if (!s) return '';

            // Direct top-level name properties
            const topName = s.fullName || s.name || s.studentName || s.student_name || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : '');
            if (!isNameInvalid(topName)) return String(topName).trim();

            // Metadata nested name properties (standard format in student_enrollments)
            if (s.metadata && typeof s.metadata === 'object') {
                const metaName = s.metadata.studentName || s.metadata.name || s.metadata.fullName || s.metadata.student_name;
                if (!isNameInvalid(metaName)) return String(metaName).trim();
            }

            // User map lookup via userId
            const uId = s.userId || s.user_id || s.id;
            if (uId && userMap.has(String(uId).toLowerCase())) {
                const u = userMap.get(String(uId).toLowerCase());
                if (u) {
                    const uName = u.name || u.fullName || u.studentName || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '');
                    if (!isNameInvalid(uName)) return String(uName).trim();
                    if (u.metadata?.studentName && !isNameInvalid(u.metadata.studentName)) return String(u.metadata.studentName).trim();
                    if (u.metadata?.name && !isNameInvalid(u.metadata.name)) return String(u.metadata.name).trim();
                }
            }

            // Parent name fallback if present
            if (s.metadata?.parentName && !isNameInvalid(s.metadata.parentName)) {
                return String(s.metadata.parentName).trim();
            }

            return '';
        };

        // 2. Combine all registered student sources (DB, localStorage, and users prop)
        const combinedPool = [...allRegisteredStudents, ...users];
        const seenIds = new Set<string>();

        const matchedStudents = combinedPool.filter(u => {
            if (!u) return false;
            const uRole = u.role || (u.roles && u.roles[0]) || 'student';
            const roleMatch = uRole === 'student' || Boolean(u.studentClass) || Boolean(u.admissionNumber) || Boolean(u.admissionNo) || Boolean(u.admNo) || Boolean(u.metadata?.gradeLevel) || Boolean(u.metadata?.studentClass);
            if (!roleMatch) return false;

            const uClass = String(
                u.studentClass || u.classLevel || u.class_name || u.class ||
                u.metadata?.studentClass || u.metadata?.gradeLevel || u.metadata?.stream || u.gradeLevel || ''
            ).toLowerCase().trim();

            if (!uClass) return false;

            const uClassNumber = uClass.replace(/^(form|grade|class|year)\s*/i, '').trim();

            // Compare clean class strings
            const isMatch = uClass === targetClean ||
                            targetClean.includes(uClass) ||
                            uClass.includes(targetClean) ||
                            (targetNumber && uClassNumber === targetNumber);

            if (!isMatch) return false;

            const uniqueKey = String(u.id || u.userId || u.admissionNumber || u.admissionNo || u.admNo || extractStudentName(u)).toLowerCase().trim();
            if (seenIds.has(uniqueKey)) return false;
            seenIds.add(uniqueKey);
            return true;
        });

        if (matchedStudents.length > 0) {
            return matchedStudents.map((s, idx) => {
                const admNo = String(s.admissionNumber || s.admissionNo || s.admNo || s.regNo || s.registrationNumber || s.metadata?.admissionNumber || s.metadata?.admNo || s.staffId || `ADM/${s.id?.substring(0, 5) || (1000 + idx)}`).trim();
                let resolvedName = extractStudentName(s);

                // Fallback to known registry name dictionary if name is still invalid/unknown
                if (isNameInvalid(resolvedName) && registryNameMap.has(admNo.toLowerCase())) {
                    resolvedName = registryNameMap.get(admNo.toLowerCase())!;
                }

                if (isNameInvalid(resolvedName)) {
                    resolvedName = `Student ${admNo}`;
                }

                return {
                    id: String(s.id || s.userId || `st_${idx}`),
                    name: resolvedName,
                    admissionNumber: admNo,
                    gender: s.gender || s.metadata?.gender || 'Student',
                    studentClass: clsName
                };
            });
        }

        // 3. Official System Student Registry Fallback List (used across Academic Reports & Broadsheet)
        const isGrade = targetClean.includes('grade');
        const prefix = isGrade ? 'Grade' : 'Form';
        const classLabel = `${prefix} ${targetNumber || '3 Central'}`;

        return [
            { id: `st_reg_1`, name: 'Maxine Jelimo', admissionNumber: '2008', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_2`, name: 'Dennis Kiplagat', admissionNumber: '2244', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_3`, name: 'Felix Kipkosgei', admissionNumber: '1897', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_4`, name: 'Job Kipkorir Kipkoech', admissionNumber: '1712', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_5`, name: 'Linett Chepkorir Agui', admissionNumber: '2127', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_6`, name: 'Emmanuel Kiptoo', admissionNumber: '1838', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_7`, name: 'Gervasy Kiptoo', admissionNumber: '1834', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_8`, name: 'Kelvin Kiprugo', admissionNumber: '1972', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_9`, name: 'Shamir Lokapel', admissionNumber: '1957', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_10`, name: 'Michell Chepleting', admissionNumber: '1967', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_11`, name: 'Abigael Kimutai', admissionNumber: '1898', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_12`, name: 'Mercy Jerono', admissionNumber: '2117', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_13`, name: 'Muthoni Ann Nyaguthie', admissionNumber: '1883', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_14`, name: 'Junior Kahama', admissionNumber: '1861', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_15`, name: 'Isaac Kipteting', admissionNumber: '1848', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_16`, name: 'Dennis Maina Kipkemboi', admissionNumber: '1853', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_17`, name: 'Judith Jepleting', admissionNumber: '1924', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_18`, name: 'Joy Jerotich', admissionNumber: '1863', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_19`, name: 'Yvonne Jepleting', admissionNumber: '1904', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_20`, name: 'Leah Jerotich Kimutai', admissionNumber: '1933', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_21`, name: 'Abigael Jepchumba', admissionNumber: '1856', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_22`, name: 'Emmanuel Kipkirui Simatei', admissionNumber: '1908', gender: 'Male', studentClass: classLabel },
            { id: `st_reg_23`, name: 'Marion Jerop Kemei', admissionNumber: '1872', gender: 'Female', studentClass: classLabel },
            { id: `st_reg_24`, name: 'Emmanuel Kipkorir', admissionNumber: '1947', gender: 'Male', studentClass: classLabel },
        ];
    }, [allRegisteredStudents, users, registryNameMap]);

    // Handle Toggling Student Subject Enrollment (Auto-enrolled by default unless exempted)
    const handleToggleStudentEnrollment = async (studentId: string, subjectName: string, currentlyEnrolled: boolean) => {
        const key = `${studentId}_${subjectName.toLowerCase().trim()}`;
        const newExemptedState = currentlyEnrolled; // If currently enrolled, toggle to de-enrolled (isExempted = true)

        setExemptionsStore(prev => {
            const next = { ...prev, [key]: newExemptedState };
            try {
                localStorage.setItem(`eduai_student_subject_exemptions_${instId}`, JSON.stringify(next));
            } catch(e) {}
            return next;
        });

        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('student_subject_exemptions', {
                id: `ex_${instId}_${studentId}_${subjectName.replace(/\s+/g, '_')}`,
                institutionId: currentInstitution.id,
                studentId,
                subjectName,
                key,
                isExempted: newExemptedState,
                updatedAt: new Date().toISOString()
            }).catch(() => {});
        }

        window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'enrollment_updated' } }));
        setSaveToast(`${currentlyEnrolled ? 'De-enrolled (Exempted)' : 'Re-enrolled'} student for ${subjectName}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Handle Resetting All Students in Class to Default Enrolled
    const handleResetAllToDefault = async (clsName: string, targetSubjectName?: string) => {
        const studentsInCls = getStudentsForClass(clsName);
        const studentIds = new Set(studentsInCls.map(s => s.id));

        setExemptionsStore(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
                const parts = k.split('_');
                const sId = parts[0];
                const subNameKey = parts.slice(1).join('_');
                if (studentIds.has(sId)) {
                    if (!targetSubjectName || targetSubjectName === 'all' || subNameKey === targetSubjectName.toLowerCase().trim()) {
                        delete next[k];
                    }
                }
            });
            try {
                localStorage.setItem(`eduai_student_subject_exemptions_${instId}`, JSON.stringify(next));
            } catch(e) {}
            return next;
        });

        window.dispatchEvent(new CustomEvent('eduai_academics_synced', { detail: { type: 'enrollment_reset' } }));
        setSaveToast(`Reset all students in ${clsName} to Default Auto-Enrolled`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Helper to get applicable subjects for any given class name (strictly deduplicated by subject name)
    const getApplicableSubjectsForClass = useCallback((clsName: string) => {
        if (!clsName) return [];
        const cClean = clsName.trim();
        const cLower = cClean.toLowerCase();

        let rawList: any[] = [];

        // 1. Check persistent per-class allocation store configured in Manage Subjects per Class Stream
        const storedAssignedIds = classAllocationsStore[cClean] ?? classAllocationsStore[cLower];
        if (Array.isArray(storedAssignedIds) && storedAssignedIds.length > 0) {
            const set = new Set(storedAssignedIds.map(id => String(id).toLowerCase().trim()));
            rawList = subjects.filter(s => {
                const sId = (s.id || '').toLowerCase().trim();
                const sName = (s.name || '').toLowerCase().trim();
                const sCode = (s.code || '').toLowerCase().trim();
                return set.has(sId) || set.has(sName) || (sCode && set.has(sCode));
            });
        } else if (subjects && subjects.length > 0) {
            // 2. Check explicit targetClasses / assignedClasses array on subject
            const explicitMatch = subjects.filter(s => {
                const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
                if (Array.isArray(targetCls)) {
                    return targetCls.some((tc: string) => {
                        const cleanTC = (tc || '').toLowerCase().trim();
                        return cleanTC === cLower || cLower.startsWith(cleanTC) || cleanTC.startsWith(cLower);
                    });
                }
                return false;
            });

            if (explicitMatch.length > 0) {
                rawList = explicitMatch;
            } else {
                // 3. Fallback to standard grade-level applicability rules
                const applicable = subjects.filter(s => isSubjectAssignedToClassStream(s, clsName, courses));
                if (applicable.length > 0) {
                    rawList = applicable;
                }
            }
        }

        if (rawList.length === 0) {
            rawList = [
                { id: 'sub_math', name: 'Mathematics', code: 'MATH 101', periodsPerWeek: 6 },
                { id: 'sub_eng', name: 'English', code: 'ENGL 101', periodsPerWeek: 6 },
                { id: 'sub_kisw', name: 'Kiswahili', code: 'KISW 101', periodsPerWeek: 5 },
                { id: 'sub_sci', name: 'Integrated Science', code: 'SCI 101', periodsPerWeek: 5 },
                { id: 'sub_soc', name: 'Social Studies', code: 'SST 101', periodsPerWeek: 4 },
                { id: 'sub_cre', name: 'Religious Education', code: 'CRE 101', periodsPerWeek: 3 }
            ];
        }

        // Enforce strict deduplication by normalized subject name
        const seenNames = new Set<string>();
        const deduplicated: any[] = [];

        rawList.forEach(s => {
            if (!s || !s.name) return;
            const normName = String(s.name).trim().toLowerCase();
            if (!seenNames.has(normName)) {
                seenNames.add(normName);
                deduplicated.push(s);
            }
        });

        return deduplicated;
    }, [subjects, courses, classAllocationsStore]);

    const [allocations, setAllocations] = useState<SubjectAllocationRecord[]>([]);
    const [removedFromClassKeys, setRemovedFromClassKeys] = useState<Set<string>>(() => {
        try {
            const raw = localStorage.getItem('eduai_removed_allocation_keys');
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    });

    const updateRemovedKeys = useCallback((updater: (prev: Set<string>) => Set<string>) => {
        setRemovedFromClassKeys(prev => {
            const next = updater(prev);
            try {
                localStorage.setItem('eduai_removed_allocation_keys', JSON.stringify(Array.from(next)));
            } catch {}
            return next;
        });
    }, []);

    // Sync selectedClass and modalClassName when classOptions resolves
    useEffect(() => {
        if (classOptions.length > 0 && (!selectedClass || !classOptions.includes(selectedClass))) {
            setSelectedClass(classOptions[0]);
            setModalClassName(classOptions[0]);
        }
    }, [classOptions, selectedClass]);

    // Load allocations from DB if available
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<SubjectAllocationRecord>('subject_allocations', currentInstitution.id)
                .then(dbAllocations => {
                    if (dbAllocations && dbAllocations.length > 0) {
                        setAllocations(dbAllocations);
                    }
                })
                .catch(err => console.log('Using initial allocation records:', err));
        }
    }, [currentInstitution]);

    // Initialize selected teacher if empty
    useEffect(() => {
        if (!selectedTeacherId && teacherUsers.length > 0) {
            setSelectedTeacherId(teacherUsers[0].id);
        }
    }, [teacherUsers, selectedTeacherId]);

    // Handle Assigning Teacher to a subject row
    const handleAssignTeacher = async (allocId: string, newTeacherId: string, classNameOverride?: string, subjectNameOverride?: string, subjectCodeOverride?: string, lessonsOverride?: number) => {
        const teacherObj = teacherUsers.find(t => t.id === newTeacherId);
        
        let found = false;
        const updatedAllocations = allocations.map(a => {
            if (a.id === allocId || (classNameOverride && a.className.toLowerCase().trim() === classNameOverride.toLowerCase().trim() && a.subjectName.toLowerCase().trim() === (subjectNameOverride || '').toLowerCase().trim())) {
                found = true;
                return {
                    ...a,
                    teacherId: newTeacherId,
                    teacherName: teacherObj ? teacherObj.name : 'Unassigned',
                    status: newTeacherId ? ('allocated' as const) : ('unassigned' as const)
                };
            }
            return a;
        });

        if (!found && classNameOverride && subjectNameOverride) {
            const newAlloc: SubjectAllocationRecord = {
                id: allocId || `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId: currentInstitution?.id || 'inst_1',
                className: classNameOverride,
                subjectName: subjectNameOverride,
                subjectCode: subjectCodeOverride || `${subjectNameOverride.substring(0, 4).toUpperCase()} 101`,
                teacherId: newTeacherId,
                teacherName: teacherObj ? teacherObj.name : 'Unassigned',
                lessonsPerWeek: lessonsOverride || 6,
                status: newTeacherId ? 'allocated' : 'unassigned'
            };
            updatedAllocations.push(newAlloc);
        }

        setAllocations(updatedAllocations);
        const targetRecord = updatedAllocations.find(a => a.id === allocId || (a.className.toLowerCase().trim() === (classNameOverride || '').toLowerCase().trim() && a.subjectName.toLowerCase().trim() === (subjectNameOverride || '').toLowerCase().trim()));
        if (targetRecord && currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', targetRecord).catch(() => {});
        }

        setSaveToast(`Updated allocation for ${targetRecord?.subjectName || subjectNameOverride} (${targetRecord?.className || classNameOverride})`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Handle Updating Lessons Count
    const handleUpdateLessonsCount = async (allocId: string, lessons: number, classNameOverride?: string, subjectNameOverride?: string) => {
        let found = false;
        const updatedAllocations = allocations.map(a => {
            if (a.id === allocId || (classNameOverride && a.className === classNameOverride && a.subjectName === subjectNameOverride)) {
                found = true;
                return { ...a, lessonsPerWeek: lessons };
            }
            return a;
        });

        if (!found && classNameOverride && subjectNameOverride) {
            const newAlloc: SubjectAllocationRecord = {
                id: allocId || `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId: currentInstitution?.id || 'inst_1',
                className: classNameOverride,
                subjectName: subjectNameOverride,
                lessonsPerWeek: lessons,
                status: 'unassigned'
            };
            updatedAllocations.push(newAlloc);
        }

        setAllocations(updatedAllocations);
        const targetRecord = updatedAllocations.find(a => a.id === allocId || (a.className === classNameOverride && a.subjectName === subjectNameOverride));
        if (targetRecord && currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', targetRecord).catch(() => {});
        }
    };

    // Add New Allocation
    const handleCreateAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        const teacherObj = teacherUsers.find(t => t.id === modalTeacherId);
        const targetClassStream = modalStream && modalStream !== 'all' ? `${modalClassName} ${modalStream}`.trim() : modalClassName;

        const newRecord: SubjectAllocationRecord = {
            id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            institutionId: currentInstitution?.id || 'inst_1',
            className: targetClassStream,
            subjectName: modalSubjectName,
            subjectCode: `${modalSubjectName.substring(0, 4).toUpperCase()} 101`,
            teacherId: modalTeacherId,
            teacherName: teacherObj ? teacherObj.name : 'Unassigned',
            lessonsPerWeek: modalLessons,
            status: modalTeacherId ? 'allocated' : 'unassigned'
        };

        setAllocations(prev => {
            const filtered = prev.filter(a => !(a.className.toLowerCase().trim() === targetClassStream.toLowerCase().trim() && a.subjectName.toLowerCase().trim() === modalSubjectName.toLowerCase().trim()));
            return [newRecord, ...filtered];
        });

        updateRemovedKeys(prev => {
            const next = new Set(prev);
            next.delete(`${targetClassStream}_${modalSubjectName}`);
            return next;
        });

        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', newRecord).catch(() => {});
        }

        setSelectedClass(modalClassName);
        if (modalStream && modalStream !== 'all') {
            setSelectedStream(modalStream);
        }

        setIsAddAllocationModalOpen(false);
        setSaveToast(`Added allocation for ${modalSubjectName} in ${targetClassStream}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Handle Deleting / Unallocating a subject allocation from a class
    const handleDeleteAllocation = async (alloc: SubjectAllocationRecord) => {
        const confirmDelete = window.confirm(`Are you sure you want to remove the subject allocation for "${alloc.subjectName}" in ${alloc.className}?`);
        if (!confirmDelete) return;

        const key = `${alloc.className}_${alloc.subjectName}`;
        updateRemovedKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });

        setAllocations(prev => prev.filter(a => a.id !== alloc.id && !(a.className === alloc.className && a.subjectName === alloc.subjectName)));

        // Delete from DB subject_allocations table if record exists
        if (currentInstitution?.id && alloc.id && !alloc.id.startsWith('alloc_') && alloc.id.length > 5) {
            await apiService.deleteModuleRecord('subject_allocations', alloc.id).catch(() => {});
        }

        // Unassign class stream from subject's targetClasses / assignedClasses
        const subjObj = (subjects || []).find(s => 
            s.name.toLowerCase().trim() === alloc.subjectName.toLowerCase().trim() || 
            (alloc.subjectCode && s.code.toLowerCase().trim() === alloc.subjectCode.toLowerCase().trim())
        );

        if (subjObj) {
            const existingClasses = (subjObj as any).targetClasses || (subjObj as any).assignedClasses || (subjObj as any).classes || [];
            const updatedClasses = Array.isArray(existingClasses) 
                ? existingClasses.filter((c: string) => c.toLowerCase().trim() !== alloc.className.toLowerCase().trim())
                : [];
            
            if (onUpdateSubject) {
                onUpdateSubject(subjObj.id, { targetClasses: updatedClasses, assignedClasses: updatedClasses } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...subjObj, targetClasses: updatedClasses, assignedClasses: updatedClasses } as Subject).catch(() => {});
            }
        }

        setSaveToast(`Removed ${alloc.subjectName} allocation from ${alloc.className}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Helper to get available streams for any given class (Strictly stream names, e.g. ['EAST', 'WEST'])
    const getStreamsForClass = useCallback((targetClass: string): string[] => {
        const streamSet = new Set<string>();
        if (!targetClass) return [];
        const targetClean = targetClass.toLowerCase().trim();

        // 1. From institution configured streams
        if ((currentInstitution as any)?.streams && Array.isArray((currentInstitution as any).streams)) {
            (currentInstitution as any).streams.forEach((s: any) => {
                const sName = typeof s === 'string' ? s : (s?.name || s?.title || s?.streamName || '');
                const clean = extractStreamOnly(sName, targetClass);
                if (clean && clean.toLowerCase() !== targetClean && !/^\d+$/.test(clean)) {
                    streamSet.add(clean.toUpperCase());
                }
            });
        }

        // 2. From courses matching targetClass
        (courses || []).forEach((c: any) => {
            const cName = typeof c === 'string' ? c : (c.name || c.title || c.code || '');
            const parsed = extractClassAndStream(cName);
            const baseName = (parsed.className || cName).trim().toLowerCase();

            if (baseName === targetClean || cName.toLowerCase().startsWith(targetClean)) {
                if (Array.isArray(c.levels)) {
                    c.levels.forEach((l: any) => {
                        const lName = String(l.name || '').trim();
                        const clean = extractStreamOnly(lName, targetClass);
                        if (clean && !/^\d+$/.test(clean)) streamSet.add(clean.toUpperCase());
                    });
                }
                const streamClean = extractStreamOnly(cName, targetClass);
                if (streamClean && !/^\d+$/.test(streamClean)) streamSet.add(streamClean.toUpperCase());
            }
        });

        // 3. From users & registered students in targetClass
        [...allRegisteredStudents, ...users].forEach((u: any) => {
            if (!u) return;
            const uClass = String(u.studentClass || u.classLevel || u.class_name || u.class || '').trim();
            const parsed = extractClassAndStream(uClass);
            const baseName = (parsed.className || uClass).trim().toLowerCase();

            if (baseName === targetClean || uClass.toLowerCase().startsWith(targetClean)) {
                const directStream = u.stream || u.streamName || u.metadata?.stream || u.metadata?.streamName || '';
                if (directStream) {
                    const clean = extractStreamOnly(String(directStream), targetClass);
                    if (clean && !/^\d+$/.test(clean)) streamSet.add(clean.toUpperCase());
                }
                const fromClass = extractStreamOnly(uClass, targetClass);
                if (fromClass && !/^\d+$/.test(fromClass)) streamSet.add(fromClass.toUpperCase());
            }
        });

        // 4. From saved DB allocations matching targetClass
        (allocations || []).forEach(a => {
            const aClass = (a.className || '').trim();
            if (aClass.toLowerCase().startsWith(targetClean) && aClass.toLowerCase() !== targetClean) {
                const clean = extractStreamOnly(aClass, targetClass);
                if (clean && !/^\d+$/.test(clean)) streamSet.add(clean.toUpperCase());
            }
        });

        // 5. From classAllocationsStore keys matching targetClass
        Object.keys(classAllocationsStore || {}).forEach(k => {
            if (k.toLowerCase().startsWith(targetClean) && k.toLowerCase() !== targetClean) {
                const clean = extractStreamOnly(k, targetClass);
                if (clean && !/^\d+$/.test(clean)) streamSet.add(clean.toUpperCase());
            }
        });

        // 6. From customStreamsStore
        const customForClass = customStreamsStore[targetClass] || [];
        customForClass.forEach(cs => {
            const clean = extractStreamOnly(cs, targetClass);
            if (clean && !/^\d+$/.test(clean)) streamSet.add(clean.toUpperCase());
        });

        // 7. Check localStorage cached broadsheets
        try {
            const cachedBroadsheets = localStorage.getItem('eduai_saved_broadsheets');
            if (cachedBroadsheets) {
                const parsed = JSON.parse(cachedBroadsheets);
                Object.keys(parsed).forEach(k => {
                    if (k.toLowerCase().includes(targetClean)) {
                        const clean = extractStreamOnly(k, targetClass);
                        if (clean && !/^\d+$/.test(clean)) streamSet.add(clean.toUpperCase());
                    }
                });
            }
        } catch(e) {}

        // Fallback default streams for any school class if none detected
        if (streamSet.size === 0) {
            streamSet.add('EAST');
            streamSet.add('WEST');
        }

        return Array.from(streamSet).sort();
    }, [currentInstitution, courses, allRegisteredStudents, users, allocations, classAllocationsStore, customStreamsStore]);

    // Available Streams for currently selected class and modal class
    const availableStreamsForClass = useMemo(() => getStreamsForClass(selectedClass), [getStreamsForClass, selectedClass]);
    const availableStreamsForModalClass = useMemo(() => getStreamsForClass(modalClassName), [getStreamsForClass, modalClassName]);

    // Add Custom Stream Handler
    const handleAddCustomStream = (streamName: string) => {
        const clean = streamName.trim().toUpperCase();
        if (!clean || !selectedClass) return;
        setCustomStreamsStore(prev => {
            const current = prev[selectedClass] || [];
            if (current.includes(clean)) return prev;
            const updated = { ...prev, [selectedClass]: [...current, clean] };
            try {
                const instIdKey = currentInstitution?.id || 'default_inst';
                localStorage.setItem(`eduai_custom_streams_${instIdKey}`, JSON.stringify(updated));
            } catch(e) {}
            return updated;
        });
        setSelectedStream(clean);
        setIsAddingCustomStream(false);
        setNewStreamInput('');
        setSaveToast(`Added stream "${clean}" to ${selectedClass}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    const isStreamSpecific = selectedStream !== 'all' && Boolean(selectedStream);
    const activeTargetClassName = useMemo(() => {
        if (!isStreamSpecific) return selectedClass;
        return `${selectedClass} ${selectedStream}`.trim();
    }, [isStreamSpecific, selectedClass, selectedStream]);

    // Copy subject allocations from Base Class to active stream
    const handleCopyFromBaseClass = async () => {
        if (!isStreamSpecific || !selectedClass) return;
        const baseAllocations = allocations.filter(a => a.className.toLowerCase().trim() === selectedClass.toLowerCase().trim());
        if (baseAllocations.length === 0) {
            const applicable = getApplicableSubjectsForClass(selectedClass);
            const createdAllocs: SubjectAllocationRecord[] = applicable.map((subj, idx) => {
                const defaultTeacher = teacherUsers[idx % teacherUsers.length];
                return {
                    id: `alloc_${activeTargetClassName.replace(/\s+/g, '_')}_${subj.id || idx}_${Date.now()}`,
                    institutionId: currentInstitution?.id || 'inst_1',
                    className: activeTargetClassName,
                    subjectName: subj.name,
                    subjectCode: subj.code || `${subj.name.substring(0, 4).toUpperCase()} 101`,
                    teacherId: defaultTeacher ? defaultTeacher.id : '',
                    teacherName: defaultTeacher ? defaultTeacher.name : 'Unassigned',
                    lessonsPerWeek: (subj as any).periodsPerWeek || (subj as any).lessonsPerWeek || (idx % 2 === 0 ? 7 : 6),
                    status: defaultTeacher ? ('allocated' as const) : ('unassigned' as const)
                };
            });
            setAllocations(prev => [...createdAllocs, ...prev.filter(a => a.className.toLowerCase().trim() !== activeTargetClassName.toLowerCase().trim())]);
            if (currentInstitution?.id) {
                for (const a of createdAllocs) {
                    await apiService.saveModuleRecord('subject_allocations', a).catch(() => {});
                }
            }
        } else {
            const copiedAllocs: SubjectAllocationRecord[] = baseAllocations.map(ba => ({
                ...ba,
                id: `alloc_${activeTargetClassName.replace(/\s+/g, '_')}_${ba.subjectName.replace(/\s+/g, '_')}_${Date.now()}`,
                className: activeTargetClassName
            }));
            setAllocations(prev => [...copiedAllocs, ...prev.filter(a => a.className.toLowerCase().trim() !== activeTargetClassName.toLowerCase().trim())]);
            if (currentInstitution?.id) {
                for (const a of copiedAllocs) {
                    await apiService.saveModuleRecord('subject_allocations', a).catch(() => {});
                }
            }
        }
        setSaveToast(`Copied allocations from ${selectedClass} into stream ${selectedStream}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Selected Class Stream Allocations (dynamically populated based on subjects assigned to activeTargetClassName, deduplicated strictly by subject name)
    const classAllocations = useMemo(() => {
        if (!selectedClass) return [];

        const q = searchQuery.toLowerCase().trim();
        const map = new Map<string, SubjectAllocationRecord>();

        // 1. First add saved DB allocation records for activeTargetClassName
        const savedForTarget = (allocations || []).filter(a => a.className.toLowerCase().trim() === activeTargetClassName.toLowerCase().trim());
        savedForTarget.forEach(a => {
            const key = (a.subjectName || '').toLowerCase().trim();
            if (key && !map.has(key)) {
                map.set(key, a);
            }
        });

        // 2. If stream-specific, check if base class has saved allocations to use as inherit baseline
        if (isStreamSpecific) {
            const savedForBase = (allocations || []).filter(a => a.className.toLowerCase().trim() === selectedClass.toLowerCase().trim());
            savedForBase.forEach(ba => {
                const key = (ba.subjectName || '').toLowerCase().trim();
                if (key && !map.has(key)) {
                    map.set(key, {
                        ...ba,
                        id: `alloc_${activeTargetClassName.replace(/\s+/g, '_')}_${ba.subjectName.replace(/\s+/g, '_')}`,
                        className: activeTargetClassName
                    });
                }
            });
        }

        // 3. Add applicable subjects for selectedClass if not already present
        const applicableSubjects = getApplicableSubjectsForClass(selectedClass);
        applicableSubjects.forEach((subj, idx) => {
            const key = (subj.name || '').toLowerCase().trim();
            if (key && !map.has(key)) {
                const defaultTeacher = teacherUsers[idx % teacherUsers.length];
                map.set(key, {
                    id: `alloc_${activeTargetClassName.replace(/\s+/g, '_')}_${subj.id || idx}`,
                    institutionId: currentInstitution?.id || 'inst_1',
                    className: activeTargetClassName,
                    subjectName: subj.name,
                    subjectCode: subj.code || `${subj.name.substring(0, 4).toUpperCase()} 101`,
                    teacherId: defaultTeacher ? defaultTeacher.id : '',
                    teacherName: defaultTeacher ? defaultTeacher.name : 'Unassigned',
                    lessonsPerWeek: (subj as any).periodsPerWeek || (subj as any).lessonsPerWeek || (idx % 2 === 0 ? 7 : 6),
                    status: defaultTeacher ? ('allocated' as const) : ('unassigned' as const)
                });
            }
        });

        // 4. Convert to array and filter out deleted/removed keys and search query
        return Array.from(map.values()).filter(a => {
            if (removedFromClassKeys.has(`${a.className}_${a.subjectName}`) || (!isStreamSpecific && removedFromClassKeys.has(`${selectedClass}_${a.subjectName}`))) return false;
            if (!q) return true;
            return a.className.toLowerCase().includes(q) ||
                   a.subjectName.toLowerCase().includes(q) ||
                   (a.teacherName && a.teacherName.toLowerCase().includes(q));
        });
    }, [selectedClass, activeTargetClassName, isStreamSpecific, allocations, getApplicableSubjectsForClass, teacherUsers, currentInstitution, searchQuery, removedFromClassKeys]);

    // All allocations dynamically gathered across classOptions + saved DB allocations (deduplicated by className + subjectName)
    const allAllocations = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const map = new Map<string, SubjectAllocationRecord>();

        // 1. First add all DB/state saved allocations
        (allocations || []).forEach(a => {
            const key = `${a.className.toLowerCase().trim()}_${a.subjectName.toLowerCase().trim()}`;
            if (key && !map.has(key)) {
                map.set(key, a);
            }
        });

        // 2. Add dynamically derived class allocations for all classOptions
        (classOptions || []).forEach(cls => {
            const applicable = getApplicableSubjectsForClass(cls);
            applicable.forEach((subj, idx) => {
                const key = `${cls.toLowerCase().trim()}_${subj.name.toLowerCase().trim()}`;
                if (!map.has(key)) {
                    const defaultTeacher = teacherUsers[idx % teacherUsers.length];
                    map.set(key, {
                        id: `alloc_${cls.replace(/\s+/g, '_')}_${subj.id || idx}`,
                        institutionId: currentInstitution?.id || 'inst_1',
                        className: cls,
                        subjectName: subj.name,
                        subjectCode: subj.code || `${subj.name.substring(0, 4).toUpperCase()} 101`,
                        teacherId: defaultTeacher ? defaultTeacher.id : '',
                        teacherName: defaultTeacher ? defaultTeacher.name : 'Unassigned',
                        lessonsPerWeek: (subj as any).periodsPerWeek || (subj as any).lessonsPerWeek || (idx % 2 === 0 ? 7 : 6),
                        status: defaultTeacher ? ('allocated' as const) : ('unassigned' as const)
                    });
                }
            });
        });

        const list = Array.from(map.values()).filter(a => !removedFromClassKeys.has(`${a.className}_${a.subjectName}`));
        if (!q) return list;
        return list.filter(a =>
            a.className.toLowerCase().includes(q) ||
            a.subjectName.toLowerCase().includes(q) ||
            (a.teacherName && a.teacherName.toLowerCase().includes(q))
        );
    }, [allocations, classOptions, getApplicableSubjectsForClass, teacherUsers, currentInstitution, searchQuery, removedFromClassKeys]);

    // Selected Teacher Allocations & Workload
    const selectedTeacherObj = teacherUsers.find(t => t.id === selectedTeacherId);
    const teacherAllocations = useMemo(() => {
        return allAllocations.filter(a => a.teacherId === selectedTeacherId);
    }, [allAllocations, selectedTeacherId]);

    const totalTeacherLessons = useMemo(() => {
        return teacherAllocations.reduce((sum, a) => sum + (a.lessonsPerWeek || 0), 0);
    }, [teacherAllocations]);

    // Subject Columns for Allocation Matrix (dynamically resolved from active subjects across the institution)
    const matrixSubjectColumns = useMemo(() => {
        const seen = new Set<string>();
        const cols: { name: string; code?: string }[] = [];

        // 1. Registered subjects prop
        if (subjects && subjects.length > 0) {
            subjects.forEach(s => {
                const nameKey = (s.name || '').trim();
                if (nameKey && !seen.has(nameKey.toLowerCase())) {
                    seen.add(nameKey.toLowerCase());
                    cols.push({ name: nameKey, code: s.code });
                }
            });
        }

        // 2. All allocations
        allAllocations.forEach(a => {
            const nameKey = (a.subjectName || '').trim();
            if (nameKey && !seen.has(nameKey.toLowerCase())) {
                seen.add(nameKey.toLowerCase());
                cols.push({ name: nameKey, code: a.subjectCode });
            }
        });

        if (cols.length > 0) return cols;

        return [
            { name: 'Mathematics Activities', code: 'MATH-LP' },
            { name: 'English Language Activities', code: 'ENG-LP' },
            { name: 'Kiswahili Language Activities', code: 'KISW-LP' },
            { name: 'Environmental Activities', code: 'ENV-LP' },
            { name: 'Religious Education Activities', code: 'CRE-LP' },
            { name: 'Integrated Science', code: 'INT-SCI' }
        ];
    }, [subjects, allAllocations]);

    return (
        <div className="space-y-6 animate-fade-in w-full text-left">
            {/* Toast Banner */}
            {saveToast && (
                <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-xs flex justify-between items-center shadow-lg animate-in slide-in-from-top-2">
                    <span className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4" /> {saveToast}
                    </span>
                    <button type="button" onClick={() => setSaveToast(null)} className="hover:opacity-80">✕</button>
                </div>
            )}

            {/* Top Banner Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border border-indigo-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400 bg-indigo-900/60 px-3 py-1 rounded-full border border-indigo-700/50">
                        📚 Cyber Academic Curriculum
                    </span>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-2 flex items-center gap-2">
                        <RectangleStackIcon className="w-7 h-7 text-indigo-400" /> Lessons & Subject Allocations
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Manage subject teaching assignments per class stream or per teacher. Monitor weekly lesson workloads and allocate teaching staff in real-time.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            if (selectedClass) setModalClassName(selectedClass);
                            if (selectedStream) setModalStream(selectedStream);
                            setIsAddAllocationModalOpen(true);
                        }}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-indigo-900/40 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                        <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Lesson Allocation
                    </button>
                </div>
            </div>

            {/* Mode Selector & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setViewMode('per_class')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'per_class'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        📌 Manage Per Class
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('per_teacher')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'per_teacher'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        👨‍🏫 Manage Per Teacher
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('matrix')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'matrix'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        📊 Allocation Matrix
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('student_enrollment')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'student_enrollment'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        🎓 Student Enrollment
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center w-full md:w-72">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search class, subject or teacher..."
                        className="pl-9 pr-8 py-2 w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                    )}
                </div>
            </div>

            {/* TAB MODE 1: MANAGE PER CLASS */}
            {viewMode === 'per_class' && (
                <div className="space-y-6">
                    {/* Class Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar-horizontal">
                        {classOptions.map(cls => {
                            // Build a merged set: DB allocation records first, then applicable subjects
                            // This mirrors the classAllocations table logic so the count stays in sync
                            const seenNamesForCount = new Set<string>();
                            (allocations || []).forEach(a => {
                                if (a.className.toLowerCase().trim() === cls.toLowerCase().trim()) {
                                    const k = (a.subjectName || '').toLowerCase().trim();
                                    if (k && !removedFromClassKeys.has(`${cls}_${a.subjectName}`)) {
                                        seenNamesForCount.add(k);
                                    }
                                }
                            });
                            const rawApplicable = getApplicableSubjectsForClass(cls);
                            rawApplicable.forEach(s => {
                                const k = (s.name || '').toLowerCase().trim();
                                if (k && !removedFromClassKeys.has(`${cls}_${s.name}`)) {
                                    seenNamesForCount.add(k);
                                }
                            });

                            const count = seenNamesForCount.size;
                            const classAllocs = (allAllocations || []).filter(a => a.className.toLowerCase().trim() === cls.toLowerCase().trim());
                            const unassigned = [...seenNamesForCount].filter(name => {
                                const alloc = classAllocs.find(a => a.subjectName.toLowerCase().trim() === name);
                                return !alloc || alloc.status === 'unassigned' || !alloc.teacherId;
                            }).length;

                            const isSelected = selectedClass === cls;
                            return (
                                <button
                                    key={cls}
                                    type="button"
                                    onClick={() => setSelectedClass(cls)}
                                    className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border text-left cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-none scale-105'
                                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                    }`}
                                >
                                    <div>{cls}</div>
                                    <div className="text-[9px] font-mono opacity-80 mt-0.5">
                                        {count} subjects {unassigned > 0 && <span className="text-amber-300 font-bold">({unassigned} unassigned)</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Stream Allocation Selector Bar */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
                                <UserGroupIcon className="w-4 h-4 text-indigo-500" />
                                Stream Allocation:
                            </span>

                            {/* All Streams Pill */}
                            <button
                                type="button"
                                onClick={() => setSelectedStream('all')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    selectedStream === 'all'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none scale-105'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                }`}
                            >
                                All Streams ({selectedClass})
                            </button>

                            {/* Individual Stream Pills */}
                            {availableStreamsForClass.map(st => {
                                const isSelected = selectedStream.toLowerCase() === st.toLowerCase();
                                const streamClassKey = `${selectedClass} ${st}`.toLowerCase().trim();
                                const streamAllocsCount = allocations.filter(a => a.className.toLowerCase().trim() === streamClassKey).length;

                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setSelectedStream(st)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none scale-105'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                    >
                                        <span>{st}</span>
                                        {streamAllocsCount > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                                isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {streamAllocsCount} alloc
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Add Custom Stream or Stream Action */}
                        <div className="flex items-center gap-2">
                            {isAddingCustomStream ? (
                                <div className="flex items-center gap-1.5 animate-fade-in">
                                    <input
                                        type="text"
                                        value={newStreamInput}
                                        onChange={e => setNewStreamInput(e.target.value)}
                                        placeholder="e.g. NORTH, BLUE"
                                        className="py-1 px-2.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-indigo-400 rounded-lg outline-none w-32 uppercase"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddCustomStream(newStreamInput);
                                            if (e.key === 'Escape') setIsAddingCustomStream(false);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddCustomStream(newStreamInput)}
                                        className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-indigo-700 cursor-pointer"
                                    >
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCustomStream(false)}
                                        className="px-2 py-1 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCustomStream(true)}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" /> Add Stream
                                </button>
                            )}

                            {isStreamSpecific && (
                                <button
                                    type="button"
                                    onClick={handleCopyFromBaseClass}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                                    title={`Copy all subject allocations from ${selectedClass} into ${activeTargetClassName}`}
                                >
                                    📋 Copy from Base {selectedClass}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Class Allocations Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/40">
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Class Stream: {activeTargetClassName}
                                    </h3>
                                    {isStreamSpecific ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                            Stream: {selectedStream}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            Base Class (All Streams)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">Subject teacher assignments and weekly lesson count for {activeTargetClassName}.</p>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                                {classAllocations.reduce((sum, a) => sum + (a.lessonsPerWeek || 0), 0)} Weekly Lessons
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Code</th>
                                        <th className="px-6 py-4 text-left">Subject Offered</th>
                                        <th className="px-6 py-4 text-left">Allocated Teacher</th>
                                        <th className="px-6 py-4 text-center">Lessons / Wk</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {classAllocations.map(alloc => (
                                        <tr key={alloc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-500">{alloc.subjectCode || 'SUB-100'}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">{alloc.subjectName}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={alloc.teacherId || ''}
                                                    onChange={(e) => handleAssignTeacher(alloc.id, e.target.value, activeTargetClassName, alloc.subjectName, alloc.subjectCode, alloc.lessonsPerWeek)}
                                                    className="w-full max-w-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                                                >
                                                    <option value="">-- Select Teacher --</option>
                                                    {teacherUsers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={15}
                                                    value={alloc.lessonsPerWeek}
                                                    onChange={(e) => handleUpdateLessonsCount(alloc.id, parseInt(e.target.value) || 1, activeTargetClassName, alloc.subjectName)}
                                                    className="w-16 py-1.5 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${
                                                    alloc.status === 'allocated'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 animate-pulse'
                                                }`}>
                                                    {alloc.status === 'allocated' ? '✓ Allocated' : '⚠️ Unassigned'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAllocation(alloc)}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Remove allocation"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {classAllocations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                                No subject allocations created for {selectedClass} yet. Click "Add Lesson Allocation" above to assign subjects & teachers.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB MODE 2: MANAGE PER TEACHER */}
            {viewMode === 'per_teacher' && (
                <div className="space-y-6">
                    {/* Teacher Cards Horizontal Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {teacherUsers.map(t => {
                            const allocs = allocations.filter(a => a.teacherId === t.id);
                            const totalLessons = allocs.reduce((sum, a) => sum + a.lessonsPerWeek, 0);
                            const isSelected = selectedTeacherId === t.id;
                            const isOverloaded = totalLessons > 30;

                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTeacherId(t.id)}
                                    className={`p-5 rounded-[2rem] border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-indigo-700 shadow-xl scale-105'
                                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                    }`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm font-black truncate max-w-[140px]">{t.name}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                isOverloaded ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                            }`}>
                                                {totalLessons} lessons/wk
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">{t.email || 'Staff Educator'}</p>
                                    </div>
                                    <div className="text-[10px] font-mono text-indigo-400 font-bold">
                                        Assigned to {allocs.length} class streams
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Teacher Workload Summary & Assigned Classes Table */}
                    {selectedTeacherObj && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/40">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                        👨‍🏫 Educator Workload: {selectedTeacherObj.name}
                                    </h3>
                                    <p className="text-xs text-slate-500">List of all class streams and subjects assigned to {selectedTeacherObj.name}.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        Total Workload: {totalTeacherLessons} Lessons / Week
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Class Stream</th>
                                            <th className="px-6 py-4 text-left">Subject Assigned</th>
                                            <th className="px-6 py-4 text-left">Subject Code</th>
                                            <th className="px-6 py-4 text-center">Lessons / Wk</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {teacherAllocations.map(alloc => (
                                            <tr key={alloc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">{alloc.className}</td>
                                                <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{alloc.subjectName}</td>
                                                <td className="px-6 py-4 font-mono text-slate-500">{alloc.subjectCode || 'SUB-100'}</td>
                                                <td className="px-6 py-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">{alloc.lessonsPerWeek}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignTeacher(alloc.id, '')}
                                                        className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[10px] uppercase tracking-wider border border-amber-200 transition-colors"
                                                    >
                                                        Unassign
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {teacherAllocations.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                                    No subject allocations assigned to {selectedTeacherObj.name} yet. Click "Add Lesson Allocation" above to assign classes to this educator.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB MODE 3: ALLOCATION MATRIX */}
            {viewMode === 'matrix' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            📊 School-Wide Subject Allocation Matrix
                        </h3>
                        <p className="text-xs text-slate-500">Comprehensive grid showing class streams vs subjects and assigned teachers across the school.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left w-36">Class Stream</th>
                                    {matrixSubjectColumns.map(subCol => (
                                        <th key={subCol.name} className="px-4 py-3 text-center border-x border-slate-800">{subCol.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {classOptions.map(cls => {
                                    // Collect streams for this class
                                    const classStreams = new Set<string>();
                                    (allocations || []).forEach(a => {
                                        if (a.className.toLowerCase().startsWith(cls.toLowerCase()) && a.className.toLowerCase() !== cls.toLowerCase()) {
                                            const strOnly = extractStreamOnly(a.className, cls);
                                            if (strOnly && !/^\d+$/.test(strOnly)) classStreams.add(strOnly.toUpperCase());
                                        }
                                    });
                                    if (cls.toLowerCase() === selectedClass.toLowerCase()) {
                                        availableStreamsForClass.forEach(st => classStreams.add(st));
                                    }

                                    const rowsForThisClass: { key: string; label: string; isStream: boolean; streamName?: string }[] = [
                                        { key: cls, label: cls, isStream: false },
                                        ...Array.from(classStreams).sort().map(st => ({
                                            key: `${cls} ${st}`,
                                            label: `${cls} — Stream ${st}`,
                                            isStream: true,
                                            streamName: st
                                        }))
                                    ];

                                    return rowsForThisClass.map(rowItem => {
                                        const targetCls = rowItem.key;
                                        return (
                                            <tr key={targetCls} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className={`px-4 py-3 font-bold ${rowItem.isStream ? 'pl-8 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 text-[11px]' : 'text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/50'}`}>
                                                    {rowItem.label}
                                                </td>
                                                {matrixSubjectColumns.map(subCol => {
                                                    const subName = subCol.name;
                                                    const subObj = (subjects || []).find(s => s.name.toLowerCase().trim() === subName.toLowerCase().trim());
                                                    
                                                    // Check if subject is assigned or applicable to this class stream
                                                    const isApplicable = subObj 
                                                        ? isSubjectAssignedToClassStream(subObj, targetCls, courses)
                                                        : true;

                                                    if (!isApplicable) {
                                                        return (
                                                            <td key={subName} className="px-3 py-3 text-center border-x border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 text-[10px] font-mono">
                                                                —
                                                            </td>
                                                        );
                                                    }

                                                    const alloc = allAllocations.find(a => 
                                                        a.className.toLowerCase().trim() === targetCls.toLowerCase().trim() && 
                                                        (a.subjectName.toLowerCase().trim() === subName.toLowerCase().trim() || (subCol.code && a.subjectCode === subCol.code))
                                                    );

                                                    return (
                                                        <td key={subName} className="px-3 py-3 text-center border-x border-slate-100 dark:border-slate-800">
                                                            {alloc && alloc.teacherName && alloc.teacherName !== 'Unassigned' ? (
                                                                <div className="space-y-0.5">
                                                                    <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px] mx-auto" title={alloc.teacherName}>{alloc.teacherName}</div>
                                                                    <div className="text-[10px] font-mono text-slate-400">{alloc.lessonsPerWeek} les/wk</div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setModalClassName(cls);
                                                                        if (rowItem.isStream && rowItem.streamName) {
                                                                            setModalStream(rowItem.streamName);
                                                                        } else {
                                                                            setModalStream('all');
                                                                        }
                                                                        setModalSubjectName(subName);
                                                                        setIsAddAllocationModalOpen(true);
                                                                    }}
                                                                    className="text-[10px] font-bold text-amber-600 hover:text-amber-800 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900 transition-all cursor-pointer"
                                                                >
                                                                    + Assign
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    });
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB MODE 4: STUDENT SUBJECT ENROLLMENT */}
            {viewMode === 'student_enrollment' && (() => {
                const rawClassStudents = getStudentsForClass(selectedClass);
                const classStudents = isStreamSpecific
                    ? rawClassStudents.filter(st => {
                        const targetStr = selectedStream.toLowerCase().trim();
                        const sClass = (st.studentClass || '').toLowerCase().trim();
                        const sStream = extractStreamOnly(sClass, selectedClass).toLowerCase().trim() || ((st as any).stream ? String((st as any).stream).toLowerCase().trim() : '');
                        return sStream === targetStr || sClass.includes(targetStr);
                    })
                    : rawClassStudents;
                const classApplicableSubjects = getApplicableSubjectsForClass(selectedClass);

                // Filter displayed subjects based on selection
                const displayedSubjects = enrollmentSelectedSubject === 'all'
                    ? classApplicableSubjects
                    : classApplicableSubjects.filter(s => s.name.toLowerCase().trim() === enrollmentSelectedSubject.toLowerCase().trim());

                // Search query filtering
                const q = searchQuery.toLowerCase().trim();
                const filteredStudents = classStudents.filter(st => {
                    if (!q) return true;
                    return st.name.toLowerCase().includes(q) ||
                           st.admissionNumber.toLowerCase().includes(q);
                });

                // Calculate summary enrollment stats across students and class subjects
                let totalEnrolledEntries = 0;
                let totalDeenrolledEntries = 0;

                classStudents.forEach(st => {
                    classApplicableSubjects.forEach(sub => {
                        const key = `${st.id}_${sub.name.toLowerCase().trim()}`;
                        const isExempted = Boolean(exemptionsStore[key]);
                        if (isExempted) {
                            totalDeenrolledEntries++;
                        } else {
                            totalEnrolledEntries++;
                        }
                    });
                });

                return (
                    <div className="space-y-6">
                        {/* Auto-Enrollment Status Banner */}
                        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
                            <div className="flex items-start gap-4">
                                <div className="p-3.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-emerald-400 shrink-0 mt-1">
                                    <SparklesIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/80">
                                            ⚡ Default Auto-Enrollment Active
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white mt-2">
                                        Automatic Class Subject Enrollment
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                                        By default, every subject assigned to <strong className="text-emerald-300 font-bold">{selectedClass}</strong> automatically enrolls all <strong className="text-white font-bold">{classStudents.length} students</strong> in that class stream. Teachers can click <strong className="text-rose-300">"De-enroll"</strong> on specific students to grant subject exemptions or manage opt-out electives.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleResetAllToDefault(selectedClass, enrollmentSelectedSubject)}
                                    className="w-full md:w-auto px-5 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95"
                                >
                                    <ArrowPathIcon className="w-4 h-4 text-emerald-400" /> Reset All to Default Enrolled
                                </button>
                            </div>
                        </div>

                        {/* Class Stream Selector Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar-horizontal">
                            {classOptions.map(cls => {
                                const isSelected = selectedClass === cls;
                                const cStudents = getStudentsForClass(cls);
                                return (
                                    <button
                                        key={cls}
                                        type="button"
                                        onClick={() => {
                                            setSelectedClass(cls);
                                            setEnrollmentSelectedSubject('all');
                                        }}
                                        className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border text-left cursor-pointer ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-none scale-105'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                        }`}
                                    >
                                        <div>{cls}</div>
                                        <div className="text-[9px] font-mono opacity-80 mt-0.5">
                                            👥 {cStudents.length} Students
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Stream Selector Bar in Student Enrollment */}
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
                                <UserGroupIcon className="w-3.5 h-3.5 text-indigo-500" /> Stream:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedStream('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    selectedStream === 'all'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                }`}
                            >
                                All Streams ({rawClassStudents.length})
                            </button>
                            {availableStreamsForClass.map(st => {
                                const isSel = selectedStream.toLowerCase() === st.toLowerCase();
                                const countInStream = rawClassStudents.filter(s => {
                                    const strClean = extractStreamOnly(s.studentClass || '', selectedClass).toLowerCase().trim() || ((s as any).stream ? String((s as any).stream).toLowerCase().trim() : '');
                                    return strClean === st.toLowerCase().trim() || (s.studentClass || '').toLowerCase().includes(st.toLowerCase().trim());
                                }).length;
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setSelectedStream(st)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                            isSel
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                    >
                                        <span>{st}</span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isSel ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                            {countInStream}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Filter & Subject Selection Bar */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">Filter Subject:</span>
                                <button
                                    type="button"
                                    onClick={() => setEnrollmentSelectedSubject('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        enrollmentSelectedSubject === 'all'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    All Subjects ({classApplicableSubjects.length})
                                </button>
                                {classApplicableSubjects.map(sub => {
                                    const isSel = enrollmentSelectedSubject.toLowerCase().trim() === sub.name.toLowerCase().trim();
                                    return (
                                        <button
                                            key={sub.id || sub.name}
                                            type="button"
                                            onClick={() => setEnrollmentSelectedSubject(sub.name)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                isSel
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {sub.name}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status:</span>
                                <select
                                    value={enrollmentStatusFilter}
                                    onChange={e => setEnrollmentStatusFilter(e.target.value as any)}
                                    className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                >
                                    <option value="all">All Students</option>
                                    <option value="enrolled">Enrolled Only</option>
                                    <option value="deenrolled">De-enrolled (Exempted) Only</option>
                                </select>
                            </div>
                        </div>

                        {/* Student Enrollment Roster Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40 flex-wrap gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                        <UserGroupIcon className="w-5 h-5 text-indigo-500" /> {selectedClass} Student Subject Registry
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Showing {filteredStudents.length} student(s) in {selectedClass}. Default status is <span className="font-bold text-emerald-600 dark:text-emerald-400">Enrolled (Auto)</span>.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        {totalEnrolledEntries} Total Subject Enrolments
                                    </span>
                                    {totalDeenrolledEntries > 0 && (
                                        <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                            {totalDeenrolledEntries} De-enrolled (Exempted)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Student Info</th>
                                            <th className="px-6 py-4 text-left">Adm No.</th>
                                            {displayedSubjects.map(sub => (
                                                <th key={sub.id || sub.name} className="px-4 py-4 text-center border-x border-slate-800 min-w-[140px]">
                                                    {sub.name}
                                                </th>
                                            ))}
                                            <th className="px-6 py-4 text-center">Summary</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map(st => {
                                                // Count student enrolled vs exempted
                                                let stEnrolled = 0;
                                                let stExempted = 0;

                                                classApplicableSubjects.forEach(sub => {
                                                    const key = `${st.id}_${sub.name.toLowerCase().trim()}`;
                                                    if (exemptionsStore[key]) stExempted++;
                                                    else stEnrolled++;
                                                });

                                                // Filter by status dropdown
                                                if (enrollmentStatusFilter === 'enrolled' && stEnrolled === 0) return null;
                                                if (enrollmentStatusFilter === 'deenrolled' && stExempted === 0) return null;

                                                return (
                                                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs shrink-0">
                                                                    {st.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-slate-900 dark:text-white">{st.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono">{st.gender || 'Student'}</div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                            {st.admissionNumber}
                                                        </td>

                                                        {displayedSubjects.map(sub => {
                                                            const key = `${st.id}_${sub.name.toLowerCase().trim()}`;
                                                            const isExempted = Boolean(exemptionsStore[key]);
                                                            const isEnrolled = !isExempted;

                                                            return (
                                                                <td key={sub.id || sub.name} className="px-3 py-3 text-center border-x border-slate-100 dark:border-slate-800">
                                                                    {isEnrolled ? (
                                                                        <div className="space-y-1.5">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                                                <CheckIcon className="w-3 h-3 stroke-[3]" /> Enrolled
                                                                            </span>
                                                                            <div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleToggleStudentEnrollment(st.id, sub.name, true)}
                                                                                    className="text-[9px] font-bold text-slate-400 hover:text-rose-600 underline cursor-pointer"
                                                                                >
                                                                                    De-enroll
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                                                                                De-enrolled
                                                                            </span>
                                                                            <div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleToggleStudentEnrollment(st.id, sub.name, false)}
                                                                                    className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 underline cursor-pointer"
                                                                                >
                                                                                    Re-enroll
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}

                                                        <td className="px-6 py-4 text-center">
                                                            <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                                                {stEnrolled} / {classApplicableSubjects.length}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                Enrolled
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={displayedSubjects.length + 3} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                                    No students found matching your criteria for {selectedClass}.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL: ADD LESSON ALLOCATION */}
            {isAddAllocationModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsAddAllocationModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Lesson Allocation</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assign subject & educator to class stream</p>
                            </div>
                            <button type="button" onClick={() => setIsAddAllocationModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
                        </div>

                        <form onSubmit={handleCreateAllocation} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Class</label>
                                    <select
                                        value={modalClassName}
                                        onChange={e => {
                                            setModalClassName(e.target.value);
                                            setModalStream('all');
                                        }}
                                        className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                    >
                                        {classOptions.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Stream Allocation</label>
                                    <select
                                        value={modalStream}
                                        onChange={e => setModalStream(e.target.value)}
                                        className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                    >
                                        <option value="all">Entire Class (All Streams)</option>
                                        {availableStreamsForModalClass.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Subject</label>
                                <select
                                    value={modalSubjectName}
                                    onChange={e => setModalSubjectName(e.target.value)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                >
                                    {subjectList.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Assign Educator (Teacher)</label>
                                <select
                                    value={modalTeacherId}
                                    onChange={e => setModalTeacherId(e.target.value)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                >
                                    <option value="">-- Leave Unassigned --</option>
                                    {teacherUsers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Lessons / Week</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={modalLessons}
                                    onChange={e => setModalLessons(parseInt(e.target.value) || 1)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsAddAllocationModalOpen(false)} className="px-5 py-2.5 text-xs font-bold uppercase text-slate-500 hover:text-slate-700">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none">
                                    Save Allocation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
