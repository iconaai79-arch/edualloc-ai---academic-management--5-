import React, { useState, useEffect, useMemo } from 'react';
import type {
    Book, LibraryTransaction, LibraryFine, User,
    Department, v_library_statistics, Course, Institution, CompanyDetails,
    BookReservation, BookStockReceipt
} from '../types';
import { BarChart3Icon } from './icons/BarChart3Icon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UserIcon } from './icons/UserIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { SearchIcon } from './icons/SearchIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { apiService } from '../services/apiService';
import { generateLibraryUnreturnedReportPdf, generateMemberLibraryHistoryPdf } from '../services/pdfService';

interface LibraryReportsProps {
    institution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    departments: Department[];
    courses: Course[];
    onLogAction: (action: string) => Promise<void>;
}

type ReportSectionId =
    | 'summary'
    | 'statements'
    | 'defaulters'
    | 'circulation'
    | 'fines'
    | 'inventory_valuation'
    | 'donations'
    | 'intelligence';

export const LibraryReports: React.FC<LibraryReportsProps> = ({
    institution,
    companyDetails,
    users,
    departments,
    courses,
    onLogAction
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [fines, setFines] = useState<LibraryFine[]>([]);
    const [reservations, setReservations] = useState<BookReservation[]>([]);
    const [stockReceipts, setStockReceipts] = useState<BookStockReceipt[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [liveUsers, setLiveUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Active Vertical Sub-Menu Tab
    const [activeReportId, setActiveReportId] = useState<ReportSectionId>('summary');

    // Patron Statements State
    const [searchUserTerm, setSearchUserTerm] = useState('');
    const [selectedStatementUser, setSelectedStatementUser] = useState<any | null>(null);
    const [isPrintingStatement, setIsPrintingStatement] = useState(false);

    // Defaulters Filter State
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');

    // Circulation Filter State
    const [circSearchTerm, setCircSearchTerm] = useState('');
    const [circStatusFilter, setCircStatusFilter] = useState<'all' | 'issued' | 'returned' | 'overdue'>('all');

    // Fines Filter State
    const [fineSearchTerm, setFineSearchTerm] = useState('');
    const [fineStatusFilter, setFineStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

    useEffect(() => {
        loadData();
    }, [institution.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, transData, finesData, resData, stockData, enrollmentsData, liveUsersData] = await Promise.all([
                apiService.fetchModuleRecords<Book>('books', institution.id),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institution.id),
                apiService.fetchModuleRecords<LibraryFine>('library_fines', institution.id),
                apiService.fetchModuleRecords<BookReservation>('book_reservations', institution.id),
                apiService.fetchModuleRecords<BookStockReceipt>('book_stock_receipts', institution.id),
                apiService.fetchModuleRecords<any>('student_enrollments', institution.id).catch(() => []),
                apiService.fetchModuleRecords<User>('users', institution.id).catch(() => [])
            ]);

            // Combine with localStorage cache
            let combinedEnrollments = [...(enrollmentsData || [])];
            try {
                const cachedEnr = localStorage.getItem('eduai_student_enrollments');
                if (cachedEnr) {
                    const parsed = JSON.parse(cachedEnr);
                    if (Array.isArray(parsed)) {
                        combinedEnrollments = [...combinedEnrollments, ...parsed];
                    }
                }
            } catch (e) { }

            // Filter targetType matching institution category
            const targetType = institution.institutionType === 'Driving School' || (institution as any).category === 'driving_school'
                ? 'driving_school'
                : 'academic';

            const filteredEnrollments = combinedEnrollments.filter(e => {
                if (e.institutionId && e.institutionId !== institution.id) return false;
                if (e.institution_id && e.institution_id !== institution.id) return false;
                const enrType = e.targetType || (e.courseCategory === 'driving_school' ? 'driving_school' : 'academic');
                return enrType === targetType;
            });

            // Deduplicate enrollments by identity
            const dedupedEnrollments = new Map<string, any>();
            filteredEnrollments.forEach(e => {
                const adm = (e.admissionNumber || e.admission_number || e.admNo || e.metadata?.admissionNumber || e.metadata?.studentAdmNo || '').toString().trim().toLowerCase();
                const uId = (e.userId || e.user_id || e.student_id || '').toString().trim().toLowerCase();
                const key = adm || uId || e.id;
                if (!dedupedEnrollments.has(key)) {
                    dedupedEnrollments.set(key, e);
                } else {
                    const existing = dedupedEnrollments.get(key);
                    if ((e.status === 'Active' || e.status === 'Enrolled') && existing.status !== 'Active') {
                        dedupedEnrollments.set(key, e);
                    }
                }
            });

            setBooks(booksData || []);
            setTransactions(transData || []);
            setFines(finesData || []);
            setReservations(resData || []);
            setStockReceipts(stockData || []);
            setEnrollments(Array.from(dedupedEnrollments.values()));
            if (liveUsersData && liveUsersData.length > 0) {
                setLiveUsers(liveUsersData);
            }
        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const norm = (s: any) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

    const extractStudentName = (item: any): string => {
        if (!item) return '';
        if (typeof item === 'string') {
            const clean = item.trim();
            if (clean && !clean.toLowerCase().includes('student member') && !clean.toLowerCase().includes('unknown user')) return clean;
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
        }

        return '';
    };

    // Unified allMembersList matching Patron Registry
    const allMembersList = useMemo(() => {
        const userMapById = new Map<string, User>();
        const userMapByAdm = new Map<string, User>();

        const pool = [...liveUsers, ...users];
        pool.forEach(u => {
            if (u.id) userMapById.set(u.id.toLowerCase(), u);
            const adm = u.admissionNumber || (u as any).admission_number || (u as any).admNo;
            if (adm) userMapByAdm.set(String(adm).trim().toLowerCase(), u);
        });

        // 1. Process all enrolled students
        const mappedStudents = enrollments.map((e) => {
            const eUserId = (e.userId || e.user_id || e.student_id || '').toLowerCase();
            const eAdm = (e.admissionNumber || e.admission_number || e.admNo || e.metadata?.admissionNumber || e.metadata?.studentAdmNo || '').toString().trim().toLowerCase();

            const matchedUser = (eUserId && userMapById.get(eUserId)) || 
                                (eAdm && userMapByAdm.get(eAdm)) || 
                                (e.id && userMapById.get(e.id.toLowerCase()));

            let candidateName = extractStudentName(matchedUser);
            if (!candidateName) candidateName = extractStudentName(e);
            if (!candidateName && matchedUser?.name && !matchedUser.name.toLowerCase().includes('student name')) {
                candidateName = matchedUser.name;
            }
            if (!candidateName && e.fullName && !e.fullName.toLowerCase().includes('student name')) {
                candidateName = e.fullName;
            }
            if (!candidateName && e.name && !e.name.toLowerCase().includes('student name')) {
                candidateName = e.name;
            }

            const cleanName = candidateName || (eAdm ? `Learner ${eAdm.toUpperCase()}` : 'Student Member');
            const cleanAdm = eAdm || matchedUser?.admissionNumber || (matchedUser as any)?.admission_number || `ADM-${e.id.slice(-4).toUpperCase()}`;

            const gradeLevel = e.class || e.grade || e.level || e.courseName || e.metadata?.class || e.metadata?.grade || '';
            const stream = e.stream || e.section || e.metadata?.stream || e.metadata?.section || '';
            const classDisplay = e.classDisplay || (gradeLevel && stream ? `${gradeLevel} - ${stream}` : gradeLevel || stream || 'General');

            return {
                id: matchedUser?.id || e.userId || e.id,
                userId: matchedUser?.id || e.userId || e.id,
                name: cleanName,
                email: matchedUser?.email || e.email || '',
                role: 'Student' as const,
                admissionNumber: cleanAdm,
                gradeLevel,
                stream,
                classDisplay,
                classStr: classDisplay,
                courseId: matchedUser?.courseId || e.courseId,
                courseLevelId: matchedUser?.courseLevelId || e.courseLevelId,
                status: e.status || 'Active'
            };
        });

        // 2. Add teachers & staff
        const mappedStaff = pool
            .filter(u => u.role !== 'student' && u.role !== 'Student')
            .map(u => {
                const sName = extractStudentName(u) || u.name || 'Staff Member';
                return {
                    id: u.id,
                    userId: u.id,
                    name: sName,
                    email: u.email || '',
                    role: u.role || 'Teacher',
                    staffId: u.staffId || (u as any).employeeNumber || `STF-${u.id.slice(-4).toUpperCase()}`,
                    gradeLevel: '',
                    stream: '',
                    classDisplay: u.role || 'Staff Member',
                    classStr: u.role || 'Staff Member',
                    status: 'Active'
                };
            });

        const combined = [...mappedStudents, ...mappedStaff];
        const deduped = new Map<string, any>();
        combined.forEach(m => {
            const admKey = m.admissionNumber ? m.admissionNumber.toLowerCase() : null;
            const idKey = m.id ? m.id.toLowerCase() : null;
            const staffKey = m.staffId ? m.staffId.toLowerCase() : null;
            const key = admKey || staffKey || idKey;
            if (key && !deduped.has(key)) {
                deduped.set(key, m);
            }
        });

        return Array.from(deduped.values());
    }, [enrollments, liveUsers, users]);

    const getUserObject = (id: string, trans?: any) => {
        if (!id && !trans) return null;
        const normId = norm(id);

        const found = allMembersList.find(m =>
            norm(m.id) === normId ||
            norm(m.userId) === normId ||
            norm(m.admissionNumber) === normId ||
            norm(m.staffId) === normId
        );
        if (found) return found;

        const transName = trans?.userName || trans?.studentName || trans?.borrowerName || trans?.recipientName;
        return {
            id,
            name: transName || 'Member Patron',
            admissionNumber: trans?.studentAdmNo || 'No ID',
            classDisplay: trans?.studentClass || '—',
            gradeLevel: '',
            stream: ''
        };
    };

    const getUserName = (id: string, trans?: any) => {
        const u = getUserObject(id, trans);
        return u?.name || 'Member Patron';
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';
    const getBookAccession = (id: string) => books.find(b => b.id === id)?.accessionNumber || 'N/A';

    // Dropdown Class & Stream Options
    const classOptions = useMemo(() => {
        const set = new Set<string>();
        courses.forEach(c => { if (c.name && c.name.trim()) set.add(c.name.trim()); });
        allMembersList.forEach(m => { if (m.gradeLevel) set.add(m.gradeLevel); });
        if (institution?.classDefinitions && institution.classDefinitions.length > 0) {
            institution.classDefinitions.forEach(cd => { if (cd && cd.trim()) set.add(cd.trim()); });
        }
        if (set.size === 0) return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Grade 7', 'Grade 8', 'Grade 9'];
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [courses, allMembersList, institution]);

    const streamOptions = useMemo(() => {
        const set = new Set<string>();
        if (selectedClassId) {
            const matchedCourse = courses.find(c => c.name.trim().toLowerCase() === selectedClassId.trim().toLowerCase() || c.id === selectedClassId);
            matchedCourse?.levels?.forEach(l => { if (l.name && l.name.trim()) set.add(l.name.trim()); });
            allMembersList.filter(m => {
                const g = (m.gradeLevel || '').toString().trim().toLowerCase();
                return g === selectedClassId.trim().toLowerCase() || (matchedCourse && g === matchedCourse.name.trim().toLowerCase());
            }).forEach(m => { if (m.stream) set.add(m.stream); });
        } else {
            courses.flatMap(c => c.levels || []).forEach(l => { if (l.name && l.name.trim()) set.add(l.name.trim()); });
            allMembersList.forEach(m => { if (m.stream) set.add(m.stream); });
        }
        if (institution?.streamDefinitions && institution.streamDefinitions.length > 0) {
            institution.streamDefinitions.forEach(sd => { if (sd && sd.trim()) set.add(sd.trim()); });
        }
        if (set.size === 0) return ['East', 'West', 'North', 'South', 'Central'];
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [selectedClassId, courses, allMembersList, institution]);

    // Analytics Calculation
    const analytics = useMemo(() => {
        const topBorrowed = books.map(b => ({
            ...b,
            borrowCount: transactions.filter(t => t.bookId === b.id).length
        })).sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 6);

        const categoryCounts = books.reduce((acc: any, b) => {
            const cat = b.category || 'General';
            acc[cat] = (acc[cat] || 0) + (b.quantity || 1);
            return acc;
        }, {});

        // 1. Demand Intelligence
        const demandIntel = books.map(b => {
            const activeRes = reservations.filter(r => r.bookId === b.id && r.status === 'pending').length;
            const demandRatio = b.available > 0 ? activeRes / b.available : activeRes;
            return { ...b, activeRes, demandRatio };
        }).filter(b => b.activeRes > 0).sort((a, b) => b.demandRatio - a.demandRatio).slice(0, 10);

        // 2. Collection Obsolescence
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const deadStock = books.filter(b => {
            const addedDate = new Date(b.addedDate);
            const loansCount = transactions.filter(t => t.bookId === b.id).length;
            return addedDate < oneYearAgo && loansCount === 0;
        }).slice(0, 10);

        // 3. Fine Leakage
        const totalFineAmount = fines.reduce((acc, f) => acc + (f.amount || 0), 0);
        const collectedFineAmount = fines.reduce((acc, f) => acc + (f.paidAmount || 0), 0);
        const fineLeakage = totalFineAmount > 0 ? ((totalFineAmount - collectedFineAmount) / totalFineAmount) * 100 : 0;

        // 4. Behavioral Segments
        const userActivity = allMembersList.map(u => {
            const count = transactions.filter(t => t.userId === u.id || t.userId === u.userId).length;
            let segment = 'Inactive';
            if (count > 10) segment = 'Power';
            else if (count > 2) segment = 'Regular';
            return { ...u, loanCount: count, segment };
        });
        const segments = {
            Power: userActivity.filter(u => u.segment === 'Power').length,
            Regular: userActivity.filter(u => u.segment === 'Regular').length,
            Inactive: userActivity.filter(u => u.segment === 'Inactive').length,
        };

        // 5. Category Turnover Heatmap
        const categoryTurnover = Object.entries(categoryCounts).map(([cat, total]: any) => {
            const catLoans = transactions.filter(t => {
                const book = books.find(b => b.id === t.bookId);
                return book?.category === cat;
            }).length;
            return { category: cat, total, loans: catLoans, turnover: (catLoans / total) || 0 };
        }).sort((a, b) => b.turnover - a.turnover);

        // 6. Peak Activity Audit
        const peakAudit = transactions.reduce((acc: any, t) => {
            const hour = new Date(t.issueDate).getHours();
            let slot = 'Morning (8-12)';
            if (hour >= 12 && hour < 16) slot = 'Afternoon (12-4)';
            else if (hour >= 16) slot = 'Evening (4-8)';
            acc[slot] = (acc[slot] || 0) + 1;
            return acc;
        }, { 'Morning (8-12)': 0, 'Afternoon (12-4)': 0, 'Evening (4-8)': 0 });

        const totalAssetRisk = transactions
            .filter(t => t.status === 'overdue')
            .reduce((acc, t) => {
                const book = books.find(b => b.id === t.bookId);
                return acc + ((book as any)?.price || 1500);
            }, 0);

        return {
            topBorrowed,
            categoryCounts,
            demandIntel,
            deadStock,
            fineLeakage,
            totalFineAmount,
            collectedFineAmount,
            segments,
            categoryTurnover,
            peakAudit,
            totalAssetRisk,
            overdueCount: transactions.filter(t => t.status === 'overdue').length
        };
    }, [books, transactions, reservations, fines, allMembersList]);

    // Member Statement Logic
    const filteredUsers = useMemo(() => {
        if (!searchUserTerm) return [];
        const term = searchUserTerm.toLowerCase().trim();
        const searchTokens = term.split(/\s+/).filter(Boolean);
        return allMembersList.filter(u => {
            const name = (u.name || '').toLowerCase();
            const adm = (u.admissionNumber || u.admission_number || u.staffId || '').toLowerCase();
            const classStr = (u.classDisplay || u.classStr || '').toLowerCase();
            const searchable = `${name} ${adm} ${classStr}`;
            return searchTokens.every(tok => searchable.includes(tok));
        }).slice(0, 8);
    }, [allMembersList, searchUserTerm]);

    const handlePrintStatement = async () => {
        if (!selectedStatementUser) return;
        setIsPrintingStatement(true);
        try {
            const matchUser = (tUserId: string) => {
                if (!tUserId) return false;
                const target = norm(tUserId);
                return target === norm(selectedStatementUser.id) ||
                       target === norm(selectedStatementUser.userId) ||
                       target === norm(selectedStatementUser.admissionNumber) ||
                       target === norm(selectedStatementUser.staffId);
            };

            const userTrans = transactions.filter(t => matchUser(t.userId));
            const userFines = fines.filter(f => matchUser(f.userId));
            const activeLoans = userTrans.filter(t => t.status === 'issued' || t.status === 'overdue');
            const history = userTrans.filter(t => t.status === 'returned');

            const dataUri = await generateMemberLibraryHistoryPdf(
                selectedStatementUser,
                activeLoans,
                history,
                userFines,
                books,
                institution,
                companyDetails,
                institution.logoUrl || null,
                institution.footerImageUrl || null
            );

            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Library-Statement-${selectedStatementUser.name.replace(/\s+/g, '-')}.pdf`;
            link.click();

            await onLogAction(`Generated Library Statement for ${selectedStatementUser.name}`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate official library statement.');
        } finally {
            setIsPrintingStatement(false);
        }
    };

    // Defaulters Data
    const unreturnedReportData = useMemo(() => {
        return transactions
            .filter(t => t.status === 'issued' || t.status === 'overdue')
            .map(t => {
                const member = getUserObject(t.userId, t);
                const gradeLevel = member?.gradeLevel || '';
                const stream = member?.stream || '';
                const classDisplay = member?.classDisplay || (gradeLevel && stream ? `${gradeLevel} - ${stream}` : gradeLevel || stream || '—');
                const admNo = member?.admissionNumber || member?.staffId || 'No ID';

                return {
                    ...t,
                    user: member,
                    memberDetails: {
                        admissionNumber: admNo,
                        gradeLevel,
                        stream,
                        classDisplay
                    }
                };
            })
            .filter(item => {
                if (!selectedClassId && !selectedStreamId) return true;
                const matchedCourse = courses.find(c => c.id === selectedClassId || c.name.trim().toLowerCase() === selectedClassId.trim().toLowerCase());
                
                if (selectedClassId) {
                    const matchesCourseId = item.user?.courseId === selectedClassId;
                    const matchesGradeName = (item.memberDetails.gradeLevel || '').toLowerCase() === selectedClassId.trim().toLowerCase();
                    const matchesCourseObjName = matchedCourse ? (item.memberDetails.gradeLevel || '').toLowerCase() === matchedCourse.name.trim().toLowerCase() : false;
                    const matchesClassDisplay = (item.memberDetails.classDisplay || '').toLowerCase().includes(selectedClassId.trim().toLowerCase());
                    if (!matchesCourseId && !matchesGradeName && !matchesCourseObjName && !matchesClassDisplay) return false;
                }

                if (selectedStreamId) {
                    const matchesLevelId = item.user?.courseLevelId === selectedStreamId;
                    const matchesStreamName = (item.memberDetails.stream || '').toLowerCase() === selectedStreamId.trim().toLowerCase();
                    const matchesClassDisplay = (item.memberDetails.classDisplay || '').toLowerCase().includes(selectedStreamId.trim().toLowerCase());
                    if (!matchesLevelId && !matchesStreamName && !matchesClassDisplay) return false;
                }

                return true;
            });
    }, [transactions, allMembersList, courses, selectedClassId, selectedStreamId]);

    const handlePrintUnreturnedReport = async () => {
        const className = courses.find(c => c.id === selectedClassId)?.name || selectedClassId || 'All Classes';
        const streamName = courses.find(c => c.id === selectedClassId)?.levels?.find(l => l.id === selectedStreamId)?.name || selectedStreamId || 'All Streams';

        try {
            const dataUri = await generateLibraryUnreturnedReportPdf(
                unreturnedReportData,
                `Unreturned Books Report: ${className} - ${streamName}`,
                institution.letterheadConfig,
                institution.footerImageUrl || null,
                getBookTitle
            );
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Unreturned-Books-${className}-${streamName}.pdf`.replace(/\s+/g, '-');
            link.click();
            onLogAction(`Generated Unreturned Books Report for ${className} - ${streamName}`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF report.');
        }
    };

    // Filtered Circulation Transactions
    const filteredCirculation = useMemo(() => {
        return transactions.filter(t => {
            if (circStatusFilter !== 'all' && t.status !== circStatusFilter) return false;
            if (circSearchTerm.trim()) {
                const q = circSearchTerm.toLowerCase();
                const bTitle = getBookTitle(t.bookId).toLowerCase();
                const bAcc = getBookAccession(t.bookId).toLowerCase();
                const uName = getUserName(t.userId, t).toLowerCase();
                return bTitle.includes(q) || bAcc.includes(q) || uName.includes(q) || (t.id || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [transactions, circStatusFilter, circSearchTerm, books, allMembersList]);

    // Filtered Fines
    const filteredFines = useMemo(() => {
        return fines.filter(f => {
            const isUnpaid = (f.amount - (f.paidAmount || 0)) > 0;
            if (fineStatusFilter === 'unpaid' && !isUnpaid) return false;
            if (fineStatusFilter === 'paid' && isUnpaid) return false;
            if (fineSearchTerm.trim()) {
                const q = fineSearchTerm.toLowerCase();
                const uName = getUserName(f.userId).toLowerCase();
                return uName.includes(q) || (f.id || '').toLowerCase().includes(q) || (f.transactionId || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [fines, fineStatusFilter, fineSearchTerm, allMembersList]);

    // ── Vertical Navigation Sections Config ──
    const reportNavItems: {
        id: ReportSectionId;
        label: string;
        desc: string;
        icon: any;
        badge?: string | null;
        badgeColor?: string;
    }[] = [
        { id: 'summary', label: 'Executive Summary', desc: 'KPIs, trend intelligence & revenue', icon: BarChart3Icon },
        { id: 'statements', label: 'Patron Statement Hub', desc: 'Member loan timeline & clearance slips', icon: UserIcon },
        {
            id: 'defaulters',
            label: 'Unreturned & Overdue Loans',
            desc: 'Class & stream unreturned registers',
            icon: ClockIcon,
            badge: analytics.overdueCount > 0 ? `${analytics.overdueCount}` : null,
            badgeColor: 'bg-rose-500 text-white'
        },
        {
            id: 'circulation',
            label: 'Circulation Register',
            desc: 'Chronological lending & return audit',
            icon: ClipboardListIcon,
            badge: transactions.length > 0 ? `${transactions.length}` : null
        },
        {
            id: 'fines',
            label: 'Fines & Penalties Ledger',
            desc: 'Assessed penalties vs collected fees',
            icon: ArrowTrendingUpIcon,
            badge: fines.length > 0 ? `${fines.length}` : null
        },
        {
            id: 'inventory_valuation',
            label: 'Inventory Stock & Valuation',
            desc: 'Resource stock & replacement risk',
            icon: BookOpenIcon,
            badge: books.length > 0 ? `${books.length}` : null
        },
        {
            id: 'donations',
            label: 'Donations & Inward Receipts',
            desc: 'Sponsor contributions & stock intake',
            icon: ChartPieIcon,
            badge: stockReceipts.length > 0 ? `${stockReceipts.length}` : null
        },
        {
            id: 'intelligence',
            label: 'AI Demand & Obsolescence',
            desc: 'Predictive reservations & dead-stock',
            icon: ArrowPathIcon,
            badge: 'AI'
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-16">
            
            {/* Top Reports Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">
                        <BarChart3Icon className="w-3.5 h-3.5" />
                        Comprehensive Library Reporting & Audit Hub
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                        Library Analytics & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-cyan-300 to-emerald-300">Statements</span>
                    </h2>
                    <p className="text-xs text-slate-300 font-medium max-w-xl">
                        Generate official patron clearance statements, audit delinquent loans, monitor replacement value risks, and explore AI demand metrics.
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10 shrink-0">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border border-white/10"
                        title="Reload Data"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* ── 2-COLUMN LAYOUT: VERTICAL MENU (LEFT) + REPORT VIEW (RIGHT) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ══ LEFT VERTICAL SUB-MENU ══ */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1 sticky top-24">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reports Directory</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Select Report Module</p>
                    </div>

                    <div className="space-y-1">
                        {reportNavItems.map(item => {
                            const isActive = activeReportId === item.id;
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveReportId(item.id)}
                                    className={`w-full p-3 rounded-2xl flex items-start gap-3.5 text-left transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20 scale-[1.01]'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-xl shrink-0 ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs font-black uppercase tracking-tight truncate ${
                                                isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                                            }`}>
                                                {item.label}
                                            </p>
                                            {item.badge && (
                                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-full font-mono shrink-0 ${
                                                    item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400')
                                                }`}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-[10px] font-medium leading-tight truncate mt-0.5 ${
                                            isActive ? 'text-indigo-100' : 'text-slate-400'
                                        }`}>
                                            {item.desc}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ══ RIGHT ACTIVE REPORT VIEW CONTAINER ══ */}
                <div className="lg:col-span-8 space-y-6 min-h-[500px]">

                    {/* ── 1. EXECUTIVE SUMMARY ── */}
                    {activeReportId === 'summary' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-500/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">Fine Revenue Collected</p>
                                    <p className="text-2xl sm:text-3xl font-black tracking-tight">KES {analytics.collectedFineAmount.toLocaleString()}</p>
                                    <div className="mt-3 pt-3 border-t border-white/15 flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-emerald-100">Outstanding Arrears:</span>
                                        <span>KES {(analytics.totalFineAmount - analytics.collectedFineAmount).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-500/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Circulation Activity</p>
                                    <p className="text-2xl sm:text-3xl font-black tracking-tight">{transactions.filter(t => t.status === 'issued').length} Active Loans</p>
                                    <div className="mt-3 pt-3 border-t border-white/15 flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-indigo-100">Total Returned History:</span>
                                        <span>{transactions.filter(t => t.status === 'returned').length} Books</span>
                                    </div>
                                </div>

                                <div className="bg-rose-600 p-6 rounded-[2rem] text-white shadow-lg shadow-rose-500/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-200 mb-1">Overdue Delinquency</p>
                                    <p className="text-2xl sm:text-3xl font-black tracking-tight">{analytics.overdueCount} Delayed</p>
                                    <div className="mt-3 pt-3 border-t border-white/15 flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-rose-100">Asset Value at Risk:</span>
                                        <span>KES {analytics.totalAssetRisk.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Top Borrowed & Inventory Composition */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">High Demand Resource Catalog</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top borrowed titles across all categories</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {analytics.topBorrowed.map((book, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                                            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                                0{idx + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{book.title}</p>
                                                <p className="text-[10px] font-bold text-slate-400">By {book.author || 'Unknown'}</p>
                                            </div>
                                            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black font-mono">
                                                {book.borrowCount} Loans
                                            </span>
                                        </div>
                                    ))}
                                    {analytics.topBorrowed.length === 0 && (
                                        <p className="text-xs text-slate-400 italic">No circulation transaction records yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Category Turnover Heatmap */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Category Turnover Matrix</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {analytics.categoryTurnover.slice(0, 8).map((cat, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-center">
                                            <span className="text-sm font-black text-indigo-600">{cat.turnover.toFixed(1)}x</span>
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate mt-1">{cat.category}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{cat.loans} Loans</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 2. PATRON STATEMENT HUB ── */}
                    {activeReportId === 'statements' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-6 animate-fade-in">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Patron Financial & Activity Statements</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Search member to generate official borrowing history and clearance statements</p>
                            </div>

                            <div className="relative max-w-xl">
                                <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Student Name, Admission Number, Class, or Staff ID..."
                                    value={searchUserTerm}
                                    onChange={(e) => setSearchUserTerm(e.target.value)}
                                    className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black transition-all"
                                />
                                {filteredUsers.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                                        {filteredUsers.map(u => {
                                            const adm = u.admissionNumber || u.staffId || 'No ID';
                                            const cl = u.classDisplay || u.classStr || '';
                                            return (
                                                <button
                                                    key={u.id}
                                                    onClick={() => { setSelectedStatementUser(u); setSearchUserTerm(''); }}
                                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b last:border-none border-slate-100 dark:border-slate-700 text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{u.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{adm} {cl ? `• ${cl}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-lg uppercase">Select</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {selectedStatementUser && (() => {
                                const matchUser = (tUserId: string) => {
                                    if (!selectedStatementUser || !tUserId) return false;
                                    const target = norm(tUserId);
                                    return target === norm(selectedStatementUser.id) ||
                                           target === norm(selectedStatementUser.userId) ||
                                           target === norm(selectedStatementUser.admissionNumber) ||
                                           target === norm(selectedStatementUser.staffId);
                                };

                                const userActiveLoans = transactions.filter(t => matchUser(t.userId) && (t.status === 'issued' || t.status === 'overdue')).length;
                                const userReturns = transactions.filter(t => matchUser(t.userId) && t.status === 'returned').length;
                                const userPenaltyTotal = fines.filter(f => matchUser(f.userId)).reduce((acc, f) => acc + (f.amount - (f.paidAmount || 0)), 0);

                                const adm = selectedStatementUser.admissionNumber || selectedStatementUser.staffId || 'No ID';
                                const cl = selectedStatementUser.classDisplay || selectedStatementUser.classStr || '';

                                return (
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-6 animate-scale-up">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                                                    {selectedStatementUser.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">{selectedStatementUser.name}</h4>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                        ID: {adm} {cl ? `• ${cl}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedStatementUser(null)}
                                                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700 cursor-pointer"
                                                >
                                                    Deselect
                                                </button>
                                                <button
                                                    onClick={handlePrintStatement}
                                                    disabled={isPrintingStatement}
                                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    <PrinterIcon className="w-4 h-4" />
                                                    {isPrintingStatement ? 'Generating PDF...' : 'Print Statement'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Active Loans</p>
                                                <p className="text-xl font-black text-indigo-600">{userActiveLoans}</p>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Returns</p>
                                                <p className="text-xl font-black text-emerald-600">{userReturns}</p>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Unpaid Penalties</p>
                                                <p className="text-xl font-black text-rose-600">KES {userPenaltyTotal.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── 3. UNRETURNED & OVERDUE LOANS ── */}
                    {activeReportId === 'defaulters' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-6 animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Unreturned & Overdue Loans</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Defaulter tracking by Class and Stream</p>
                                </div>
                                <button
                                    onClick={handlePrintUnreturnedReport}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all cursor-pointer shadow-md"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    Print Defaulter List PDF
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Class / Grade</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => { setSelectedClassId(e.target.value); setSelectedStreamId(''); }}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                    >
                                        <option value="">-- All Classes --</option>
                                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Stream / Section</label>
                                    <select
                                        value={selectedStreamId}
                                        onChange={(e) => setSelectedStreamId(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                    >
                                        <option value="">-- All Streams --</option>
                                        {streamOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 w-full text-center">
                                        <span className="text-[9px] font-black uppercase text-indigo-400">Total Delayed</span>
                                        <p className="text-base font-black text-indigo-600 dark:text-indigo-300">{unreturnedReportData.length} Copies</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <tr className="text-slate-400 text-[10px] font-black uppercase">
                                            <th className="p-3.5">Borrower</th>
                                            <th className="p-3.5">Class</th>
                                            <th className="p-3.5">Resource</th>
                                            <th className="p-3.5">Due Date</th>
                                            <th className="p-3.5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {unreturnedReportData.map(item => {
                                            const isOverdue = new Date(item.dueDate) < new Date();
                                            const displayName = item.user?.name || getUserName(item.userId, item);
                                            const displayAdm = item.memberDetails?.admissionNumber || item.user?.admissionNumber || item.user?.staffId || 'No ID';
                                            const displayClass = item.memberDetails?.classDisplay || item.user?.classDisplay || '—';

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                                    <td className="p-3.5">
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase">{displayName}</p>
                                                        <span className="text-[9px] font-bold text-slate-400 font-mono">{displayAdm}</span>
                                                    </td>
                                                    <td className="p-3.5 text-indigo-600 dark:text-indigo-400 font-bold">{displayClass}</td>
                                                    <td className="p-3.5">
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase">{getBookTitle(item.bookId)}</p>
                                                        <span className="text-[9px] text-slate-400 font-mono">ID: {getBookAccession(item.bookId)}</span>
                                                    </td>
                                                    <td className="p-3.5 font-mono text-slate-500">{new Date(item.dueDate).toLocaleDateString()}</td>
                                                    <td className="p-3.5 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            isOverdue ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-600' : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600'
                                                        }`}>
                                                            {isOverdue ? 'Overdue' : 'Active'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {unreturnedReportData.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">
                                                    No active unreturned records matching criteria
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 4. CIRCULATION REGISTER ── */}
                    {activeReportId === 'circulation' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-6 animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Circulation & Lending Register</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Complete log of all book check-outs and check-ins</p>
                                </div>
                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-lg text-xs font-black font-mono">
                                    {filteredCirculation.length} Transactions
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Search by book title, borrower, or accession code..."
                                    value={circSearchTerm}
                                    onChange={(e) => setCircSearchTerm(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                />
                                <select
                                    value={circStatusFilter}
                                    onChange={(e: any) => setCircStatusFilter(e.target.value)}
                                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="issued">Issued / In-Use</option>
                                    <option value="returned">Returned</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden max-h-[450px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                                        <tr className="text-slate-400 text-[10px] font-black uppercase">
                                            <th className="p-3.5">Book Resource</th>
                                            <th className="p-3.5">Borrower</th>
                                            <th className="p-3.5">Issue Date</th>
                                            <th className="p-3.5">Due Date</th>
                                            <th className="p-3.5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {filteredCirculation.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                                <td className="p-3.5">
                                                    <p className="font-bold text-slate-900 dark:text-white uppercase">{getBookTitle(t.bookId)}</p>
                                                    <span className="text-[9px] font-mono text-slate-400">ACC: {getBookAccession(t.bookId)}</span>
                                                </td>
                                                <td className="p-3.5 font-bold text-slate-700 dark:text-slate-200">
                                                    {getUserName(t.userId, t)}
                                                </td>
                                                <td className="p-3.5 font-mono text-slate-500">{new Date(t.issueDate).toLocaleDateString()}</td>
                                                <td className="p-3.5 font-mono text-slate-500">{new Date(t.dueDate).toLocaleDateString()}</td>
                                                <td className="p-3.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                        t.status === 'returned'
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600'
                                                            : t.status === 'overdue'
                                                            ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-600'
                                                            : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 5. FINES & PENALTIES LEDGER ── */}
                    {activeReportId === 'fines' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-6 animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Fines & Penalties Ledger</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit of assessed penalty fees, payments, and balances</p>
                                </div>
                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 rounded-lg text-xs font-black font-mono">
                                    Total Collected: KES {analytics.collectedFineAmount.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Search by patron name, fine ID, or transaction..."
                                    value={fineSearchTerm}
                                    onChange={(e) => setFineSearchTerm(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                />
                                <select
                                    value={fineStatusFilter}
                                    onChange={(e: any) => setFineStatusFilter(e.target.value)}
                                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                >
                                    <option value="all">All Fines</option>
                                    <option value="unpaid">Outstanding Unpaid</option>
                                    <option value="paid">Fully Settled</option>
                                </select>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden max-h-[450px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                                        <tr className="text-slate-400 text-[10px] font-black uppercase">
                                            <th className="p-3.5">Patron</th>
                                            <th className="p-3.5">Assessed (KES)</th>
                                            <th className="p-3.5">Paid (KES)</th>
                                            <th className="p-3.5">Balance (KES)</th>
                                            <th className="p-3.5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {filteredFines.map(f => {
                                            const bal = Math.max(0, (f.amount || 0) - (f.paidAmount || 0));
                                            return (
                                                <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                                                        {getUserName(f.userId)}
                                                    </td>
                                                    <td className="p-3.5 font-mono font-bold">{f.amount?.toLocaleString()}</td>
                                                    <td className="p-3.5 font-mono text-emerald-600 font-bold">{(f.paidAmount || 0).toLocaleString()}</td>
                                                    <td className="p-3.5 font-mono font-black text-rose-600">{bal.toLocaleString()}</td>
                                                    <td className="p-3.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            bal === 0 ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/40 text-rose-600'
                                                        }`}>
                                                            {bal === 0 ? 'Cleared' : 'Due'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredFines.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">
                                                    No fines matching criteria
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 6. INVENTORY STOCK & VALUATION ── */}
                    {activeReportId === 'inventory_valuation' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-6 animate-fade-in">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Inventory Stock & Category Valuation</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Physical stock counts and resource distribution</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Unique Titles</span>
                                    <span className="text-2xl font-black text-indigo-600 font-mono">{books.length}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Total Physical Copies</span>
                                    <span className="text-2xl font-black text-emerald-600 font-mono">
                                        {books.reduce((acc, b) => acc + (b.quantity || 0), 0)}
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block">Available on Shelf</span>
                                    <span className="text-2xl font-black text-cyan-600 font-mono">
                                        {books.reduce((acc, b) => acc + (b.available || 0), 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <tr className="text-slate-400 text-[10px] font-black uppercase">
                                            <th className="p-3.5">Category</th>
                                            <th className="p-3.5 text-center">Total Volumes</th>
                                            <th className="p-3.5 text-center">Available</th>
                                            <th className="p-3.5 text-center">In Use</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {Object.entries(analytics.categoryCounts).map(([cat, count]: any, idx) => {
                                            const catBooks = books.filter(b => (b.category || 'General') === cat);
                                            const avail = catBooks.reduce((acc, b) => acc + (b.available || 0), 0);
                                            const inUse = Math.max(0, count - avail);

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                                    <td className="p-3.5 font-black uppercase text-slate-900 dark:text-white">{cat}</td>
                                                    <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{count}</td>
                                                    <td className="p-3.5 text-center font-mono font-bold text-emerald-600">{avail}</td>
                                                    <td className="p-3.5 text-center font-mono font-bold text-amber-600">{inUse}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 7. DONATIONS & SPONSORS ── */}
                    {activeReportId === 'donations' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm space-y-6 animate-fade-in">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Book Donations & Inward Receipts</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sponsor receipts and inward stock intake records</p>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <tr className="text-slate-400 text-[10px] font-black uppercase">
                                            <th className="p-3.5">Donor / Sponsor</th>
                                            <th className="p-3.5">Receipt #</th>
                                            <th className="p-3.5">Date</th>
                                            <th className="p-3.5 text-center">Copies Received</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {stockReceipts.map((r, idx) => (
                                            <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                                <td className="p-3.5 font-black uppercase text-slate-900 dark:text-white">
                                                    {(r as any).donorName || (r as any).sponsorName || 'Institutional Donor'}
                                                </td>
                                                <td className="p-3.5 font-mono text-indigo-600 font-bold">
                                                    {(r as any).receiptNumber || `REC-${idx + 1}`}
                                                </td>
                                                <td className="p-3.5 font-mono text-slate-500">
                                                    {new Date(r.receivedDate || (r as any).created_at || Date.now()).toLocaleDateString()}
                                                </td>
                                                <td className="p-3.5 text-center font-mono font-black text-emerald-600">
                                                    {r.quantity || 1}
                                                </td>
                                            </tr>
                                        ))}
                                        {stockReceipts.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-xs font-bold text-slate-400">
                                                    No inward stock donation receipts recorded yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 8. AI DEMAND & OBSOLESCENCE ── */}
                    {activeReportId === 'intelligence' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Predictive Demand */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Predictive Reservation Bottlenecks</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High Reservation Density (Procurement Recommendations)</p>
                                    </div>
                                    <ArrowPathIcon className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="space-y-3">
                                    {analytics.demandIntel.length > 0 ? analytics.demandIntel.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{item.title}</p>
                                                <p className="text-[9px] font-bold text-slate-400">{item.activeRes} Pendings / {item.quantity} In Stock</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-indigo-600 font-mono">Ratio: {item.demandRatio.toFixed(1)}</p>
                                                <span className="text-[8px] font-black uppercase text-indigo-400">Order Copy</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic">No active pending reservation bottlenecks detected.</p>
                                    )}
                                </div>
                            </div>

                            {/* Obsolescence */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Collection Obsolescence</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Titles with Zero Loans in 12+ Months</p>
                                    </div>
                                    <XCircleIcon className="w-5 h-5 text-rose-500" />
                                </div>
                                <div className="space-y-3">
                                    {analytics.deadStock.length > 0 ? analytics.deadStock.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-transparent hover:border-rose-100 transition-all">
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{item.title}</p>
                                                <p className="text-[9px] font-bold text-slate-400">Added: {new Date(item.addedDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md">Archive Suggestion</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic">All catalog items have recorded lending circulation.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
