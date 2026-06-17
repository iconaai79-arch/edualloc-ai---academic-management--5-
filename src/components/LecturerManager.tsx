import React, { useState, useRef, useMemo, useEffect } from 'react';
import type {
    User, Role, SmsConfig, Department, Unavailability, Course,
    CourseLevel, UserMappingField, StaffImportPreviewUser, Institution,
    AllocationRequest, Priority, Subject, UserUpdateData, LetterheadConfig
} from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { EyeIcon } from './icons/EyeIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { analyzeUserSpreadsheet } from '../services/geminiService';
import { EditUserModal } from './EditUserModal';
import { ManageLessonsModal } from './ManageLessonsModal';
import { getRolesForInstitution, formatRoleDisplayName, isSchoolInstitution } from '../utils/roleUtils';

import * as XLSX from 'xlsx';

const parseExpertise = (expertiseString: string): string[] => {
    if (!expertiseString || typeof expertiseString !== 'string') return [];
    return expertiseString.split(',').map(item => item.trim()).filter(Boolean);
};

const VALID_STAFF_ROLES: Role[] = ['admin', 'deputy', 'hod', 'tto', 'lecturer', 'practice_teacher', 'academics_officer', 'head_teacher', 'dos', 'teacher', 'librarian', 'security', 'info_desk', 'store', 'driver', 'transport_assistant', 'managing_director'];
const ROLES_REQUIRING_DEPARTMENT: Role[] = ['admin', 'deputy', 'hod', 'lecturer', 'tto', 'head_teacher', 'dos', 'teacher'];

const REQUIRED_USER_MAPPING_FIELDS: UserMappingField[] = ['name', 'role'];
const ALL_USER_MAPPING_FIELDS: UserMappingField[] = ['name', 'email', 'phoneNumber', 'staffId', 'role', 'departmentName', 'expertise', 'gender'];

