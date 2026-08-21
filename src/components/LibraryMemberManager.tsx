
import React, { useState, useEffect, useMemo } from 'react';
import type { User, LibraryTransaction, LibraryFine, Book, Institution, CompanyDetails, Course } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { UserIcon } from './icons/UserIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { FilterIcon } from './icons/FilterIcon';
import { CalendarDaysIcon as CalendarIcon } from './icons/CalendarDaysIcon';
import { apiService } from '../services/apiService';
import { generateMemberLibraryHistoryPdf } from '../services/pdfService';
import { PdfPreviewModal } from './PdfPreviewModal';

interface LibraryMemberManagerProps {
    institutionId: string;
    institution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    courses?: Course[];
    onLogAction: (action: string) => Promise<void>;
}

export const LibraryMemberManager: React.FC<LibraryMemberManagerProps> = ({
    institutionId,
    institution,
    companyDetails,
    users,
    courses = [],
    onLogAction
}) => {
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [fines, setFines] = useState<LibraryFine[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<User | null>(null);

    // Filtering states for the selected member
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'overdue' | 'returned'>('all');

    // PDF Preview state
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'students' | 'staff'>('students');

    const [liveUsers, setLiveUsers] = useState<User[]>(users || []);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [classFilter, setClassFilter] = useState('all');
    const [streamFilter, setStreamFilter] = useState('all');

    useEffect(() => {
        if (users && users.length > 0) {
            setLiveUsers(prev => {
                const map = new Map<string, User>();
                users.forEach(u => map.set(u.id, u));
                prev.forEach(u => { if (!map.has(u.id)) map.set(u.id, u); });
                return Array.from(map.values());
            });
        }
    }, [users]);

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [transData, finesData, booksData, enrollmentsData, remoteUsersData] = await Promise.all([
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institutionId),
                apiService.fetchModuleRecords<LibraryFine>('library_fines', institutionId),
                apiService.fetchModuleRecords<Book>('books', institutionId),
                apiService.fetchModuleRecords<any>('student_enrollments', institutionId).catch(() => []),
                apiService.fetchModuleRecords<User>('users', institutionId).catch(() => [])
            ]);

            // Merge users from all sources
            let allUsersList: User[] = [...(remoteUsersData || []), ...(users || [])];
            try {
                const cachedUsers = localStorage.getItem(`eduai_users_${institutionId}`);
                if (cachedUsers) {
                    const parsed = JSON.parse(cachedUsers);
                    if (Array.isArray(parsed)) allUsersList.push(...parsed);
                }
            } catch (e) {}

            const userMap = new Map<string, User>();
            allUsersList.forEach(u => {
                if (u && u.id) userMap.set(u.id, u);
            });
            setLiveUsers(Array.from(userMap.values()));

            const targetType = ((institution?.institutionType as string) === 'driving_school' || (institution as any)?.category === 'driving_school') ? 'driving_school' : 'academic';

            // Filter enrollments to institution & enrollment type
            let allEnr = (enrollmentsData || []).filter(e => {
                const matchesInst = !e.institutionId || e.institutionId === institutionId;
                const matchesType = !e.enrollmentType || e.enrollmentType === targetType;
                return matchesInst && matchesType;
            });

            try {
                const cached = localStorage.getItem(`eduai_student_enrollments_${institutionId}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                        const seenIds = new Set(allEnr.map((e: any) => e.id || e.userId || e.student_id || e.admissionNumber));
                        parsed.forEach((p: any) => {
                            const pId = p.id || p.userId || p.student_id || p.admissionNumber;
                            const matchesType = !p.enrollmentType || p.enrollmentType === targetType;
                            if (pId && !seenIds.has(pId) && matchesType) {
                                seenIds.add(pId);
                                allEnr.push(p);
                            }
                        });
                    }
                }
            } catch (e) {}

            // Deduplicate enrollments by student admission number or userId to match Enrollment Manager registry
            const dedupedEnrollments = new Map<string, any>();
            allEnr.forEach(e => {
                const admKey = (e.admissionNumber || e.admission_number || e.admNo || e.metadata?.admissionNumber || e.metadata?.studentAdmNo || '').toString().trim().toLowerCase();
                const userKey = (e.userId || e.user_id || e.student_id || '').toString().trim().toLowerCase();
                const key = admKey || userKey || (e.id || '').toString().trim().toLowerCase();
                
                if (!dedupedEnrollments.has(key)) {
                    dedupedEnrollments.set(key, e);
                } else {
                    const existing = dedupedEnrollments.get(key);
                    if ((e.status === 'Active' || e.status === 'Enrolled') && existing.status !== 'Active') {
                        dedupedEnrollments.set(key, e);
                    }
                }
            });

            setTransactions(transData);
            setFines(finesData);
            setBooks(booksData);
            setEnrollments(Array.from(dedupedEnrollments.values()));
        } catch (error) {
            console.error('Error loading member management data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to normalize strings for comparison
    const norm = (s: any) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

    const extractStudentName = (item: any): string => {
        if (!item) return '';
        if (typeof item === 'string') {
            const clean = item.trim();
            if (clean && !clean.toLowerCase().includes('student name') && !clean.toLowerCase().includes('student member') && !clean.toLowerCase().includes('unknown user') && !clean.toLowerCase().startsWith('learner ')) return clean;
            return '';
        }

        const isGood = (n: any) => {
            if (!n || typeof n !== 'string') return false;
            const clean = n.trim().toLowerCase();
            return clean.length > 0 && 
                   clean !== 'student name' &&
                   clean !== 'unknown student' &&
                   clean !== 'student member' && 
                   clean !== 'unknown user' && 
                   clean !== 'unknown resource' && 
                   clean !== 'unknown' &&
                   clean !== 'student' &&
                   clean !== 'null' &&
                   clean !== 'undefined' &&
                   !clean.startsWith('learner ') && 
                   !clean.startsWith('adm-') && 
                   !clean.startsWith('enr_') && 
                   !clean.startsWith('usr_');
        };

        if (isGood(item.fullName)) return item.fullName.trim();
        if (isGood(item.name)) return item.name.trim();
        if (isGood(item.studentName)) return item.studentName.trim();
        if (isGood(item.student_name)) return item.student_name.trim();
        if (isGood(item.learnerName)) return item.learnerName.trim();
        if (isGood(item.userName)) return item.userName.trim();
        if (isGood(item.borrowerName)) return item.borrowerName.trim();
        if (isGood(item.recipientName)) return item.recipientName.trim();
        if (isGood(item.memberName)) return item.memberName.trim();

        // Check firstName + lastName
        const first = item.firstName || item.first_name || '';
        const middle = item.middleName || item.middle_name || '';
        const last = item.lastName || item.last_name || item.surname || '';
        const combined = `${first} ${middle} ${last}`.trim().replace(/\s+/g, ' ');
        if (isGood(combined)) return combined;

        // Check metadata
        if (item.metadata && typeof item.metadata === 'object') {
            const m = item.metadata;
            if (isGood(m.studentName)) return m.studentName.trim();
            if (isGood(m.fullName)) return m.fullName.trim();
            if (isGood(m.name)) return m.name.trim();
            if (isGood(m.student_name)) return m.student_name.trim();
            if (isGood(m.learnerName)) return m.learnerName.trim();

            const mComb = `${m.firstName || m.first_name || ''} ${m.middleName || m.middle_name || ''} ${m.lastName || m.last_name || m.surname || ''}`.trim().replace(/\s+/g, ' ');
            if (isGood(mComb)) return mComb;

            // Check parent / guardian names (registered under student enrollment)
            if (isGood(m.parentName)) return m.parentName.trim();
            if (isGood(m.guardianName)) return m.guardianName.trim();
            if (isGood(m.guardian1Name)) return m.guardian1Name.trim();
            if (isGood(m.parent1Name)) return m.parent1Name.trim();
            if (Array.isArray(m.parents) && isGood(m.parents[0]?.name)) {
                return m.parents[0].name.trim();
            }
        }

        // Check personalInfo
        if (item.personalInfo && typeof item.personalInfo === 'object') {
            const pi = item.personalInfo;
            if (isGood(pi.fullName)) return pi.fullName.trim();
            if (isGood(pi.name)) return pi.name.trim();
            if (isGood(pi.studentName)) return pi.studentName.trim();
            const piComb = `${pi.firstName || pi.first_name || ''} ${pi.lastName || pi.last_name || ''}`.trim().replace(/\s+/g, ' ');
            if (isGood(piComb)) return piComb;
        }

        // Check nested user or student
        if (item.user && typeof item.user === 'object') {
            const uName = extractStudentName(item.user);
            if (isGood(uName)) return uName;
        }
        if (item.student && typeof item.student === 'object') {
            const sName = extractStudentName(item.student);
            if (isGood(sName)) return sName;
        }

        return '';
    };

    // Resolved list of all student users mapped with enrollment & course/stream metadata
    const studentUserList = useMemo(() => {
        const userMapById = new Map<string, User>();
        const userMapByAdm = new Map<string, User>();
        const userMapByNormAdm = new Map<string, User>();

        const normAdm = (a: any) => String(a || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        (liveUsers || []).forEach(u => {
            if (u.id) userMapById.set(u.id.toLowerCase(), u);
            const adm = u.admissionNumber || (u as any).admission_number || (u as any).admNo || (u as any).metadata?.admissionNumber || (u as any).metadata?.studentAdmNo;
            if (adm) {
                userMapByAdm.set(String(adm).trim().toLowerCase(), u);
                userMapByNormAdm.set(normAdm(adm), u);
            }
        });

        // Map borrower names from transactions
        const transNameByAdm = new Map<string, string>();
        const transNameByUserId = new Map<string, string>();
        transactions.forEach((t: any) => {
            const tName = extractStudentName(t.userName || t.studentName || t.borrowerName || t.recipientName);
            if (tName) {
                const adm = (t.studentAdmNo || t.admissionNumber || '').toString().trim().toLowerCase();
                if (adm) {
                    transNameByAdm.set(adm, tName);
                    transNameByAdm.set(normAdm(adm), tName);
                }
                if (t.userId) transNameByUserId.set(t.userId.toLowerCase(), tName);
            }
        });

        // Map strictly from deduplicated enrollments matching Student Enrollment Manager
        return enrollments.map((e, idx) => {
            const eUserId = (e.userId || e.user_id || e.student_id || '').toLowerCase();
            const eAdm = (e.admissionNumber || e.admission_number || e.admNo || e.metadata?.admissionNumber || e.metadata?.studentAdmNo || '').toString().trim().toLowerCase();
            const eNormAdm = normAdm(eAdm);

            // Find matched user in users table
            const matchedUser = (eUserId && userMapById.get(eUserId)) || 
                                (eAdm && userMapByAdm.get(eAdm)) || 
                                (eNormAdm && userMapByNormAdm.get(eNormAdm)) ||
                                (e.id && userMapById.get(e.id.toLowerCase()));

            // Extract real name
            let candidateName = extractStudentName(matchedUser);
            if (!candidateName) candidateName = extractStudentName(e);
            if (!candidateName && eAdm) candidateName = transNameByAdm.get(eAdm) || transNameByAdm.get(eNormAdm) || '';
            if (!candidateName && eUserId) candidateName = transNameByUserId.get(eUserId) || '';

            if (!candidateName && matchedUser?.name && !matchedUser.name.toLowerCase().includes('student name')) {
                candidateName = matchedUser.name;
            }
            if (!candidateName && e.fullName && !e.fullName.toLowerCase().includes('student name')) {
                candidateName = e.fullName;
            }
            if (!candidateName && e.name && !e.name.toLowerCase().includes('student name')) {
                candidateName = e.name;
            }

            let adm = e.admissionNumber || 
                      e.admission_number || 
                      e.admNo || 
                      e.metadata?.admissionNumber || 
                      e.metadata?.admNo || 
                      e.metadata?.studentAdmNo || 
                      matchedUser?.admissionNumber || 
                      (matchedUser as any)?.admission_number || 
                      `ADM-${(e.id || '').replace(/^enr_/, '').slice(-4).toUpperCase()}`;

            let finalName = candidateName || String(adm).toUpperCase();

            const userCourse = courses.find(c => c.id === e.courseId || c.id === matchedUser?.courseId);
            const userLevel = userCourse?.levels?.find((l: any) => l.id === e.courseLevelId || l.id === matchedUser?.courseLevelId);

            const gradeLevel = (
                e.metadata?.gradeLevel || 
                e.gradeLevel || 
                e.classLevel || 
                (e as any)?.studentClass || 
                matchedUser?.studentClass || 
                (matchedUser as any)?.classLevel || 
                (matchedUser as any)?.class_name || 
                matchedUser?.metadata?.gradeLevel || 
                userCourse?.name || 
                ''
            ).toString().trim();

            const stream = (
                e.metadata?.stream || 
                e.stream || 
                e.streamName || 
                (matchedUser as any)?.stream || 
                (matchedUser as any)?.streamName || 
                (matchedUser as any)?.stream_name || 
                matchedUser?.metadata?.stream || 
                userLevel?.name || 
                ''
            ).toString().trim();

            return {
                ...(matchedUser || {}),
                id: e.userId || e.user_id || e.student_id || e.id,
                name: finalName,
                email: matchedUser?.email || e.email || `student_${e.id}@eduai.local`,
                role: 'student' as const,
                institutionId: institutionId,
                createdAt: matchedUser?.createdAt || e.createdAt || new Date().toISOString(),
                admissionNumber: String(adm),
                admission_number: String(adm),
                gradeLevel,
                stream,
                metadata: { ...(matchedUser?.metadata || {}), ...(e.metadata || {}) }
            } as User & { admissionNumber: string; gradeLevel: string; stream: string };
        });
    }, [liveUsers, enrollments, courses, institutionId]);

    const classOptions = useMemo(() => {
        const rawGrades: string[] = [];

        // 1. From courses
        courses.forEach(c => {
            if (c.name && c.name.trim()) rawGrades.push(c.name.trim());
        });

        // 2. From resolved student users
        studentUserList.forEach(s => {
            if (s.gradeLevel && s.gradeLevel.trim()) rawGrades.push(s.gradeLevel.trim());
        });

        // 3. From enrollments
        enrollments.forEach(e => {
            const g = e.metadata?.gradeLevel || e.gradeLevel || e.classLevel || '';
            if (g && g.trim()) rawGrades.push(g.trim());
        });

        // 4. From institution classes
        const instClasses = (institution as any)?.classes || (institution as any)?.courses;
        if (Array.isArray(instClasses)) {
            instClasses.forEach((c: any) => {
                const name = typeof c === 'string' ? c : (c.name || c.title);
                if (name && name.trim()) rawGrades.push(name.trim());
            });
        }

        const seen = new Map<string, string>();
        rawGrades.forEach(g => {
            const key = g.toLowerCase();
            if (!seen.has(key)) seen.set(key, g);
        });

        if (seen.size === 0) {
            return ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
        }

        return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [courses, studentUserList, enrollments, institution]);

    const streamOptions = useMemo(() => {
        const rawStreams: string[] = [];

        if (classFilter !== 'all') {
            const matchedCourse = courses.find(c => c.name.trim().toLowerCase() === classFilter.trim().toLowerCase());
            if (matchedCourse?.levels && matchedCourse.levels.length > 0) {
                matchedCourse.levels.forEach((l: any) => {
                    if (l.name && l.name.trim()) rawStreams.push(l.name.trim());
                });
            }
            studentUserList.filter(s => s.gradeLevel.trim().toLowerCase() === classFilter.trim().toLowerCase()).forEach(s => {
                if (s.stream && s.stream.trim()) rawStreams.push(s.stream.trim());
            });
            enrollments.filter(e => {
                const g = (e.metadata?.gradeLevel || e.gradeLevel || e.classLevel || '').trim().toLowerCase();
                return g === classFilter.trim().toLowerCase();
            }).forEach(e => {
                const st = e.metadata?.stream || e.stream || e.streamName || '';
                if (st && st.trim()) rawStreams.push(st.trim());
            });
        } else {
            courses.flatMap(c => c.levels || []).forEach(l => {
                if (l.name && l.name.trim()) rawStreams.push(l.name.trim());
            });
            studentUserList.forEach(s => {
                if (s.stream && s.stream.trim()) rawStreams.push(s.stream.trim());
            });
            enrollments.forEach(e => {
                const st = e.metadata?.stream || e.stream || e.streamName || '';
                if (st && st.trim()) rawStreams.push(st.trim());
            });
        }

        if (institution?.streamDefinitions && institution.streamDefinitions.length > 0) {
            institution.streamDefinitions.forEach(sd => {
                if (sd && sd.trim()) rawStreams.push(sd.trim());
            });
        }

        const seen = new Map<string, string>();
        rawStreams.forEach(s => {
            const key = s.toLowerCase();
            if (!seen.has(key)) seen.set(key, s);
        });

        if (seen.size === 0) {
            return ['East', 'West', 'North', 'South', 'Central', 'Main Stream'];
        }

        return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [classFilter, courses, studentUserList, enrollments, institution]);

    const groupedMembers = useMemo(() => {
        const eligibleStaff = users.filter(u => u.role !== 'super_admin' && u.role !== 'student');
        const eligibleUsers = [...eligibleStaff, ...studentUserList];

        const processed = eligibleUsers.map(user => {
            const userTrans = transactions.filter(t => t.userId === user.id);
            const userFines = fines.filter(f => f.userId === user.id);

            return {
                ...user,
                activeLoans: userTrans.filter(t => t.status === 'issued' || t.status === 'overdue').length,
                overdueCount: userTrans.filter(t => t.status === 'overdue').length,
                totalFines: userFines.reduce((acc, f) => acc + (f.amount - f.paidAmount), 0)
            };
        }).filter(u => {
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            const adm = (u.admissionNumber || (u as any).admission_number || u.staffId || '').toLowerCase();
            const sClass = ((u as any).gradeLevel || '').toLowerCase();
            const sStream = ((u as any).stream || '').toLowerCase();
            return u.name.toLowerCase().includes(term) ||
                   adm.includes(term) ||
                   (u.staffId && u.staffId.toLowerCase().includes(term)) ||
                   sClass.includes(term) ||
                   sStream.includes(term);
        });

        const filteredStudents = processed.filter(u => u.role === 'student').filter(s => {
            const sGrade = ((s as any).gradeLevel || '').trim().toLowerCase();
            const sStream = ((s as any).stream || '').trim().toLowerCase();
            const matchesClass = classFilter === 'all' || sGrade === classFilter.trim().toLowerCase();
            const matchesStream = streamFilter === 'all' || sStream === streamFilter.trim().toLowerCase();
            return matchesClass && matchesStream;
        });

        return {
            staff: processed.filter(u => u.role !== 'student'),
            students: filteredStudents
        };
    }, [users, studentUserList, transactions, fines, searchTerm, classFilter, streamFilter]);

    const handleClearFine = async (fine: LibraryFine) => {
        if (!confirm(`Confirm full payment of KES ${fine.amount - fine.paidAmount}?`)) return;

        try {
            await apiService.saveModuleRecord('library_fines', {
                ...fine,
                paidAmount: fine.amount,
                status: 'paid',
                updatedAt: new Date().toISOString()
            });
            await onLogAction(`Cleared fine for user ${fine.userId}`);
            loadData();
        } catch (error) {
            alert('Failed to clear fine.');
        }
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';

    const handlePreviewPdf = async () => {
        if (!selectedMember) return;
        setGeneratingPdf(true);
        try {
            const memberTrans = transactions.filter(t => t.userId === selectedMember.id);
            const memberFines = fines.filter(f => f.userId === selectedMember.id);

            // Apply current filters for the PDF as well
            const filteredTrans = memberTrans.filter(t => {
                const transDate = new Date(t.issueDate);
                const isAfterStart = !startDate || transDate >= new Date(startDate);
                const isBeforeEnd = !endDate || transDate <= new Date(endDate);
                const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
                return isAfterStart && isBeforeEnd && matchesStatus;
            });

            const dataUri = await generateMemberLibraryHistoryPdf(
                selectedMember,
                filteredTrans,
                memberFines,
                getBookTitle,
                institution,
                companyDetails,
                institution.logoUrl || null,
                null // Footer image if available
            );
            setPreviewUrl(dataUri);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF statement.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const renderMemberRow = (member: any) => (
        <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors cursor-pointer group"
            onClick={() => setSelectedMember(member)}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                    {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate tracking-tight">{member.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-widest">
                            {member.role === 'student' ? (member.admissionNumber || member.admission_number || 'No ADM') : (member.staffId || 'No ID')}
                        </p>
                        {member.role === 'student' && (member.gradeLevel || member.stream) && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                • {member.gradeLevel} {member.stream}
                            </p>
                        )}
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[7px] font-black text-slate-500 rounded uppercase tracking-tighter">
                            {member.role.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8 ml-4">
                <div className="text-right min-w-[60px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Loans</p>
                    <p className={`text-[10px] font-black ${member.activeLoans > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{member.activeLoans}</p>
                </div>
                <div className="text-right min-w-[60px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Overdue</p>
                    <p className={`text-[10px] font-black ${member.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{member.overdueCount}</p>
                </div>
                <div className="text-right min-w-[80px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Outstanding</p>
                    <p className={`text-[10px] font-black ${member.totalFines > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{member.totalFines > 0 ? `KES ${member.totalFines.toFixed(0)}` : '0'}</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Member Registry...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex-1 max-w-xl relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Members by Name or Registration ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black uppercase tracking-tight transition-all"
                    />
                </div>
                <div className="flex gap-4 px-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{groupedMembers.staff.length + groupedMembers.students.length}</span>
                    </div>
                </div>
            </div>

            {/* Subtabs for Students and Support Staff */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 w-fit shadow-inner">
                    <button
                        onClick={() => setActiveSubTab('students')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'students' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md border border-slate-200/50 dark:border-slate-700/50 scale-105' : 'text-slate-400 hover:text-indigo-500'}`}
                    >
                        Students
                    </button>
                    <button
                        onClick={() => setActiveSubTab('staff')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'staff' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md border border-slate-200/50 dark:border-slate-700/50 scale-105' : 'text-slate-400 hover:text-indigo-500'}`}
                    >
                        Support Staff
                    </button>
                </div>

                {activeSubTab === 'students' && (
                    <div className="flex gap-3 flex-wrap">
                        <select
                            value={classFilter}
                            onChange={e => setClassFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-sm outline-none min-w-[140px] text-slate-700 dark:text-slate-200"
                        >
                            <option value="all">All Classes</option>
                            {classOptions.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={streamFilter}
                            onChange={e => setStreamFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-sm outline-none min-w-[120px] text-slate-700 dark:text-slate-200"
                        >
                            <option value="all">All Streams</option>
                            {streamOptions.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Members List Sections */}
            <div className="space-y-10">
                {/* Staff Section */}
                {activeSubTab === 'staff' && (
                    groupedMembers.staff.length > 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Support Staff</h3>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{groupedMembers.staff.length} Active Profiles</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {groupedMembers.staff.map(renderMemberRow)}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No staff members found matching your search</p>
                        </div>
                    )
                )}

                {/* Students Section */}
                {activeSubTab === 'students' && (
                    groupedMembers.students.length > 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Students</h3>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{groupedMembers.students.length} Active Records</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {groupedMembers.students.map(renderMemberRow)}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No students found matching your search</p>
                        </div>
                    )
                )}
            </div>

            {/* Member Side Profile Detail Drawer/Overlay */}
            {selectedMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedMember(null)}>
                    <div
                        className="bg-white dark:bg-slate-800 w-full max-w-2xl h-full rounded-[3rem] shadow-2xl border-l border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col animate-slide-left"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center font-black text-3xl">
                                    {selectedMember.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedMember.name}</h3>
                                    <p className="text-sm font-bold text-indigo-100 uppercase tracking-widest mt-2">
                                        Member Reference: {selectedMember.role === 'student' ? (selectedMember.admissionNumber || selectedMember.admission_number || 'N/A') : (selectedMember.staffId || 'N/A')}
                                        {selectedMember.role === 'student' && ((selectedMember as any).gradeLevel || (selectedMember as any).stream) ? ` • ${(selectedMember as any).gradeLevel} ${(selectedMember as any).stream}` : ''}
                                    </p>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">{selectedMember.role.replace('_', ' ')} Registry</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="p-3 bg-white/10 hover:bg-white/30 rounded-2xl transition-all relative z-10">
                                <XIcon className="w-6 h-6" />
                            </button>
                            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                                <UserIcon className="w-48 h-48" />
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <BookOpenIcon className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lifetime Borrowed</span>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        {transactions.filter(t => t.userId === selectedMember.id).length} Books
                                    </p>
                                </div>
                                <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <CurrencyIcon className="w-4 h-4 text-rose-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Total Indebtedness</span>
                                    </div>
                                    <p className="text-2xl font-black text-rose-600">
                                        KES {fines.filter(f => f.userId === selectedMember.id && f.status !== 'paid').reduce((acc, f) => acc + (f.amount - f.paidAmount), 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Filtering and PDF Actions */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <FilterIcon className="w-3.5 h-3.5" />
                                        Statement Control Center
                                    </h4>
                                    <button
                                        onClick={handlePreviewPdf}
                                        disabled={generatingPdf}
                                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                                    >
                                        {generatingPdf ? (
                                            <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <PrinterIcon className="w-3 h-3" />
                                        )}
                                        {generatingPdf ? 'Generating...' : 'Preview PDF Statement'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">From Date</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl text-[10px] font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">To Date</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl text-[10px] font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Circulation Status</label>
                                        <div className="relative">
                                            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-xl text-[10px] font-bold outline-none appearance-none transition-all"
                                            >
                                                <option value="all">Every Transaction</option>
                                                <option value="issued">Currently Out</option>
                                                <option value="overdue">Overdue Items</option>
                                                <option value="returned">Successfully Returned</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Active Transactions */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    Filtered Circulation History
                                </h4>
                                <div className="space-y-3">
                                    {transactions
                                        .filter(t => t.userId === selectedMember.id)
                                        .filter(t => {
                                            const transDate = new Date(t.issueDate);
                                            const isAfterStart = !startDate || transDate >= new Date(startDate);
                                            const isBeforeEnd = !endDate || transDate <= new Date(endDate);
                                            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
                                            return isAfterStart && isBeforeEnd && matchesStatus;
                                        })
                                        .map((t, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-indigo-500/50 transition-all shadow-sm">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-indigo-600">
                                                        <BookOpenIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{getBookTitle(t.bookId)}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Issued: {new Date(t.issueDate).toLocaleDateString()}</p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">•</p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full tracking-widest ${t.status === 'overdue' ? 'bg-rose-50 text-rose-600 animate-pulse' : t.status === 'returned' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                        ))}
                                    {transactions
                                        .filter(t => t.userId === selectedMember.id)
                                        .filter(t => {
                                            const transDate = new Date(t.issueDate);
                                            const isAfterStart = !startDate || transDate >= new Date(startDate);
                                            const isBeforeEnd = !endDate || transDate <= new Date(endDate);
                                            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
                                            return isAfterStart && isBeforeEnd && matchesStatus;
                                        }).length === 0 && (
                                            <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No Transactions Found</p>
                                                <p className="text-[9px] font-bold text-slate-300 uppercase">Adjust filters to see more results</p>
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Outstanding Fines */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                                    <CurrencyIcon className="w-3.5 h-3.5" />
                                    Outstanding Financial Liabilities
                                </h4>
                                <div className="space-y-3">
                                    {fines.filter(f => f.userId === selectedMember.id && f.status !== 'paid').map((f, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl group hover:border-emerald-500/50 transition-all shadow-sm">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600">
                                                    <CurrencyIcon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{f.description}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Total Due: <span className="text-rose-600 font-black">KES {(f.amount - f.paidAmount).toFixed(2)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleClearFine(f)}
                                                className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-100 dark:shadow-none"
                                            >
                                                Clear Full Due
                                            </button>
                                        </div>
                                    ))}
                                    {fines.filter(f => f.userId === selectedMember.id && f.status !== 'paid').length === 0 && (
                                        <div className="py-10 text-center bg-emerald-50/30 dark:bg-emerald-900/10 rounded-3xl border-2 border-dashed border-emerald-100/50 dark:border-emerald-900/30">
                                            <CheckCircleIcon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Account is Clean</p>
                                            <p className="text-[9px] font-bold text-emerald-400 uppercase">No active fines found in registry</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-8 border-t border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                            <button onClick={() => setSelectedMember(null)} className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 transition-all">Close Profile View</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {previewUrl && (
                <PdfPreviewModal
                    url={previewUrl}
                    onClose={() => setPreviewUrl(null)}
                    filename={`Library_Statement_${selectedMember?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`}
                />
            )}

            <style>{`
                @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-slide-left { animation: slide-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

