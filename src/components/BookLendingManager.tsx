
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Book, User, LibraryTransaction, LibrarySettings } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { BellIcon } from './icons/BellIcon';
import { EyeIcon } from './icons/EyeIcon';
import { apiService } from '../services/apiService';

interface BookLendingManagerProps {
    institutionId: string;
    institution?: any;
    companyDetails?: any;
    users: User[];
    courses?: any[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => void;
}

export const BookLendingManager: React.FC<BookLendingManagerProps> = ({
    institutionId,
    institution,
    companyDetails,
    users,
    courses: passedCourses = [],
    onLogAction,
    onDataChange
}) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [settings, setSettings] = useState<LibrarySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [scanSearch, setScanSearch] = useState('');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Active Circulation Search & Filter
    const [circulationSearch, setCirculationSearch] = useState('');
    const [circulationStatusFilter, setCirculationStatusFilter] = useState<'all' | 'issued' | 'overdue'>('all');

    const [newLoan, setNewLoan] = useState({
        userId: '',
        bookId: '',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    const [memberSearch, setMemberSearch] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const [hasSigned, setHasSigned] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const [liveUsers, setLiveUsers] = useState<User[]>(users || []);
    const [enrollments, setEnrollments] = useState<any[]>([]);

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

    // Bulk Issuance state variables
    const [isBulkIssuing, setIsBulkIssuing] = useState(false);
    const [bulkBookTitle, setBulkBookTitle] = useState('');
    const [bulkCriteria, setBulkCriteria] = useState<'class' | 'course'>('class');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [bulkDueDate, setBulkDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [bulkAllocations, setBulkAllocations] = useState<Record<string, string>>({}); // studentId -> copyId
    const [courses, setCourses] = useState<any[]>(passedCourses);

    useEffect(() => {
        if (passedCourses.length > 0) {
            setCourses(passedCourses);
        }
    }, [passedCourses]);

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, transData, configData, enrollmentsData, coursesData, remoteUsersData] = await Promise.all([
                apiService.fetchModuleRecords<Book>('books', institutionId),
                apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', institutionId),
                apiService.fetchModuleRecords<LibrarySettings>('library_settings', institutionId),
                apiService.fetchModuleRecords<any>('student_enrollments', institutionId).catch(() => []),
                apiService.fetchModuleRecords<any>('courses', institutionId).catch(() => []),
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

            const targetType = (institution?.institutionType === 'driving_school' || (institution as any)?.category === 'driving_school') ? 'driving_school' : 'academic';

            // Filter enrollments to institution & enrollment type matching Patron Registry
            let allEnr = (enrollmentsData || []).filter((e: any) => {
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

            // Deduplicate enrollments by student admission number or userId matching Patron Registry
            const dedupedEnrollments = new Map<string, any>();
            allEnr.forEach((e: any) => {
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

            setBooks(booksData);
            setTransactions(transData.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
            if (configData.length > 0) setSettings(configData[0]);
            setEnrollments(Array.from(dedupedEnrollments.values()));
            if (coursesData && coursesData.length > 0) setCourses(coursesData);
            else if (passedCourses.length > 0) setCourses(passedCourses);
        } catch (error) {
            console.error('Error loading circulation data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Bulk Issuance Helper Memos & Functions
    const uniqueBookTitles = useMemo(() => {
        const seen = new Set<string>();
        const list: { title: string; isbn: string; author: string }[] = [];
        books.forEach(b => {
            const key = `${b.title.trim().toLowerCase()}_${(b.isbn || '').trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                list.push({ title: b.title, isbn: b.isbn || '', author: b.author });
            }
        });
        return list.sort((a, b) => a.title.localeCompare(b.title));
    }, [books]);

    // Helper to extract student class and stream across all metadata formats
    const getStudentClassString = (u: User, enr?: any): string => {
        const en = enr || enrollments.find(e => 
            (e.userId && e.userId === u.id) || 
            (e.student_id && e.student_id === u.id) || 
            (e.user_id && e.user_id === u.id) || 
            (e.id && e.id === u.id) ||
            (e.admissionNumber && u.admissionNumber && String(e.admissionNumber).trim().toLowerCase() === String(u.admissionNumber).trim().toLowerCase())
        );

        const userCourse = (courses || []).find(c => c.id === u.courseId || c.id === (u as any).course_id || c.id === en?.courseId || c.id === en?.course_id);
        const userLevel = userCourse?.levels?.find((l: any) => l.id === u.courseLevelId || l.id === (u as any).course_level_id || l.id === en?.courseLevelId || l.id === en?.course_level_id);

        const grade = (
            en?.metadata?.gradeLevel || 
            en?.gradeLevel || 
            en?.metadata?.classLevel || 
            en?.metadata?.className || 
            (en as any)?.studentClass || 
            u.studentClass || 
            (u as any).classLevel || 
            (u as any).class_name || 
            (u as any).class || 
            u.metadata?.gradeLevel || 
            userCourse?.name || 
            ''
        ).toString().trim();

        const stream = (
            en?.metadata?.stream || 
            en?.stream || 
            en?.streamName || 
            (u as any).stream || 
            (u as any).streamName || 
            (u as any).stream_name || 
            u.metadata?.stream || 
            userLevel?.name || 
            ''
        ).toString().trim();

        if (!grade && !stream) return '';
        if (grade && stream) {
            if (grade.toLowerCase().includes(stream.toLowerCase())) return grade;
            return `${grade} - ${stream}`;
        }
        return grade || stream;
    };

    const classOptions = useMemo(() => {
        const set = new Set<string>();

        // 1. From enrollments
        enrollments.forEach(e => {
            const gradeLevel = (e.metadata?.gradeLevel || e.gradeLevel || e.metadata?.classLevel || e.metadata?.className || '').toString().trim();
            const stream = (e.metadata?.stream || e.stream || '').toString().trim();
            if (gradeLevel && stream) {
                if (gradeLevel.toLowerCase().includes(stream.toLowerCase())) set.add(gradeLevel);
                else set.add(`${gradeLevel} - ${stream}`);
            } else if (gradeLevel) {
                set.add(gradeLevel);
            } else if (stream) {
                set.add(stream);
            }
        });

        // 2. From users directly
        users.filter(u => u.role === 'student').forEach(u => {
            const clStr = getStudentClassString(u);
            if (clStr) set.add(clStr);
        });

        // 3. From courses and academic levels
        courses.forEach((c: any) => {
            if (c.levels && Array.isArray(c.levels) && c.levels.length > 0) {
                c.levels.forEach((l: any) => {
                    if (l.name) set.add(`${c.name} - ${l.name}`);
                });
            } else if (c.name) {
                set.add(c.name);
            }
        });

        return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [enrollments, users, courses]);

    const availableCopies = useMemo(() => {
        if (!bulkBookTitle) return [];
        return books.filter(b => b.title.trim().toLowerCase() === bulkBookTitle.trim().toLowerCase() && b.available > 0);
    }, [books, bulkBookTitle]);

    const allMembersList = useMemo(() => {
        const userMapById = new Map<string, User>();
        const userMapByAdm = new Map<string, User>();

        const pool = [...liveUsers, ...users];
        pool.forEach(u => {
            if (u.id) userMapById.set(u.id.toLowerCase(), u);
            const adm = u.admissionNumber || (u as any).admission_number || (u as any).admNo;
            if (adm) userMapByAdm.set(String(adm).trim().toLowerCase(), u);
        });

        // 1. Process all enrolled students matching Patron Registry (LibraryMemberManager)
        const mappedStudents = enrollments.map((e) => {
            const eUserId = (e.userId || e.user_id || e.student_id || '').toLowerCase();
            const eAdm = (e.admissionNumber || e.admission_number || e.admNo || e.metadata?.admissionNumber || e.metadata?.studentAdmNo || '').toString().trim().toLowerCase();

            // Find matched user in users table
            const matchedUser = (eUserId && userMapById.get(eUserId)) || 
                                (eAdm && userMapByAdm.get(eAdm)) || 
                                (e.id && userMapById.get(e.id.toLowerCase()));

            // Extract real name
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

            let adm = e.admissionNumber || 
                      e.admission_number || 
                      e.admNo || 
                      e.metadata?.admissionNumber || 
                      e.metadata?.admNo || 
                      e.metadata?.studentAdmNo || 
                      matchedUser?.admissionNumber || 
                      (matchedUser as any)?.admission_number || 
                      `ADM-${(e.id || '').replace(/^enr_/, '').slice(-4).toUpperCase()}`;

            let finalName = candidateName;
            if (!finalName) {
                finalName = `Learner ${adm}`;
            }

            const userCourse = (courses || []).find((c: any) => c.id === e.courseId || c.id === matchedUser?.courseId);
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

            let classDisplay = '';
            if (gradeLevel && stream) {
                if (gradeLevel.toLowerCase().includes(stream.toLowerCase())) {
                    classDisplay = gradeLevel;
                } else {
                    classDisplay = `${gradeLevel} - ${stream}`;
                }
            } else {
                classDisplay = gradeLevel || stream || 'Unassigned';
            }

            return {
                id: matchedUser?.id || e.userId || e.user_id || e.student_id || e.id,
                userId: matchedUser?.id || e.userId || e.user_id || e.student_id || e.id,
                enrollmentId: e.id,
                name: finalName,
                email: matchedUser?.email || e.email || e.metadata?.email || `${String(adm).toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`,
                phoneNumber: matchedUser?.phoneNumber || e.phoneNumber || e.metadata?.phoneNumber || e.metadata?.parentPhone || e.metadata?.guardianPhone || '',
                role: 'student' as const,
                admissionNumber: String(adm),
                admission_number: String(adm),
                staffId: String(adm),
                studentClass: gradeLevel,
                gradeLevel: gradeLevel,
                stream: stream,
                classDisplay: classDisplay,
                classStr: classDisplay,
                courseId: e.courseId || matchedUser?.courseId,
                courseLevelId: e.courseLevelId || matchedUser?.courseLevelId,
                profilePhotoUrl: matchedUser?.profilePhotoUrl || e.metadata?.passportPhoto || e.metadata?.photoUrl,
                status: (e.status || matchedUser?.status || 'Active') as any,
                metadata: {
                    ...matchedUser?.metadata,
                    ...e.metadata,
                    enrollmentId: e.id,
                    admissionNumber: String(adm)
                }
            };
        });

        // 2. Staff members (teachers, librarians, support staff, etc.)
        const staffMembers = pool.filter(u => u.role !== 'student' && u.role !== 'super_admin').map(u => ({
            ...u,
            name: extractStudentName(u) || u.name || 'Staff Member',
            classStr: (u.role || 'Staff').replace(/_/g, ' ')
        }));

        // Deduplicate by ID
        const memberMap = new Map<string, any>();
        [...mappedStudents, ...staffMembers].forEach(m => {
            if (m.id && !memberMap.has(m.id)) memberMap.set(m.id, m);
        });

        return Array.from(memberMap.values());
    }, [liveUsers, users, enrollments, courses]);

    const filteredStudentsList = useMemo(() => {
        if (!isBulkIssuing) return [];
        
        let list = allMembersList.filter(m => m.role === 'student');
        
        if (bulkCriteria === 'class' && selectedClass) {
            const targetClean = selectedClass.trim().toLowerCase();
            list = list.filter(u => {
                const classString = (u.classStr || '').toLowerCase();
                if (classString === targetClean) return true;

                // Also check partial matching
                const grade = (u.gradeLevel || (u as any).studentClass || (u as any).classLevel || u.metadata?.gradeLevel || '').toString().trim().toLowerCase();
                const stream = (u.stream || u.metadata?.stream || '').toString().trim().toLowerCase();
                if (grade === targetClean || stream === targetClean) return true;
                if (grade && stream && `${grade} - ${stream}` === targetClean) return true;

                return false;
            });
        } else if (bulkCriteria === 'course' && selectedCourse) {
            list = list.filter(u => {
                const userCourse = u.courseId || (u as any).course_id;
                return userCourse === selectedCourse;
            });
        }
        
        return list;
    }, [allMembersList, bulkCriteria, selectedClass, selectedCourse, isBulkIssuing]);

    const handleAutoAllocate = () => {
        const checkedStudents = filteredStudentsList.filter(s => selectedStudentIds.includes(s.id));
        const freshAllocations: Record<string, string> = { ...bulkAllocations };
        let copyIndex = 0;
        
        checkedStudents.forEach(student => {
            // Find next unallocated copy
            while (copyIndex < availableCopies.length) {
                const copy = availableCopies[copyIndex];
                const alreadyAssigned = Object.values(freshAllocations).includes(copy.id);
                if (!alreadyAssigned) {
                    freshAllocations[student.id] = copy.id;
                    copyIndex++;
                    break;
                }
                copyIndex++;
            }
        });
        setBulkAllocations(freshAllocations);
    };

    const handlePostBulkIssuance = async () => {
        const checkedStudents = filteredStudentsList.filter(s => selectedStudentIds.includes(s.id));
        if (checkedStudents.length === 0) {
            alert('Please select at least one student to issue books.');
            return;
        }

        const missingAllocations = checkedStudents.some(s => !bulkAllocations[s.id]);
        if (missingAllocations) {
            alert('Please assign a unique book (accession number) to all selected students.');
            return;
        }

        setIsProcessing(true);
        try {
            const issueDate = new Date().toISOString();
            const dueDate = new Date(bulkDueDate).toISOString();
            
            for (const student of checkedStudents) {
                const copyId = bulkAllocations[student.id];
                const copy = books.find(b => b.id === copyId);
                if (!copy) continue;

                const transactionId = `ltx_bulk_${Date.now()}_${student.id.slice(-4)}`;
                const transaction: LibraryTransaction = {
                    id: transactionId,
                    bookId: copyId,
                    userId: student.id,
                    issueDate,
                    dueDate,
                    status: 'issued',
                    institutionId,
                    fineAmount: 0
                };

                await apiService.saveModuleRecord('library_transactions', transaction);

                await apiService.saveModuleRecord('books', {
                    ...copy,
                    available: 0
                });
            }

            await onLogAction(`Issued ${checkedStudents.length} copies of "${bulkBookTitle}" in bulk`);
            alert(`Successfully issued ${checkedStudents.length} books in bulk!`);
            
            setIsBulkIssuing(false);
            setBulkBookTitle('');
            setSelectedClass('');
            setSelectedCourse('');
            setSelectedStudentIds([]);
            setBulkAllocations({});
            
            await loadData();
            onDataChange();
        } catch (error: any) {
            alert("Failed to issue books in bulk: " + (error.message || error));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleIssueBook = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newLoan.userId || !newLoan.bookId || !newLoan.dueDate) {
            alert('Please select both a member and a book, and set a due date.');
            return;
        }

        if (isProcessing) return;

        const book = books.find(b => b.id === newLoan.bookId);
        if (!book) {
            alert('Selected resource not found in registry.');
            return;
        }

        const hasActiveLoan = transactions.some(t =>
            t.userId === newLoan.userId &&
            t.bookId === newLoan.bookId &&
            (t.status === 'issued' || t.status === 'overdue')
        );

        if (hasActiveLoan) {
            alert(`This member already has an active loan for "${book.title}". They must return the current copy before being issued another one.`);
            return;
        }

        if (book.available < 1) {
            alert(`"${book.title}" is currently out of stock. (Total: ${book.quantity}, Available: 0)`);
            return;
        }

        setIsProcessing(true);
        try {
            const signatureUrl = hasSigned && signatureCanvasRef.current ? signatureCanvasRef.current.toDataURL('image/png') : undefined;

            const transactionId = `ltx_${Date.now()}`;
            const issueDate = new Date().toISOString();
            const dueDate = new Date(newLoan.dueDate).toISOString();

            const transaction: LibraryTransaction = {
                id: transactionId,
                bookId: newLoan.bookId,
                userId: newLoan.userId,
                issueDate,
                dueDate,
                status: 'issued',
                institutionId,
                fineAmount: 0,
                memberSignature: signatureUrl
            };

            await apiService.saveModuleRecord('library_transactions', transaction);

            await apiService.saveModuleRecord('books', {
                ...book,
                available: Math.max(0, book.available - 1)
            });

            await onLogAction(`Issued book "${book.title}" to user ${newLoan.userId}`);

            setIsIssuing(false);
            setHasSigned(false);
            setNewLoan({
                userId: '',
                bookId: '',
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            setMemberSearch('');
            setBookSearch('');
            await loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Critical Issuance Error:', error);
            alert(`Failed to process book issuance: ${error.message || 'Unknown database error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Signature Pad Logic
    useEffect(() => {
        if (!isIssuing || !signatureCanvasRef.current) return;
        const canvas = signatureCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        const getCoords = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            if (e instanceof MouseEvent) return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        };

        const start = (e: MouseEvent | TouchEvent) => {
            const { x, y } = getCoords(e);
            ctx?.beginPath();
            ctx?.moveTo(x, y);
            setIsDrawing(true);
            setHasSigned(true);
        };

        const move = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing) return;
            const { x, y } = getCoords(e);
            ctx?.lineTo(x, y);
            ctx?.stroke();
        };

        const stop = () => setIsDrawing(false);

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', stop);

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', move);
            canvas.removeEventListener('mouseup', stop);
            canvas.removeEventListener('mouseleave', stop);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', move);
            canvas.removeEventListener('touchend', stop);
        };
    }, [isIssuing, isDrawing]);

    const handleSendReminder = async (transaction: LibraryTransaction) => {
        const user = users.find(u => u.id === transaction.userId);
        const book = books.find(b => b.id === transaction.bookId);

        if (!user || !user.phoneNumber) {
            alert('User contact information missing.');
            return;
        }
        if (!book) return;

        try {
            const res = await apiService.sendLibraryOverdueReminder(
                user.phoneNumber,
                book.title,
                transaction.dueDate,
                institutionId
            );
            if (res.success) {
                alert(`Reminder sent to ${user.name}`);
                await onLogAction(`Sent overdue reminder to ${user.name} for "${book.title}"`);
            } else {
                alert(`Failed to send reminder: ${res.message}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleBulkReminders = async () => {
        const overdueLoans = transactions.filter(t => t.status === 'issued' && new Date(t.dueDate) < new Date());

        if (overdueLoans.length === 0) {
            alert('No overdue loans found to send reminders.');
            return;
        }

        if (!confirm(`Send SMS reminders to ${overdueLoans.length} members?`)) return;

        setIsProcessing(true);
        let successCount = 0;

        try {
            for (const loan of overdueLoans) {
                const user = users.find(u => u.id === loan.userId);
                const book = books.find(b => b.id === loan.bookId);

                if (user && user.phoneNumber && book) {
                    const res = await apiService.sendLibraryOverdueReminder(
                        user.phoneNumber,
                        book.title,
                        loan.dueDate,
                        institutionId
                    );
                    if (res.success) successCount++;
                }
            }
            alert(`Bulk reminders process complete. ${successCount} reminders sent.`);
            await onLogAction(`Sent bulk library reminders to ${successCount} members.`);
        } catch (error: any) {
            console.error('Bulk reminders error:', error);
            alert('A critical error occurred during bulk messaging.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReturnBook = async (transaction: LibraryTransaction) => {
        if (!confirm('Process return for this resource?')) return;
        setIsProcessing(true);
        try {
            const book = books.find(b => b.id === transaction.bookId);
            if (book) {
                await apiService.saveModuleRecord('books', {
                    ...book,
                    available: Math.min(book.quantity, book.available + 1)
                });
            }
            await apiService.saveModuleRecord('library_transactions', {
                ...transaction,
                status: 'returned',
                returnDate: new Date().toISOString()
            });
            await onLogAction(`Received return of "${book?.title || 'resource'}" from ${getUserName(transaction.userId)}`);
            loadData();
            onDataChange();
        } catch (error: any) {
            console.error('Return error:', error);
            alert(`Return process failed: ${error.message || 'Database connection error'}`);
        } finally {
            setIsProcessing(false);
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

    const getUserObject = (id: string, transaction?: any) => {
        if (!id && !transaction) return null;

        // 1. Try to find in allMembersList
        const fromAll = allMembersList.find(m => 
            m.id === id || 
            (m.userId && m.userId === id) ||
            norm(m.id) === norm(id) || 
            (m.admissionNumber && norm(m.admissionNumber) === norm(id)) ||
            (m.admission_number && norm(m.admission_number) === norm(id)) ||
            (m.staffId && norm(m.staffId) === norm(id)) ||
            (m.userId && norm(m.userId) === norm(id))
        );
        if (fromAll) {
            return fromAll;
        }

        const pool = [...liveUsers, ...users];
        // 2. Try to find user in pool
        let u = pool.find(user => 
            user.id === id || 
            user.staffId === id || 
            user.admissionNumber === id || 
            (user as any).admission_number === id ||
            (user as any).admissionNo === id ||
            (user as any).admNo === id ||
            norm(user.id) === norm(id) ||
            norm(user.admissionNumber) === norm(id) ||
            norm(user.staffId) === norm(id) ||
            (user.name && norm(user.name) === norm(id))
        );

        // 3. Try to find in enrollments
        const en = enrollments.find(e => 
            e.id === id || 
            e.userId === id || 
            e.user_id === id || 
            e.student_id === id || 
            e.admissionNumber === id || 
            e.admission_number === id || 
            e.admissionNo === id || 
            e.admNo === id || 
            e.adm_no === id || 
            e.metadata?.admissionNumber === id ||
            norm(e.admissionNumber) === norm(id) ||
            norm(e.admission_number) === norm(id) ||
            norm(e.admissionNo) === norm(id) ||
            norm(e.admNo) === norm(id) ||
            norm(e.id) === norm(id) ||
            norm(e.userId) === norm(id) ||
            norm(e.student_id) === norm(id) ||
            (e.name && norm(e.name) === norm(id)) ||
            (e.fullName && norm(e.fullName) === norm(id))
        );

        if (en && !u) {
            u = pool.find(user => 
                user.id === en.userId || 
                user.id === en.user_id || 
                user.id === en.student_id ||
                user.admissionNumber === en.admissionNumber ||
                user.admissionNumber === en.admission_number ||
                norm(user.admissionNumber) === norm(en.admissionNumber || en.admission_number || en.admNo || en.metadata?.admissionNumber) ||
                norm(user.name) === norm(extractStudentName(en))
            );
        }

        // 4. Resolve student name
        const transName = extractStudentName(transaction);
        const resolvedName = (u ? extractStudentName(u) : '') || 
                             (en ? extractStudentName(en) : '') || 
                             transName || 
                             (u?.name && !u.name.toLowerCase().includes('student name') ? u.name : '') || 
                             (en?.fullName && !en.fullName.toLowerCase().includes('student name') ? en.fullName : '') || 
                             (en?.name && !en.name.toLowerCase().includes('student name') ? en.name : '') || 
                             (transaction as any)?.userName ||
                             (transaction as any)?.studentName ||
                             (transaction as any)?.borrowerName ||
                             (transaction as any)?.recipientName;

        const admissionNo = (en && (en.admissionNumber || en.admission_number || en.admissionNo || en.admNo || en.metadata?.admissionNumber)) ||
                            (u && (u.admissionNumber || (u as any).admission_number || (u as any).admissionNo || (u as any).admNo || u.staffId)) ||
                            id;

        if (u) {
            return {
                ...u,
                name: resolvedName || u.name || 'Member',
                admissionNumber: admissionNo
            };
        }

        if (en) {
            return {
                id: en.userId || en.user_id || en.student_id || en.id || id,
                name: resolvedName || 'Member',
                admissionNumber: admissionNo,
                role: 'student',
                metadata: en.metadata
            } as any;
        }

        if (resolvedName) {
            return {
                id: id,
                name: resolvedName,
                admissionNumber: admissionNo,
                role: 'student'
            } as any;
        }

        return null;
    };

    const getBookTitle = (id: string) => books.find(b => b.id === id)?.title || 'Unknown Resource';

    const getUserName = (id: string, transaction?: any) => {
        // 1. Check in allMembersList
        const fromAll = allMembersList.find(m => 
            m.id === id || 
            (m.userId && m.userId === id) ||
            norm(m.id) === norm(id) || 
            (m.admissionNumber && norm(m.admissionNumber) === norm(id)) ||
            (m.admission_number && norm(m.admission_number) === norm(id))
        );
        if (fromAll && fromAll.name && !fromAll.name.toLowerCase().includes('unknown user')) return fromAll.name;

        // 2. Check getUserObject
        const u = getUserObject(id, transaction);
        const name = u?.name || extractStudentName(transaction) || (transaction as any)?.userName || (transaction as any)?.studentName || (transaction as any)?.borrowerName;
        if (name && !name.toLowerCase().includes('unknown user')) return name;
        
        // 3. If still unknown, check if id matches admission number or enrollment
        if (id) {
            const en = enrollments.find(e => 
                norm(e.admissionNumber) === norm(id) || 
                norm(e.admission_number) === norm(id) ||
                norm(e.admNo) === norm(id) ||
                norm(e.id) === norm(id) ||
                norm(e.userId) === norm(id)
            );
            if (en) {
                const enName = extractStudentName(en);
                if (enName) return enName;
            }
        }
        return name || 'Member';
    };

    const getUserStaffId = (id: string, transaction?: any) => {
        const u = getUserObject(id, transaction);
        const enrollment = enrollments.find(e => 
            e.userId === id || 
            e.user_id === id || 
            e.student_id === id || 
            e.id === id ||
            (u && (e.userId === u.id || e.user_id === u.id || e.student_id === u.id || norm(e.fullName || e.name) === norm(u.name)))
        );
        const admissionNo = enrollment ? (enrollment.admissionNumber || enrollment.admission_number || enrollment.admNo || enrollment.metadata?.admissionNumber) : '';
        let idCode = admissionNo || u?.admissionNumber || (u as any)?.admission_number || u?.staffId || (u as any)?.studentId || (u as any)?.admNo;
        if (!idCode || idCode === 'N/A' || idCode === 'No ADM') {
            idCode = id ? (id.startsWith('usr_') || id.startsWith('enr_') ? `ADM-${id.slice(-4).toUpperCase()}` : id) : 'N/A';
        }
        const classStr = getStudentClassString((u || {}) as User, enrollment);
        return idCode + (classStr ? ` • ${classStr}` : '');
    };

    // Filtered Active Circulation Records
    const filteredCirculation = useMemo(() => {
        const activeLoans = transactions.filter(t => t.status === 'issued' || t.status === 'overdue');
        const query = circulationSearch.trim().toLowerCase();

        return activeLoans.filter(t => {
            const isOverdue = new Date(t.dueDate) < new Date();
            if (circulationStatusFilter === 'overdue' && !isOverdue) return false;
            if (circulationStatusFilter === 'issued' && isOverdue) return false;

            if (!query) return true;

            const name = getUserName(t.userId, t).toLowerCase();
            const staffId = getUserStaffId(t.userId, t).toLowerCase();
            const bookTitle = getBookTitle(t.bookId).toLowerCase();
            const accession = (books.find(b => b.id === t.bookId)?.accessionNumber || '').toLowerCase();
            const isbn = (books.find(b => b.id === t.bookId)?.isbn || '').toLowerCase();

            return name.includes(query) || 
                   staffId.includes(query) || 
                   bookTitle.includes(query) || 
                   accession.includes(query) || 
                   isbn.includes(query) ||
                   t.userId.toLowerCase().includes(query);
        });
    }, [transactions, circulationSearch, circulationStatusFilter, users, enrollments, books]);

    const activeCirculationCounts = useMemo(() => {
        const activeLoans = transactions.filter(t => t.status === 'issued' || t.status === 'overdue');
        const overdueCount = activeLoans.filter(t => new Date(t.dueDate) < new Date()).length;
        const regularIssuedCount = activeLoans.length - overdueCount;
        return {
            total: activeLoans.length,
            regular: regularIssuedCount,
            overdue: overdueCount
        };
    }, [transactions]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Stats Wrapper */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Active Issues Table */}
                <div className="flex-grow space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Circulation</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Lent items awaiting retrieval</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleBulkReminders}
                                disabled={isProcessing}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-5 h-12 rounded-2xl flex items-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50 border border-amber-300/60 cursor-pointer"
                            >
                                <BellIcon className="w-4 h-4 text-amber-600" />
                                Bulk Prompt Overdue
                            </button>
                            <button
                                onClick={() => setIsBulkIssuing(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 h-12 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all font-black uppercase text-[10px] tracking-widest cursor-pointer"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Bulk Issuance
                            </button>
                            <button
                                onClick={() => setIsIssuing(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-12 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all font-black uppercase text-[10px] tracking-widest cursor-pointer"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Launch Issuance Registry
                            </button>
                        </div>
                    </div>

                    {/* SEARCH & FILTER BAR */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <SearchIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search active circulation by recipient name, admission number, book title, accession number..."
                                value={circulationSearch}
                                onChange={(e) => setCirculationSearch(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            {circulationSearch && (
                                <button
                                    onClick={() => setCirculationSearch('')}
                                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-0.5 cursor-pointer"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shrink-0">
                            <button
                                onClick={() => setCirculationStatusFilter('all')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    circulationStatusFilter === 'all'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                All ({activeCirculationCounts.total})
                            </button>
                            <button
                                onClick={() => setCirculationStatusFilter('issued')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    circulationStatusFilter === 'issued'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                Current ({activeCirculationCounts.regular})
                            </button>
                            <button
                                onClick={() => setCirculationStatusFilter('overdue')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    circulationStatusFilter === 'overdue'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                Overdue ({activeCirculationCounts.overdue})
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Resource</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Context</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Deadline</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {filteredCirculation.map(transaction => {
                                    const isOverdue = new Date(transaction.dueDate) < new Date();
                                    return (
                                        <tr key={transaction.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">
                                                        {getUserName(transaction.userId, transaction).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getUserName(transaction.userId, transaction)}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{getUserStaffId(transaction.userId, transaction)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getBookTitle(transaction.bookId)}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded">
                                                        {books.find(b => b.id === transaction.bookId)?.accessionNumber || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                {new Date(transaction.issueDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`flex items-center gap-2 ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    <ClockIcon className="w-4 h-4" />
                                                    <span className="text-xs font-black uppercase tracking-tight">{new Date(transaction.dueDate).toLocaleDateString()}</span>
                                                    {isOverdue && <span className="text-[8px] px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded-full font-black animate-pulse">OVERDUE</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSendReminder(transaction)}
                                                        className={`p-2.5 rounded-xl transition-all cursor-pointer ${isOverdue ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}
                                                        title="Send SMS Reminder"
                                                    >
                                                        <BellIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReturnBook(transaction)}
                                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                    >
                                                        Process Return
                                                    </button>
                                                    {transaction.memberSignature && (
                                                        <div className="group relative">
                                                            <button className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl" title="View Confirmation Signature">
                                                                <EyeIcon className="w-4 h-4" />
                                                            </button>
                                                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-slate-800 border rounded-xl shadow-xl hidden group-hover:block z-50">
                                                                <img loading="lazy" src={transaction.memberSignature} className="w-32 h-16 object-contain" alt="Signature" />
                                                                <p className="text-[8px] font-black uppercase text-center text-slate-400 mt-1">Receipt Confirm</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredCirculation.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
                                            {circulationSearch ? `No circulation records matching "${circulationSearch}"` : 'No active loans found in registry'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar - History & Quick Scan */}
                <div className="lg:w-96 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                                <QrCodeIcon className="w-5 h-5" />
                            </div>
                            <h4 className="font-black uppercase tracking-tight text-sm">Quick Intake</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Scan the book QR code or ISBN to instantly pull up return context or issue registry.</p>
                        <div className="relative group mb-4">
                            <input
                                type="text"
                                placeholder="Scan or Enter Accession ID..."
                                value={scanSearch}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setScanSearch(val);
                                    const foundBook = books.find(b => b.accessionNumber === val);
                                    if (foundBook) {
                                        setIsIssuing(true);
                                        setNewLoan(prev => ({ ...prev, bookId: foundBook.id }));
                                        setScanSearch('');
                                    }
                                }}
                                className="w-full px-5 py-4 bg-slate-900 border-2 border-indigo-500/30 focus:border-indigo-500 rounded-2xl text-xs font-black text-white uppercase placeholder:text-slate-600 outline-none transition-all"
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900/10 dark:from-black/40 rounded-[2rem] pointer-events-none" />
                            <div className="aspect-square bg-slate-900 flex flex-col items-center justify-center rounded-[2rem] border-4 border-slate-800 relative z-10 transition-transform group-hover:scale-95 duration-500">
                                <QrCodeIcon className="w-16 h-16 text-indigo-500/40" />
                                <div className="absolute top-4 inset-x-4 h-1 bg-indigo-500/20 animate-scan pointer-events-none" />
                            </div>
                        </div>
                        <button
                            onClick={() => alert("Scanner hardware layer initialization requested. In a live production environment, this would activate the device camera.")}
                            className="w-full mt-6 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                            Initialize Camera Scanner
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="font-black uppercase tracking-tight text-sm mb-6 flex items-center justify-between">
                            Recent History
                            <ArrowPathIcon className="w-4 h-4 text-slate-400" />
                        </h4>
                        <div className="space-y-4">
                            {transactions.filter(t => t.status === 'returned').slice(0, 5).map(t => (
                                <div key={t.id} className="flex gap-3">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg h-fit">
                                        <ArrowPathIcon className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{getBookTitle(t.bookId)}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Returned By {getUserName(t.userId).split(' ')[0]}</p>
                                    </div>
                                    <p className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{new Date(t.returnDate!).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Issuance Registry Modal */}
            {isIssuing && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-700">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-indigo-600">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Issuance Registry
                                </h3>
                                <p className="text-xs font-bold text-indigo-100 uppercase tracking-[0.2em] mt-1">Lending resource to member</p>
                            </div>
                            <button onClick={() => setIsIssuing(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all" aria-label="Close">
                                <XIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleIssueBook} className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
                            {/* Member Identity Card */}
                            {newLoan.userId && (() => {
                                const member = allMembersList.find(m => m.id === newLoan.userId || m.userId === newLoan.userId) || getUserObject(newLoan.userId);
                                if (!member) return null;
                                return (
                                    <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                                        <div className="flex-shrink-0">
                                            {member.profilePhotoUrl ? (
                                                <img loading="lazy"
                                                    src={member.profilePhotoUrl}
                                                    alt={member.name}
                                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-lg"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-700">
                                                    <span className="text-2xl font-black text-white">{member.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Member Identified</p>
                                            </div>
                                            <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5 truncate">{member.name}</p>
                                            <p className="text-xs font-bold text-slate-500 font-mono">
                                                {member.admissionNumber || member.admission_number || member.staffId || 'No ID'}
                                                {member.classStr ? ` • ${member.classStr}` : ''}
                                            </p>
                                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{(member.role || 'Member').replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Member Registry</label>
                                        <span className="text-[9px] font-bold text-indigo-500 font-mono">
                                            {allMembersList.length} Patrons Registered
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by student name, admission number, grade/class, staff ID..."
                                            value={memberSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setMemberSearch(val);

                                                // Automatic QR Matching
                                                try {
                                                    const qrData = JSON.parse(val);
                                                    if (qrData.type === 'member' && qrData.id) {
                                                        setNewLoan(prev => ({ ...prev, userId: qrData.id }));
                                                        const foundUser = allMembersList.find(u => u.id === qrData.id || u.userId === qrData.id);
                                                        if (foundUser) setMemberSearch(foundUser.name);
                                                        return;
                                                    }
                                                } catch (e) { }

                                                const trimmed = val.trim().toLowerCase();
                                                if (!trimmed) {
                                                    setNewLoan(prev => ({ ...prev, userId: '' }));
                                                    return;
                                                }

                                                // Exact match auto-select
                                                const exact = allMembersList.find(m => {
                                                    const idCode = (m.admissionNumber || m.admission_number || m.staffId || '').toLowerCase();
                                                    return m.name.toLowerCase() === trimmed || idCode === trimmed;
                                                });

                                                if (exact) {
                                                    setNewLoan(prev => ({ ...prev, userId: exact.id }));
                                                }
                                            }}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none pr-20"
                                        />
                                        <div className="absolute right-4 top-4 flex items-center gap-2">
                                            {memberSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMemberSearch('');
                                                        setNewLoan(prev => ({ ...prev, userId: '' }));
                                                    }}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-black p-1 cursor-pointer"
                                                    title="Clear search"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                            <SearchIcon className="w-5 h-5 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Instant Search Suggestions for Member */}
                                    {memberSearch.trim().length > 0 && !newLoan.userId && (() => {
                                        const searchTokens = memberSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
                                        const suggestions = allMembersList.filter(m => {
                                            const name = (m.name || '').toLowerCase();
                                            const adm = (m.admissionNumber || m.admission_number || m.staffId || '').toLowerCase();
                                            const classStr = (m.classStr || m.classDisplay || '').toLowerCase();
                                            const phone = (m.phoneNumber || '').toLowerCase();
                                            const email = (m.email || '').toLowerCase();
                                            const searchable = `${name} ${adm} ${classStr} ${phone} ${email}`;
                                            return searchTokens.every(token => searchable.includes(token));
                                        }).slice(0, 15);

                                        if (suggestions.length === 0) {
                                            return (
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 text-center animate-fade-in">
                                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                                        No patron found matching "{memberSearch}". Check the dropdown below or try admission number.
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 shadow-md max-h-60 overflow-y-auto animate-fade-in">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1 flex items-center justify-between">
                                                    <span>Matching Patrons — Click to select:</span>
                                                    <span>{suggestions.length} found</span>
                                                </p>
                                                {suggestions.map(s => {
                                                    const idCode = s.admissionNumber || s.admission_number || s.staffId || 'No ID';
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            onClick={() => {
                                                                setNewLoan(prev => ({ ...prev, userId: s.id }));
                                                                setMemberSearch(s.name);
                                                            }}
                                                            className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer transition-all border border-transparent hover:border-indigo-200"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                                                                    {s.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none truncate">{s.name}</p>
                                                                    <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5 truncate">
                                                                        {idCode} {s.classStr ? `• ${s.classStr}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 dark:bg-indigo-900/40 px-2 py-1 rounded-md shrink-0">
                                                                Select
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}

                                    <select
                                        required
                                        value={newLoan.userId}
                                        onChange={(e) => {
                                            setNewLoan({ ...newLoan, userId: e.target.value });
                                            const m = allMembersList.find(member => member.id === e.target.value || member.userId === e.target.value);
                                            if (m) setMemberSearch(m.name);
                                        }}
                                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold mt-2 outline-none border-none text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="">-- Or select from all {allMembersList.length} patrons --</option>
                                        {allMembersList.filter(m => {
                                            if (m.id === newLoan.userId) return true;
                                            if (!memberSearch.trim()) return true;
                                            const searchTokens = memberSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
                                            const name = (m.name || '').toLowerCase();
                                            const adm = (m.admissionNumber || m.admission_number || m.staffId || '').toLowerCase();
                                            const classStr = (m.classStr || m.classDisplay || '').toLowerCase();
                                            const searchable = `${name} ${adm} ${classStr}`;
                                            return searchTokens.every(token => searchable.includes(token));
                                        }).map(m => {
                                            const idCode = m.admissionNumber || m.admission_number || m.staffId || 'No ID';
                                            return (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} ({idCode}{m.classStr ? ` · ${m.classStr}` : ''})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Catalogued Resource</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search by Title, Author, ISBN or scan QR/Accession..."
                                            value={bookSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setBookSearch(val);

                                                // QR / Accession exact match (auto-select)
                                                const upper = val.toUpperCase();
                                                const exactAccession = books.find(b => b.accessionNumber === upper);
                                                if (exactAccession) {
                                                    setNewLoan(prev => ({ ...prev, bookId: exactAccession.id }));
                                                    setBookSearch(`[${exactAccession.accessionNumber}] ${exactAccession.title}`);
                                                    return;
                                                }

                                                // Try parsing as QR JSON
                                                try {
                                                    const qrData = JSON.parse(val);
                                                    if (qrData.accessionNumber) {
                                                        const found = books.find(b => b.accessionNumber === qrData.accessionNumber);
                                                        if (found) {
                                                            setNewLoan(prev => ({ ...prev, bookId: found.id }));
                                                            setBookSearch(`[${found.accessionNumber}] ${found.title}`);
                                                            return;
                                                        }
                                                    }
                                                } catch (e) { }

                                                const trimmed = val.trim().toLowerCase();
                                                if (!trimmed) {
                                                    setNewLoan(prev => ({ ...prev, bookId: '' }));
                                                    return;
                                                }

                                                // Partial or Single match for book
                                                const availableMatches = books.filter(b => {
                                                    if (b.available < 1) return false;
                                                    return (
                                                        b.title.toLowerCase().includes(trimmed) ||
                                                        b.author.toLowerCase().includes(trimmed) ||
                                                        (b.isbn || '').toLowerCase().includes(trimmed) ||
                                                        (b.accessionNumber || '').toLowerCase().includes(trimmed)
                                                    );
                                                });

                                                const exactMatch = availableMatches.find(b => 
                                                    b.title.toLowerCase() === trimmed || 
                                                    (b.accessionNumber || '').toLowerCase() === trimmed || 
                                                    (b.isbn || '').toLowerCase() === trimmed
                                                );

                                                if (exactMatch) {
                                                    setNewLoan(prev => ({ ...prev, bookId: exactMatch.id }));
                                                } else if (availableMatches.length === 1 && trimmed.length >= 3) {
                                                    setNewLoan(prev => ({ ...prev, bookId: availableMatches[0].id }));
                                                }
                                            }}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                                        />
                                        <div className="absolute right-4 top-4 text-slate-400">
                                            <SearchIcon className="w-5 h-5" />
                                        </div>
                                    </div>

                                    {/* Instant Search Suggestions for Book */}
                                    {bookSearch.trim().length > 0 && !newLoan.bookId && (() => {
                                        const trimmed = bookSearch.trim().toLowerCase();
                                        const suggestions = books.filter(b => {
                                            if (b.available < 1) return false;
                                            return (
                                                b.title.toLowerCase().includes(trimmed) ||
                                                b.author.toLowerCase().includes(trimmed) ||
                                                (b.isbn || '').toLowerCase().includes(trimmed) ||
                                                (b.accessionNumber || '').toLowerCase().includes(trimmed)
                                            );
                                        }).slice(0, 5);

                                        if (suggestions.length === 0) return null;
                                        return (
                                            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 shadow-md animate-fade-in">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">Available Copies — Click to select:</p>
                                                {suggestions.map(bk => (
                                                    <div
                                                        key={bk.id}
                                                        onClick={() => {
                                                            setNewLoan(prev => ({ ...prev, bookId: bk.id }));
                                                            setBookSearch(`[${bk.accessionNumber}] ${bk.title}`);
                                                        }}
                                                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer transition-all border border-transparent hover:border-indigo-200"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-7 h-8 bg-indigo-600 rounded flex items-center justify-center flex-shrink-0 text-white">
                                                                <BookOpenIcon className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{bk.title}</p>
                                                                <p className="text-[10px] text-slate-500 truncate">by {bk.author} • [{bk.accessionNumber}]</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-1 rounded-md flex-shrink-0">
                                                            {bk.available} In Stock
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    <select
                                        required
                                        value={newLoan.bookId}
                                        onChange={(e) => {
                                            const book = books.find(b => b.id === e.target.value);
                                            setNewLoan({ ...newLoan, bookId: e.target.value });
                                            if (book) setBookSearch(`[${book.accessionNumber}] ${book.title}`);
                                        }}
                                        className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold mt-2 outline-none border-none"
                                    >
                                        <option value="">-- Or select from list --</option>
                                        {books.filter(b => {
                                            if (b.id === newLoan.bookId) return true;
                                            if (b.available < 1) return false;
                                            const search = bookSearch.toLowerCase();
                                            if (!search) return true;
                                            return (
                                                b.title.toLowerCase().includes(search) ||
                                                b.author.toLowerCase().includes(search) ||
                                                (b.isbn || '').toLowerCase().includes(search) ||
                                                (b.accessionNumber || '').toLowerCase().includes(search) ||
                                                (b.category || '').toLowerCase().includes(search)
                                            );
                                        }).map(book => (
                                            <option key={book.id} value={book.id}>
                                                [{book.accessionNumber}] {book.title} — {book.author} ({book.available} avail.)
                                            </option>
                                        ))}
                                    </select>
                                    {/* Book Identity Card */}
                                    {newLoan.bookId && (() => {
                                        const book = books.find(b => b.id === newLoan.bookId);
                                        if (!book) return null;
                                        return (
                                            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 animate-fade-in">
                                                <div className="w-10 h-12 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow">
                                                    <BookOpenIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{book.title}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 truncate">by {book.author}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-black text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{book.accessionNumber}</span>
                                                        <span className="text-[9px] font-black text-emerald-600">{book.available} Available</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lending Deadline</label>
                                    <input
                                        type="date" required
                                        value={newLoan.dueDate}
                                        onChange={(e) => setNewLoan({ ...newLoan, dueDate: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Digital Signature</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const ctx = signatureCanvasRef.current?.getContext('2d');
                                                if (ctx && signatureCanvasRef.current) {
                                                    ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
                                                    setHasSigned(false);
                                                }
                                            }}
                                            className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <canvas
                                        ref={signatureCanvasRef}
                                        width={450}
                                        height={120}
                                        className="w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 touch-none cursor-crosshair"
                                    />
                                    {hasSigned ? (
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" /> Signature Captured
                                        </p>
                                    ) : (
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Member must sign to confirm receipt</p>
                                    )}
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" disabled={isProcessing} onClick={() => setIsIssuing(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50">Discard</button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </div>
                                    ) : 'Commit Issuance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {isBulkIssuing && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-5xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-indigo-650 text-white flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">
                                    Bulk Issuance Registry
                                </h3>
                                <p className="text-xs font-bold text-indigo-100 uppercase tracking-[0.2em] mt-1">Issue resources to multiple members</p>
                            </div>
                            <button onClick={() => setIsBulkIssuing(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-all" aria-label="Close">
                                <XIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
                            {/* Parameters panel */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[2rem] space-y-4 border border-slate-100/50 dark:border-slate-700/50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">1. Select Resource & Due Date</h4>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400">Target Book Title</label>
                                        <select
                                            value={bulkBookTitle}
                                            onChange={(e) => {
                                                setBulkBookTitle(e.target.value);
                                                setBulkAllocations({});
                                                setSelectedStudentIds([]);
                                            }}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold outline-none border border-slate-150 dark:border-slate-750 text-slate-800 dark:text-white"
                                        >
                                            <option value="">-- Choose Book Title --</option>
                                            {uniqueBookTitles.map((b, i) => (
                                                <option key={i} value={b.title}>
                                                    {b.title} {b.author ? `by ${b.author}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {bulkBookTitle && (
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                                            📚 {availableCopies.length} physical copies available in inventory.
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400">Due Date</label>
                                        <input
                                            type="date"
                                            value={bulkDueDate}
                                            onChange={(e) => setBulkDueDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold outline-none border border-slate-150 dark:border-slate-750 text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[2rem] space-y-4 border border-slate-100/50 dark:border-slate-700/50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">2. Filter Recipients</h4>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBulkCriteria('class');
                                                setSelectedStudentIds([]);
                                                setBulkAllocations({});
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                bulkCriteria === 'class'
                                                ? 'bg-indigo-650 text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-850 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            Class / Stream
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBulkCriteria('course');
                                                setSelectedStudentIds([]);
                                                setBulkAllocations({});
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                bulkCriteria === 'course'
                                                ? 'bg-indigo-650 text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-855 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            Course
                                        </button>
                                    </div>

                                    {bulkCriteria === 'class' ? (
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Target Class</label>
                                            <select
                                                value={selectedClass}
                                                onChange={(e) => {
                                                    setSelectedClass(e.target.value);
                                                    setSelectedStudentIds([]);
                                                    setBulkAllocations({});
                                                }}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold outline-none border border-slate-150 dark:border-slate-750 text-slate-800 dark:text-white"
                                            >
                                                <option value="">-- Select Class/Stream --</option>
                                                {classOptions.map((c, i) => (
                                                    <option key={i} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Target Course</label>
                                            <select
                                                value={selectedCourse}
                                                onChange={(e) => {
                                                    setSelectedCourse(e.target.value);
                                                    setSelectedStudentIds([]);
                                                    setBulkAllocations({});
                                                }}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold outline-none border border-slate-150 dark:border-slate-750 text-slate-800 dark:text-white"
                                            >
                                                <option value="">-- Select Course --</option>
                                                {courses.map((c, i) => (
                                                    <option key={i} value={c.id}>{c.name || c.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Spreadsheet Grid panel */}
                            <div className="lg:col-span-3 flex flex-col h-full space-y-4 min-h-[300px]">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">3. Map Books & Confirm</h4>
                                    {bulkBookTitle && filteredStudentsList.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleAutoAllocate}
                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                        >
                                            ⚡ Auto-Allocate Copies
                                        </button>
                                    )}
                                </div>

                                <div className="flex-grow border border-slate-150 dark:border-slate-700/60 rounded-[2rem] overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-900/10">
                                    {filteredStudentsList.length === 0 ? (
                                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
                                            <span className="text-3xl">👥</span>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">No recipients match current filters</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Please select a book and filter criteria to load students.</p>
                                        </div>
                                    ) : (
                                        <div className="flex-grow overflow-y-auto max-h-[45vh]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-200 dark:border-slate-700">
                                                        <th className="p-4 text-center w-12 border-r border-slate-200 dark:border-slate-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStudentIds.length === filteredStudentsList.length && filteredStudentsList.length > 0}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedStudentIds(filteredStudentsList.map(s => s.id));
                                                                    } else {
                                                                        setSelectedStudentIds([]);
                                                                        setBulkAllocations({});
                                                                    }
                                                                }}
                                                                className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="p-4">Student Name</th>
                                                        <th className="p-4">Accession Number Assignment</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 dark:divide-slate-700">
                                                    {filteredStudentsList.map(student => {
                                                        const enrollment = enrollments.find(e => e.userId === student.id || e.student_id === student.id);
                                                        const admissionNo = enrollment ? (enrollment.admissionNumber || enrollment.admission_number || enrollment.admNo) : 'No Adm';
                                                        const hasActiveLoan = transactions.some(t =>
                                                            t.userId === student.id &&
                                                            books.find(b => b.id === t.bookId)?.title?.trim()?.toLowerCase() === bulkBookTitle?.trim()?.toLowerCase() &&
                                                            (t.status === 'issued' || t.status === 'overdue')
                                                        );
                                                        
                                                        const isSelected = selectedStudentIds.includes(student.id);

                                                        return (
                                                            <tr key={student.id} className={`text-xs transition-colors hover:bg-slate-100/30 dark:hover:bg-slate-800/10 ${hasActiveLoan ? 'opacity-50 bg-rose-50/20' : ''}`}>
                                                                <td className="p-4 text-center border-r border-slate-150 dark:border-slate-700/60">
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={hasActiveLoan}
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedStudentIds(prev => [...prev, student.id]);
                                                                            } else {
                                                                                setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                                                                setBulkAllocations(prev => {
                                                                                    const updated = { ...prev };
                                                                                    delete updated[student.id];
                                                                                    return updated;
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="p-4">
                                                                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{student.name}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">
                                                                        {admissionNo} {getStudentClassString(student, enrollment) ? `• ${getStudentClassString(student, enrollment)}` : ''}
                                                                    </p>
                                                                    {hasActiveLoan && (
                                                                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block mt-1">⚠️ Already has an active copy</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <select
                                                                        disabled={!isSelected}
                                                                        value={bulkAllocations[student.id] || ''}
                                                                        onChange={(e) => {
                                                                            setBulkAllocations(prev => ({
                                                                                ...prev,
                                                                                [student.id]: e.target.value
                                                                            }));
                                                                        }}
                                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 rounded-xl text-xs font-bold outline-none border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white cursor-pointer"
                                                                    >
                                                                        <option value="">-- Select Accession Copy --</option>
                                                                        {availableCopies.map(copy => {
                                                                            const isUsedByOther = Object.entries(bulkAllocations).some(([sId, bId]) => bId === copy.id && sId !== student.id);
                                                                            return (
                                                                                <option key={copy.id} value={copy.id} disabled={isUsedByOther}>
                                                                                    [{copy.accessionNumber}] {copy.location ? `· ${copy.location}` : ''} {isUsedByOther ? '(Allocated)' : ''}
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-50 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 flex-shrink-0">
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setIsBulkIssuing(false)}
                                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                disabled={isProcessing || selectedStudentIds.length === 0}
                                onClick={handlePostBulkIssuance}
                                className="px-8 py-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
                            >
                                {isProcessing ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Processing Bulk...
                                    </div>
                                ) : `Issue to ${selectedStudentIds.length} members`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(300px); opacity: 0; }
                }
                .animate-scan { animation: scan 2s linear infinite; }
            `}</style>
        </div>
    );
};