interface SmartUserImporterModalProps {
    onClose: () => void;
    onImport: (users: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    existingUsers: User[];
    departments: Department[];
    currentInstitution?: Institution | null;
    currentUser: User;
}

const SmartUserImporterModal: React.FC<SmartUserImporterModalProps> = ({ onClose, onImport, existingUsers, departments, currentInstitution, currentUser }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<UserMappingField, string | null>>(ALL_USER_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<UserMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ valid: StaffImportPreviewUser[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const departmentNameMap = useMemo(() => new Map(departments.map(d => [d.name.toLowerCase().trim(), d.id])), [departments]);
    const existingUserEmails = useMemo(() => new Set(existingUsers.map(u => u.email.toLowerCase())), [existingUsers]);
    const existingUserStaffIds = useMemo(() => new Set<string>(existingUsers.map(u => u.staffId?.toLowerCase()).filter((id): id is string => !!id)), [existingUsers]);
    const institutionDomain = useMemo(() => currentInstitution?.email?.split('@')[1] || 'institution.edu', [currentInstitution]);

    const availableRolesForImport = useMemo(() => {
        return getRolesForInstitution(currentInstitution);
    }, [currentInstitution]);

    const generateUniqueStaffId = (base: string, existingIds: Set<string>): string => {
        let newId = base;
        let counter = 1;
        while (existingIds.has(newId.toLowerCase())) {
            newId = `${base}${counter}`;
            counter++;
        }
        existingIds.add(newId.toLowerCase());
        return newId;
    };

    const generateUniqueEmail = (name: string, domain: string, existingEmails: Set<string>): string => {
        const baseEmail = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.') + '@' + domain;
        let newEmail = baseEmail;
        let counter = 1;
        while (existingEmails.has(newEmail.toLowerCase())) {
            newEmail = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.') + counter + '@' + domain;
            counter++;
        }
        existingEmails.add(newEmail.toLowerCase());
        return newEmail;
    };

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing');
        setErrorMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty.");

                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                const mapping = await analyzeUserSpreadsheet(headers, currentInstitution?.aiModelTier);
                setUserMapping(mapping as Record<UserMappingField, string | null>);
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to process spreadsheet.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: UserMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev!, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_USER_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.join(', ')}.`);
            return;
        }

        setStep('importing');

        const validUsers: StaffImportPreviewUser[] = [];
        const invalidRows: { row: any, error: string }[] = [];
        const currentBatchStaffIds = new Set<string>();
        const currentBatchUserEmails = new Set<string>();

        rawData.forEach((row, index) => {
            try {
                const rowNum = index + 2;
                const name = String(row[userMapping.name!] || '').trim();
                if (!name) throw new Error("Missing Name");

                let email = userMapping.email ? String(row[userMapping.email!] || '').trim() : '';
                let staffId = userMapping.staffId ? String(row[userMapping.staffId!] || '').trim() : '';
                let roleStr = userMapping.role ? String(row[userMapping.role!] || '').trim().toLowerCase().replace(/\s+/g, '_') : 'lecturer';
                let role = roleStr as Role;

                if (!availableRolesForImport.includes(role)) role = 'lecturer';

                if (!staffId) {
                    staffId = generateUniqueStaffId(`STAFF-${name.substring(0, 2).toUpperCase()}`, new Set([...existingUserStaffIds, ...currentBatchStaffIds]));
                }
                currentBatchStaffIds.add(staffId.toLowerCase());

                let generatedEmail = false;
                if (!email) {
                    email = generateUniqueEmail(name, institutionDomain, new Set([...existingUserEmails, ...currentBatchUserEmails]));
                    generatedEmail = true;
                } else if (existingUserEmails.has(email.toLowerCase()) || currentBatchUserEmails.has(email.toLowerCase())) {
                    throw new Error(`Duplicate email: ${email}`);
                }
                currentBatchUserEmails.add(email.toLowerCase());

                let departmentId: string | undefined;
                if (userMapping.departmentName) {
                    const deptName = String(row[userMapping.departmentName!] || '').toLowerCase().trim();
                    departmentId = departmentNameMap.get(deptName);
                }

                validUsers.push({
                    originalRowIndex: rowNum,
                    name,
                    email,
                    phoneNumber: userMapping.phoneNumber ? String(row[userMapping.phoneNumber!] || '') : '',
                    staffId,
                    role,
                    departmentId,
                    expertise: userMapping.expertise ? parseExpertise(String(row[userMapping.expertise!] || '')) : [],
                    gender: 'Male',
                    generatedStaffId: !userMapping.staffId,
                    generatedEmail: generatedEmail
                });
            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });
        setParsedData({ valid: validUsers, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;
        setStep('finalizing');
        setImportProgress(0);

        try {
            const sanitizedUsers = parsedData.valid.map(({
                originalRowIndex, generatedStaffId, generatedEmail, originalRoleValue, ...user
            }) => user);

            setImportProgress(20);
            await onImport(sanitizedUsers);
            setImportProgress(80);
            await new Promise(r => setTimeout(r, 800));
            setImportProgress(100);
            setStep('success');
        } catch (error: any) {
            console.error("Import error:", error);
            setErrorMessage(error.message || "Failed to save staff records to the database.");
            setStep('error');
        }
    };

    const finalizingMessages = useMemo(() => {
        if (importProgress < 30) return "Validating institutional schema...";
        if (importProgress < 60) return "Encrypting member credentials...";
        if (importProgress < 90) return "Syncing with cloud database...";
        return "Finalizing records...";
    }, [importProgress]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">Smart Staff Importer</h3>
                    {step !== 'finalizing' && <button onClick={onClose}><XIcon className="w-6 h-6" /></button>}
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-lg">
                            <h4 className="text-lg font-semibold">Upload Staff File</h4>
                            <input type="file" onChange={e => e.target.files && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls" className="mt-6 file-input" />
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center p-10 flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h4 className="text-lg font-semibold">Processing spreadsheet...</h4>
                        </div>
                    )}

                    {step === 'finalizing' && (
                        <div className="text-center p-10 flex flex-col items-center max-w-md mx-auto">
                            <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Importing Users</h4>
                            <p className="text-sm text-slate-500 mb-6">{finalizingMessages}</p>

                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                                <div
                                    className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${importProgress}%` }}
                                ></div>
                            </div>

                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {importProgress}% Complete
                            </p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center p-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-full flex items-center justify-center mb-6">
                                <CheckCircleIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Import Complete!</h4>
                            <p className="text-slate-500 mb-8">
                                {parsedData?.valid.length} staff members have been successfully registered to your institution.
                            </p>
                            <button onClick={onClose} className="btn-primary px-8">Return to Dashboard</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center p-10 bg-red-50 dark:bg-red-900/50 rounded-lg">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-lg font-semibold text-red-700 dark:text-red-300">Import Failed</h4>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errorMessage}</p>
                            <button onClick={() => setStep('upload')} className="mt-6 btn-secondary">Try Again</button>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Map columns from your file. Skip fields to auto-generate them.</p>
                            {ALL_USER_MAPPING_FIELDS.map(field => (
                                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                                    <label className="text-right text-sm font-medium capitalize">
                                        {field.replace(/([A-Z])/g, ' $1')}
                                        {field === 'email' && <span className="text-xs text-[var(--color-primary)] ml-1">(Auto-gen if empty)</span>}
                                        :
                                    </label>
                                    <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="form-select">
                                        <option value="">-- Skip / Auto-generate --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                            <button onClick={handleConfirmMapping} className="btn-primary w-full mt-4">Preview Import</button>
                        </div>
                    )}

                    {step === 'preview' && parsedData && (
                        <div className="space-y-4">
                            <h4 className="font-bold">Ready to Import ({parsedData.valid.length})</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 dark:bg-slate-700">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase">Email</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold uppercase">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedData.valid.map((u, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-sm">{u.name}</td>
                                                <td className="px-3 py-2 text-sm">
                                                    {u.email}
                                                    {u.generatedEmail && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">Generated</span>}
                                                </td>
                                                <td className="px-3 py-2 text-sm capitalize">{formatRoleDisplayName(u.role, currentInstitution)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={handleFinalImport} className="btn-primary w-full mt-4 h-12 text-lg">Finalize Import</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ManageParentsModalProps {
    student: User;
    allUsers: User[];
    onClose: () => void;
    onAddParent: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent: (studentId: string, parentId: string) => void;
}

const ManageParentsModal: React.FC<ManageParentsModalProps> = ({ student, allUsers, onClose, onAddParent, onDeleteParent }) => {
    const [parentName, setParentName] = useState('');
    const [parentEmail, setParentEmail] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [newCredentials, setNewCredentials] = useState<{ email: string, password: string } | null>(null);
    const [error, setError] = useState('');

    const linkedParents = useMemo(() => {
        return allUsers.filter(u => student.parentIds?.includes(u.id));
    }, [allUsers, student.parentIds]);

    const handleAddParent = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setNewCredentials(null);

        const result = await onAddParent(student.id, { name: parentName, email: parentEmail, phone: parentPhone });

        if (result.success) {
            setNewCredentials(result.credentials || null);
            setParentName('');
            setParentEmail('');
            setParentPhone('');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Manage Parents for {student.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Linked Parents ({linkedParents.length})</h4>
                        <div className="mt-2 space-y-2">
                            {linkedParents.length > 0 ? linkedParents.map(parent => (
                                <div key={parent.id} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-slate-100">{parent.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{parent.email} | {parent.phoneNumber}</p>
                                    </div>
                                    <button onClick={() => onDeleteParent(student.id, parent.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Unlink</button>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 italic">No parents are linked to this student.</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Add New Parent/Guardian</h4>
                        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                        {newCredentials && (
                            <div className="mt-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-md text-sm text-green-800 dark:text-green-200">
                                <p className="font-bold">Parent Account Created!</p>
                                <p>Email: <span className="font-mono">{newCredentials.email}</span></p>
                                <p>Temp Password: <span className="font-mono">{newCredentials.password}</span></p>
                                <button onClick={() => setNewCredentials(null)} className="text-xs font-bold mt-2 hover:underline">Close</button>
                            </div>
                        )}
                        <form onSubmit={handleAddParent} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Parent's Full Name</label>
                                    <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} className="form-input w-full" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Parent's Email</label>
                                    <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} className="form-input w-full" required />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Parent's Phone Number</label>
                                    <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="form-input w-full" required />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" className="btn-primary">Add & Link Parent</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 flex flex-row-reverse">
                    <button onClick={onClose} className="btn-secondary">Done</button>
                </div>
            </div>
        </div>
    );
};

interface LecturerManagerProps {
    user: User;
    users: User[];
    onAddUser: (userData: any) => Promise<void>;
    onImportUsers: (users: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    onEditUser: (userId: string, data: any) => void;
    onDeleteUser: (userId: string) => void;
    onAddUnavailability: (userId: string, u: any) => void;
    onUpdateUnavailability: (userId: string, unavailabilityId: string, data: any) => void;
    onDeleteUnavailability: (userId: string, unavailabilityId: string) => void;
    onManageUnavailability: (user: User) => void;
    departments: Department[];
    currentUser: User;
    currentInstitution?: Institution | null;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    allocations: AllocationRequest[];
    courses: Course[];
    subjects: Subject[];
    onDirectAssign: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest: (requestId: string) => void;
    onAddParent: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent: (studentId: string, parentId: string) => void;
}

export const LecturerManager: React.FC<LecturerManagerProps> = (props) => {
    const {
        users, onAddUser, onImportUsers, onEditUser, onDeleteUser,
        onManageUnavailability, departments, currentUser, currentInstitution,
        letterheadConfig, logoUrl, footerImageUrl, allocations, courses, subjects,
        onDirectAssign, onUpdateRequest, onWithdrawRequest, onAddParent, onDeleteParent
    } = props;

    const [isAdding, setIsAdding] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [managingParentsFor, setManagingParentsFor] = useState<User | null>(null);
    const [managingLessonsFor, setManagingLessonsFor] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [staffId, setStaffId] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [role, setRole] = useState<Role>('lecturer');
    const [departmentId, setDepartmentId] = useState('');
    const [driverType, setDriverType] = useState<'staff' | 'private'>('staff');
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => {
        setName(''); setEmail(''); setPhone(''); setStaffId('');
        setGender('Male'); setRole('lecturer'); setDepartmentId('');
        setDriverType('staff');
    };

    const isSchool = isSchoolInstitution(currentInstitution);
    const canAddUser = ['admin', 'head_teacher', 'hod', 'dos'].includes(currentUser.role);

    const filteredUsers = useMemo(() => {
        let list = users.filter(u => u.role !== 'student' && u.role !== 'super_admin' && u.role !== 'parent');

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.staffId?.toLowerCase().includes(q));
        }
        return list;
    }, [users, searchQuery]);

    const institutionDomain = useMemo(() => currentInstitution?.email?.split('@')[1] || 'institution.edu', [currentInstitution]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSaving) return;

        let finalEmail = email.trim();
        if (!finalEmail) {
            const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
            finalEmail = `${safeName}@${institutionDomain}`;
        }

        const userData: any = {
            name,
            email: finalEmail,
            phoneNumber: phone,
            staffId,
            gender,
            role,
            institutionId: currentUser.institutionId,
            expertise: [],
            driverType: role === 'driver' ? driverType : undefined
        };

        userData.departmentId = (currentUser.role === 'hod' || currentUser.role === 'dos') ? currentUser.departmentId : departmentId;

        try {
            setIsSaving(true);
            await onAddUser(userData);
            setIsAdding(false);
            resetForm();
        } catch (error: any) {
            console.error("Staff registration error:", error);
            alert(`Failed to register staff: ${error.message || 'Unknown database error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Staff Management</h3>
                {canAddUser && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setIsAdding(!isAdding); if (!isAdding) resetForm(); }} className="btn-primary">{isAdding ? 'Cancel' : 'Add Staff'}</button>
                        <button onClick={() => setIsImportModalOpen(true)} className="btn-secondary flex items-center gap-2">
                            <ArrowUpTrayIcon className="w-5 h-5" /> Import
                        </button>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <h4 className="font-bold text-lg mb-4">Register New Staff Member</h4>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input w-full" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input w-full" placeholder="e.g. john.doe@inst.edu" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="form-input w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Staff ID</label>
                                <input type="text" value={staffId} onChange={e => setStaffId(e.target.value)} className="form-input w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Gender</label>
                                <select value={gender} onChange={e => setGender(e.target.value as any)} className="form-select w-full">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select value={role} onChange={e => setRole(e.target.value as any)} className="form-select w-full">
                                    {getRolesForInstitution(currentInstitution).map(r => (
                                        <option key={r} value={r}>{formatRoleDisplayName(r, currentInstitution).toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Department</label>
                                <select
                                    value={(currentUser.role === 'hod' || currentUser.role === 'dos') ? currentUser.departmentId : departmentId}
                                    onChange={e => setDepartmentId(e.target.value)}
                                    disabled={currentUser.role === 'hod' || currentUser.role === 'dos'}
                                    className="form-select w-full disabled:bg-slate-50"
                                    required={ROLES_REQUIRING_DEPARTMENT.includes(role)}
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            {role === 'driver' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Driver Type</label>
                                    <select
                                        value={driverType}
                                        onChange={e => setDriverType(e.target.value as any)}
                                        className="form-select w-full"
                                    >
                                        <option value="staff">Official Staff</option>
                                        <option value="private">Private / Outsourced</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving ? 'Processing...' : 'Save Staff Member'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search staff members..." className="form-input w-full" />
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <td className="px-6 py-4 text-sm font-medium">{u.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role]).map((r, idx) => (
                                                <span key={idx} className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {formatRoleDisplayName(r, currentInstitution)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => setEditingUser(u)} className="text-blue-600 hover:underline">Edit</button>
                                        <button onClick={() => onDeleteUser(u.id)} className="text-red-600 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isImportModalOpen && (
                <SmartUserImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={onImportUsers}
                    existingUsers={users}
                    departments={departments}
                    currentInstitution={currentInstitution}
                    currentUser={currentUser}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                    onSave={async (id, data) => { await onEditUser(id, data as any); setEditingUser(null); }}
                    currentInstitution={currentInstitution}
                />
            )}

            {managingParentsFor && (
                <ManageParentsModal
                    student={managingParentsFor}
                    allUsers={users}
                    onClose={() => setManagingParentsFor(null)}
                    onAddParent={onAddParent}
                    onDeleteParent={onDeleteParent}
                />
            )}

            {managingLessonsFor && (
                <ManageLessonsModal
                    teacher={managingLessonsFor}
                    subjects={subjects}
                    departments={departments}
                    allocations={allocations}
                    courses={courses}
                    onClose={() => setManagingLessonsFor(null)}
                    onAssign={onDirectAssign}
                    onUpdateAllocation={onUpdateRequest}
                    onDeallocate={onWithdrawRequest}
                />
            )}

            <style>{`
                .form-input, .form-select { display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: 1px solid #e2e8f0; }
            `}</style>
        </div>
    );
};
