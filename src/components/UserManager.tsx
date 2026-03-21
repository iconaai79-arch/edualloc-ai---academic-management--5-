
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type {
    User, Role, SmsConfig, Department, Unavailability, Course,
    CourseLevel, UserMappingField, StaffImportPreviewUser, Institution,
    AllocationRequest, Priority, Subject, UserUpdateData, LetterheadConfig,
    CompanyDetails, MpesaTransaction, TransactionStatus, InvoiceItem
} from '../types';
import { PayNowModal } from './PayNowModal';
import { RETAIL_SUBTYPES } from '../constants';
import { getRolesForInstitution, formatRoleDisplayName } from '../utils/roleUtils';
import {
    PlusIcon, UserGroupIcon, AcademicCapIcon, ArrowUpTrayIcon,
    CheckCircleIcon, XIcon, SparklesIcon, EyeIcon, PrinterIcon,
    DocumentArrowDownIcon, BuildingOfficeIcon, UserIcon, BookOpenIcon, PencilIcon,
    MagnifyingGlassIcon,
    ArchiveBoxIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    PhoneIcon, QrCodeIcon
} from './icons/index';
import { analyzeUserSpreadsheet } from '../services/geminiService';
import { generateMemberQrCodesPdf } from '../services/pdfService';
import { EditUserModal } from './EditUserModal';
import { ManageLessonsModal } from './ManageLessonsModal';
import { TimeOffRequestModal } from './TimeOffRequestModal';
import { ClockIcon } from './icons/index';

import * as XLSX from 'xlsx';

const parseExpertise = (expertiseString: string): string[] => {
    if (!expertiseString || typeof expertiseString !== 'string') return [];
    return expertiseString.split(',').map(item => item.trim()).filter(Boolean);
};

const VALID_STAFF_ROLES: Role[] = ['admin', 'deputy', 'hod', 'tto', 'lecturer', 'practice_teacher', 'academics_officer', 'head_teacher', 'dos', 'teacher', 'librarian', 'security', 'info_desk', 'store', 'boarding_master', 'driver', 'transport_assistant', 'reseller', 'retail_agent', 'field_agent', 'customer', 'lead'];
const ROLES_REQUIRING_DEPARTMENT: Role[] = ['admin', 'deputy', 'hod', 'lecturer', 'tto', 'head_teacher', 'dos', 'teacher'];

const REQUIRED_USER_MAPPING_FIELDS: UserMappingField[] = ['name', 'role'];
const ALL_USER_MAPPING_FIELDS: UserMappingField[] = ['name', 'email', 'phoneNumber', 'staffId', 'role', 'roles', 'departmentName', 'expertise', 'gender'];

interface ManageParentsModalProps {
    student: User;
    allUsers: User[];
    onClose: () => void;
    onAddParent?: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent?: (studentId: string, parentId: string) => void;
}

const ManageParentsModal: React.FC<ManageParentsModalProps> = ({ student, allUsers = [], onClose, onAddParent, onDeleteParent }: ManageParentsModalProps) => {
    const [parentName, setParentName] = useState('');
    const [parentEmail, setParentEmail] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [newCredentials, setNewCredentials] = useState<{ email: string, password: string } | null>(null);
    const [error, setError] = useState('');

    const linkedParents = useMemo(() => {
        return (allUsers as User[] || []).filter(u => student.parentIds?.includes(u.id));
    }, [allUsers, student.parentIds]);

    const handleAddParent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onAddParent) {
            setError('Parent registration is disabled in this view.');
            return;
        }
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
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
                                    <button onClick={() => onDeleteParent?.(student.id, parent.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Unlink</button>
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

interface SmartUserImporterModalProps {
    onClose: () => void;
    onImport: (users: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    existingUsers: User[];
    departments: Department[];
    currentInstitution?: Institution | null;
    currentUser: User;
    onLogAction?: (action: string) => Promise<void>;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    companyDetails?: CompanyDetails;
    isRetailAgency?: boolean;
}

const SmartUserImporterModal: React.FC<SmartUserImporterModalProps> = ({ onClose, onImport, existingUsers, departments, currentInstitution, currentUser, onLogAction, onAddTransaction, companyDetails, isRetailAgency }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<UserMappingField, string | null>>(ALL_USER_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<UserMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ valid: StaffImportPreviewUser[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const departmentNameMap = useMemo(() => new Map((departments || []).filter(d => d && d.name).map(d => [String(d.name).toLowerCase().trim(), d.id])), [departments]);
    const existingUserEmails = useMemo(() => new Set((existingUsers || []).filter(u => u && u.email).map(u => String(u.email).toLowerCase())), [existingUsers]);
    const existingUserStaffIds = useMemo(() => new Set<string>((existingUsers || []).filter(u => u && u.staffId).map(u => String(u.staffId).toLowerCase())), [existingUsers]);
    const institutionDomain = useMemo(() => currentInstitution?.email?.split('@')[1] || 'institution.edu', [currentInstitution]);
    const isCoop = useMemo(() => {
        const type = currentInstitution?.institutionType;
        const subType = currentInstitution?.businessSubType?.toLowerCase() || '';
        return type === 'Cooperative' || type === 'SACCO' || type === 'Agrovet' || subType.includes('coop') || subType.includes('sacco');
    }, [currentInstitution]);

    const availableRolesForImport = useMemo(() => {
        const roles = getRolesForInstitution(currentInstitution);
        if (currentUser?.role === 'admin' || currentUser?.role === 'head_teacher' || (currentUser?.role as string).includes('admin')) {
            return roles;
        }
        return roles.filter(r => r !== 'admin' && !r.includes('admin'));
    }, [currentUser?.role, currentInstitution]);

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

                const mapping = await analyzeUserSpreadsheet(headers);
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

        (rawData || []).forEach((row, index) => {
            try {
                const rowNum = index + 2;
                const name = String(row[userMapping.name!] || '').trim();
                if (!name) throw new Error("Missing Name");

                let email = userMapping.email ? String(row[userMapping.email!] || '').trim() : '';
                let staffId = userMapping.staffId ? String(row[userMapping.staffId!] || '').trim() : '';
                let roleStr = userMapping.role ? String(row[userMapping.role!] || '').trim().toLowerCase().replace(/\s+/g, '_') : 'lecturer';
                let role = roleStr as Role;

                if (!availableRolesForImport.includes(role)) role = 'lecturer';

                // Handle Multiple Roles
                let roles: Role[] = [role];
                if (userMapping.roles) {
                    const extraRoles = String(row[userMapping.roles!] || '')
                        .split(',')
                        .map(r => r.trim().toLowerCase().replace(/\s+/g, '_') as Role)
                        .filter(r => availableRolesForImport.includes(r));
                    roles = [...new Set([...roles, ...extraRoles])];
                }

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
                    roles,
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

    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [pendingImportStudents, setPendingImportStudents] = useState<any[]>([]);

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;

        const isStudentImport = parsedData.valid.length > 0 && parsedData.valid[0].role === 'student';
        const costPerStudent = companyDetails?.subscriptionConfig?.baseCostPerStudent || 0;
        const totalCost = parsedData.valid.length * costPerStudent;

        if (isStudentImport && currentInstitution?.status === 'active' && costPerStudent > 0 && currentInstitution?.institutionType !== 'Reseller') {
            // Intercept for payment
            const sanitizedUsers = parsedData.valid.map(({
                originalRowIndex, generatedStaffId, generatedEmail, originalRoleValue, ...user
            }) => user);
            setPendingImportStudents(sanitizedUsers);
            setIsPayModalOpen(true);
            return;
        }

        await processImport(parsedData.valid);
    };

    const processImport = async (usersToImport: any[]) => {
        setStep('finalizing');
        setImportProgress(0);

        try {
            // If coming direct, it's the raw valid array. If from payment, it's already sanitized
            const sanitizedUsers = 'originalRowIndex' in usersToImport[0]
                ? usersToImport.map(({ originalRowIndex, generatedStaffId, generatedEmail, originalRoleValue, ...user }: any) => user)
                : usersToImport;

            setImportProgress(20);
            await onImport(sanitizedUsers);
            onLogAction?.(`Bulk imported ${sanitizedUsers.length} members to registry`);
            setImportProgress(80);
            await new Promise(r => setTimeout(r, 800));
            setImportProgress(100);
            setStep('success');
        } catch (error: any) {
            console.error("Import error:", error);
            setErrorMessage(error.message || "Failed to save records to the database.");
            setStep('error');
        }
    };

    const handlePaymentSubmit = async (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]): Promise<TransactionStatus> => {
        if (!onAddTransaction || !currentInstitution) return 'failed';
        return await onAddTransaction({
            ...paymentData,
            institutionId: currentInstitution.id,
            provider: 'mpesa',
            paymentMethod: 'paybill'
        }, items);
    };

    const finalizingMessages = useMemo(() => {
        if (importProgress < 30) return "Validating institutional schema...";
        if (importProgress < 60) return "Encrypting member credentials...";
        if (importProgress < 90) return "Syncing with cloud database...";
        return "Finalizing records...";
    }, [importProgress]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">{isRetailAgency ? 'Smart Staff/Agent Importer' : (isCoop ? 'Smart Cooperative Staff Importer' : 'Smart Staff Importer')}</h3>
                    {step !== 'finalizing' && <button onClick={onClose}><XIcon className="w-6 h-6" /></button>}
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-lg">
                            <h4 className="text-lg font-semibold">{isRetailAgency ? 'Upload Personnel File' : 'Upload Staff File'}</h4>
                            <input type="file" onChange={e => e.target.files && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls" className="mt-6 file-input" />
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center p-10 flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin mb-4"></div>
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
                            {ALL_USER_MAPPING_FIELDS
                                .filter(f => !(isRetailAgency || isCoop) || f !== 'departmentName')
                                .map(field => (
                                    <div key={field} className="grid grid-cols-2 gap-4 items-center">
                                        <label className="text-right text-sm font-medium capitalize">
                                            {field === 'staffId' ? (isRetailAgency ? 'ID Number' : 'Staff ID') : field.replace(/([A-Z])/g, ' $1')}
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
                                                <td className="px-3 py-2 text-sm capitalize">{u.role.replace('_', ' ')}</td>
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

            {
                isPayModalOpen && currentInstitution && companyDetails && (
                    <PayNowModal
                        mpesaConfig={companyDetails.mpesaConfig}
                        institutionId={currentInstitution.id}
                        onClose={() => setIsPayModalOpen(false)}
                        onSubmit={handlePaymentSubmit}
                        onSuccess={() => {
                            setIsPayModalOpen(false);
                            processImport(pendingImportStudents);
                        }}
                        forceAmount={pendingImportStudents.length * (companyDetails.subscriptionConfig?.baseCostPerStudent || 0)}
                        forcedItems={[{
                            description: `Additional Student Licenses (${pendingImportStudents.length} students)`,
                            quantity: pendingImportStudents.length,
                            unitPrice: companyDetails.subscriptionConfig?.baseCostPerStudent || 0,
                            amount: pendingImportStudents.length * (companyDetails.subscriptionConfig?.baseCostPerStudent || 0)
                        }]}
                    />
                )
            }
        </div >
    );
};

interface PromoteStudentsModalProps {
    students: User[];
    courses: Course[];
    onClose: () => void;
    onPromote: (studentIds: string[], targetCourseId: string, targetCourseLevelId: string) => Promise<void>;
    currentInstitutionName?: string;
}

const PromoteStudentsModal: React.FC<PromoteStudentsModalProps> = ({ students, courses, onClose, onPromote, currentInstitutionName }) => {
    const [sourceCourseId, setSourceCourseId] = useState('');
    const [sourceLevelId, setSourceLevelId] = useState('');
    const [targetCourseId, setTargetCourseId] = useState('');
    const [targetLevelId, setTargetLevelId] = useState('');

    // Default selection state
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Derived variables
    const sourceLevels = useMemo(() => courses.find(c => c.id === sourceCourseId)?.levels || [], [sourceCourseId, courses]);
    const targetLevels = useMemo(() => courses.find(c => c.id === targetCourseId)?.levels || [], [targetCourseId, courses]);

    const eligibleStudents = useMemo(() => {
        if (!sourceCourseId) return [];
        return students.filter(s =>
            s.courseId === sourceCourseId &&
            (!sourceLevelId || s.courseLevelId === sourceLevelId)
        );
    }, [students, sourceCourseId, sourceLevelId]);

    // Update selection when filter changes
    useEffect(() => {
        setSelectedStudentIds(new Set(eligibleStudents.map(s => s.id)));
    }, [eligibleStudents]);

    const handleToggleStudent = (id: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudentIds(newSet);
    };

    const handleToggleAll = () => {
        if (selectedStudentIds.size === eligibleStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(eligibleStudents.map(s => s.id)));
        }
    };

    const handlePromote = async () => {
        if (!targetCourseId || !targetLevelId || selectedStudentIds.size === 0) return;
        setIsProcessing(true);
        setProgress(10);

        try {
            await onPromote(Array.from(selectedStudentIds), targetCourseId, targetLevelId);
            setProgress(100);
            setTimeout(onClose, 1000);
        } catch (error) {
            console.error("Promotion failed:", error);
            alert("Failed to promote students. See console for details.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4" onClick={!isProcessing ? onClose : undefined}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20 rounded-t-lg">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                        <AcademicCapIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Promote Students
                    </h3>
                    {!isProcessing && (
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                            <XIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    {/* Information Alert */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex gap-3">
                        <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            <p className="font-bold mb-1">Before Promoting Students:</p>
                            <p>To accurately register these students in the next year, ensure you have created and activated the new Academic Year in the <span className="font-semibold">Academics</span> module first. Promoting students updates their current class alignment which takes effect immediately.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Source Configuration */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2">1. Select Current Class (Source)</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Course</label>
                                <select
                                    className="form-select w-full"
                                    value={sourceCourseId}
                                    onChange={e => { setSourceCourseId(e.target.value); setSourceLevelId(''); }}
                                    disabled={isProcessing}
                                >
                                    <option value="">-- Select Course --</option>
                                    {courses.map(c => <option key={`src-${c.id}`} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Stream / Level (Optional)</label>
                                <select
                                    className="form-select w-full"
                                    value={sourceLevelId}
                                    onChange={e => setSourceLevelId(e.target.value)}
                                    disabled={!sourceCourseId || isProcessing}
                                >
                                    <option value="">All Streams in Course</option>
                                    {sourceLevels.map(l => <option key={`src-l-${l.id}`} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Target Configuration */}
                        <div className="space-y-4 border-l md:pl-8 dark:border-slate-700">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2">2. Select Next Class (Destination)</h4>
                            <div>
                                <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Target Course</label>
                                <select
                                    className="form-select w-full border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                                    value={targetCourseId}
                                    onChange={e => { setTargetCourseId(e.target.value); setTargetLevelId(''); }}
                                    disabled={isProcessing}
                                >
                                    <option value="">-- Select Target Course --</option>
                                    {courses.map(c => <option key={`tgt-${c.id}`} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Target Stream / Level</label>
                                <select
                                    className="form-select w-full border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                                    value={targetLevelId}
                                    onChange={e => setTargetLevelId(e.target.value)}
                                    disabled={!targetCourseId || isProcessing}
                                >
                                    <option value="">-- Select Target Stream --</option>
                                    {targetLevels.map(l => <option key={`tgt-l-${l.id}`} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Student Selection */}
                    {sourceCourseId && (
                        <div className="mt-8 border rounded-lg border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <UserGroupIcon className="w-4 h-4 text-slate-500" />
                                    Eligible Students ({eligibleStudents.length})
                                </h4>
                                <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={selectedStudentIds.size === eligibleStudents.length && eligibleStudents.length > 0}
                                        onChange={handleToggleAll}
                                        disabled={eligibleStudents.length === 0 || isProcessing}
                                    />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Select All</span>
                                </label>
                            </div>

                            <div className="max-h-60 overflow-y-auto p-1 bg-white dark:bg-slate-800">
                                {eligibleStudents.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 italic text-sm">
                                        No students found in the selected source class.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                                        {eligibleStudents.map(student => (
                                            <label
                                                key={student.id}
                                                className={`flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border transition-colors ${selectedStudentIds.has(student.id) ? 'border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/10' : 'border-transparent'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={selectedStudentIds.has(student.id)}
                                                    onChange={() => handleToggleStudent(student.id)}
                                                    disabled={isProcessing}
                                                />
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{student.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono truncate">{student.staffId || student.email}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex items-center justify-between rounded-b-lg border-t dark:border-slate-700">
                    <div>
                        {isProcessing && (
                            <div className="flex items-center gap-3 w-64">
                                <ArrowPathIcon className="w-5 h-5 text-indigo-600 animate-spin" />
                                <div className="flex-grow bg-slate-200 rounded-full h-2.5 dark:bg-slate-600 overflow-hidden">
                                    <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{progress}%</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePromote}
                            disabled={isProcessing || !targetCourseId || !targetLevelId || selectedStudentIds.size === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Promote {selectedStudentIds.size > 0 ? selectedStudentIds.size : ''} Students
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface UserManagerProps {
    allocations: AllocationRequest[];
    users: User[];
    user?: User;
    institutions?: Institution[];
    onAddUser?: (userData: any) => Promise<void>;
    onImportUsers: (users: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    onImportStudents: (students: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    smsConfig: SmsConfig;
    departments: Department[];
    courses: Course[];
    subjects: Subject[];
    onDirectAssign?: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onUpdateRequest?: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest: (requestId: string) => void;
    onDeleteUser: (userId: string) => Promise<void>;
    onEditUser: (userId: string, data: UserUpdateData) => Promise<void>;
    onAddUnavailability?: (userId: string, unavailability: Omit<Unavailability, 'id' | 'status'>) => void;
    onUpdateUnavailability?: (userId: string, unavailabilityId: string, data: Partial<Omit<Unavailability, 'id'>>) => void;
    onDeleteUnavailability?: (userId: string, unavailabilityId: string) => void;
    currentUser: User;
    onManageUnavailability?: (user: User) => void;
    currentInstitution?: Institution | null;
    showOnly?: 'staff' | 'student' | 'customer';
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    onAddParent?: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent?: (studentId: string, parentId: string) => void;
    onLogAction?: (action: string) => Promise<void>;
    onAddTimeOffRequest?: (userId: string, data: any) => Promise<void>;
    onSendBulkCredentials?: (users: User[], method: 'email' | 'sms') => Promise<{ success_count: number; fail_count: number }>;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onSendSms?: (recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    companyDetails?: CompanyDetails;
    isRetailAgency?: boolean;
}

export const UserManager: React.FC<UserManagerProps> = (props) => {
    const {
        allocations = [], users = [], institutions = [], onAddUser, onImportUsers, onImportStudents, departments = [],
        courses = [], subjects = [], onDirectAssign, onWithdrawRequest, onDeleteUser,
        onEditUser, currentUser, currentInstitution,
        onAddParent, onDeleteParent, onAddTimeOffRequest,
        onUpdateRequest, showOnly, onSendBulkCredentials, onAddTransaction, companyDetails, isRetailAgency: isRetailAgencyProp
    } = props;
    const isRetailAgency = isRetailAgencyProp ?? RETAIL_SUBTYPES.includes(currentInstitution?.businessSubType || '');

    const [activeTab, setActiveTab] = useState<'staff' | 'student' | 'customer'>(showOnly || 'staff');
    const [isAdding, setIsAdding] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [managingParentsFor, setManagingParentsFor] = useState<User | null>(null);
    const [managingLessonsFor, setManagingLessonsFor] = useState<User | null>(null);
    const [requestingTimeOffFor, setRequestingTimeOffFor] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [institutionFilter, setInstitutionFilter] = useState('all');
    const [isSaving, setIsSaving] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [pendingStudentSave, setPendingStudentSave] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const institutionDomain = useMemo(() => currentInstitution?.email?.split('@')[1] || 'institution.edu', [currentInstitution]);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [staffId, setStaffId] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
    const [role, setRole] = useState<Role>('lecturer');
    const [roles, setRoles] = useState<Role[]>(['teacher']);
    const [departmentId, setDepartmentId] = useState('');
    const [courseId, setCourseId] = useState('');
    const [courseLevelId, setCourseLevelId] = useState('');
    const [driverType, setDriverType] = useState<'staff' | 'private'>('staff');

    const resetForm = () => {
        setName(''); setEmail(''); setPhone(''); setStaffId('');
        setGender('Male'); setRole('lecturer'); setRoles(['teacher']); setDepartmentId('');
        setCourseId(''); setCourseLevelId(''); setDriverType('staff');
    };

    const toggleRole = (r: Role) => {
        setRoles(prev =>
            prev.includes(r)
                ? (prev.length > 1 ? prev.filter(role => role !== r) : prev)
                : [...prev, r]
        );
    };

    useEffect(() => {
        if (activeTab === 'staff') setRoles(['teacher']);
        else if (activeTab === 'customer') setRoles(['customer']);
        else setRoles(['student']);
    }, [activeTab]);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const isCoop = useMemo(() => {
        const type = currentInstitution?.institutionType;
        const subType = currentInstitution?.businessSubType?.toLowerCase() || '';
        return type === 'Cooperative' || type === 'SACCO' || type === 'Agrovet' || subType.includes('coop') || subType.includes('sacco');
    }, [currentInstitution]);
    const isEdu = useMemo(() => {
        const type = currentInstitution?.institutionType;
        return ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes(type || '');
    }, [currentInstitution]);

    const canManageUserRecords = useMemo(() => {
        if (!currentUser) return false;
        const baseAdminRoles = ['admin', 'head_teacher', 'dos', 'deputy'];
        return baseAdminRoles.includes(currentUser.role);
    }, [currentUser?.role]);

    const isSuperAdmin = useMemo(() => currentUser?.role === 'super_admin', [currentUser?.role]);

    const filteredUsers = useMemo(() => {
        let list = (users || []).filter(u => {
            if (!u) return false;
            if (activeTab === 'staff') {
                return u.role !== 'student' && u.role !== 'super_admin' && u.role !== 'parent' && u.role !== 'customer' && u.role !== 'lead';
            }
            if (activeTab === 'customer') {
                return u.role === 'customer' || u.role === 'lead';
            }
            return u.role === 'student';
        });

        // For Retail Agency, we only show specific roles in Staff tab
        if (isRetailAgency && activeTab === 'staff') {
            const retailRoles: Role[] = ['admin', 'retail_agent', 'field_agent', 'store', 'security', 'info_desk', 'driver'];
            list = list.filter(u => retailRoles.includes(u.role));
        }

        const isRestrictedAdmin = (currentUser?.role === 'hod' || currentUser?.role === 'tto');
        if (isRestrictedAdmin && currentUser?.departmentId) {
            list = list.filter(u => u.departmentId === currentUser.departmentId);
        }

        if (isSuperAdmin && institutionFilter !== 'all') {
            list = list.filter(u => u.institutionId === institutionFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.staffId || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [users, activeTab, searchQuery, institutionFilter, isSuperAdmin, currentUser?.role, currentUser?.departmentId, isRetailAgency]);

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            // SANITIZATION: Ensure role field exists and defaults properly
            const sanitizedJson = json.map(row => ({
                ...row,
                role: activeTab === 'staff' ? (row.role ? String(row.role).toLowerCase() : 'lecturer') : 'student',
                roles: activeTab === 'staff' ? (row.roles ? String(row.roles).split(',').map((r: string) => r.trim()) : [row.role ? String(row.role).toLowerCase() : 'lecturer']) : ['student'],
                name: row.name || row.Name || 'Unknown',
                email: row.email || row.Email || '',
                phoneNumber: row.phoneNumber || row.phone || ''
            }));

            if (activeTab === 'staff') await onImportUsers(sanitizedJson);
            else await onImportStudents(sanitizedJson);
        };
        reader.readAsArrayBuffer(file);
    };

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
            role: activeTab === 'staff' ? roles[0] : (activeTab === 'customer' ? roles[0] || 'customer' : 'student'),
            roles: activeTab === 'staff' ? roles : (activeTab === 'customer' ? (roles.length > 0 ? roles : ['customer']) : ['student']),
            institutionId: currentUser?.institutionId || '',
            expertise: [],
            driverType: roles.includes('driver') ? driverType : undefined
        };

        if (activeTab === 'staff') {
            userData.departmentId = (isCoop || isRetailAgency) ? undefined : ((currentUser?.role === 'hod' || currentUser?.role === 'dos' || currentUser?.role === 'tto') ? currentUser.departmentId : departmentId);
        }
 else {
            userData.courseId = courseId;
            userData.courseLevelId = courseLevelId;
        }

        const isStudentSave = activeTab === 'student';
        const costPerStudent = companyDetails?.subscriptionConfig?.baseCostPerStudent || 0;

        if (isStudentSave && currentInstitution?.status === 'active' && costPerStudent > 0 && currentInstitution?.institutionType !== 'Reseller') {
            // Intercept manual save for payment
            setPendingStudentSave(userData);
            setIsPayModalOpen(true);
            return;
        }

        // Proceed directly if no payment intercepted
        await processSave(userData);
    };

    const processSave = async (userData: any) => {
        try {
            setIsSaving(true);
            if (onAddUser) {
                // Generate and send credentials if it's a new customer in a retail agency
                const isNewRegistration = !userData.id; // Basic check, though usually userData for onAddUser doesn't have id yet
                const isCustomer = activeTab === 'customer' || (Array.isArray(userData.roles) && userData.roles.includes('customer'));

                if (isRetailAgency && isCustomer && isNewRegistration) {
                    const generatedPassword = Math.random().toString(36).slice(-8).toUpperCase();
                    userData.password = generatedPassword;

                    await onAddUser(userData);

                    if (props.onSendSms && userData.phoneNumber) {
                        const smsMessage = `Welcome to ${currentInstitution?.name}! Access your Customer Portal to track records & more.\nLogin: ${userData.phoneNumber}\nPass: ${generatedPassword}`;
                        try {
                            await props.onSendSms(userData.phoneNumber, smsMessage, props.smsConfig, 1, currentInstitution?.id || '');
                        } catch (e) {
                            console.error('Failed to dispatch welcome credentials SMS', e);
                        }
                    }
                } else {
                    await onAddUser(userData);
                }
            }
            props.onLogAction?.(`Manually registered new ${activeTab === 'staff' ? 'staff member' : (activeTab === 'customer' ? 'Customer/Lead' : 'student')}: ${userData.name}`);
            setIsAdding(false);
            resetForm();
        } catch (error: any) {
            console.error("Manual registration error:", error);
            alert(`Failed to register user: ${error.message || 'Unknown database error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePaymentSubmit = async (paymentData: { amount: number; phoneNumber: string; payerName: string; }, items: InvoiceItem[]): Promise<TransactionStatus> => {
        if (!onAddTransaction || !currentInstitution) return 'failed';
        return await onAddTransaction({
            ...paymentData,
            institutionId: currentInstitution.id,
            provider: 'mpesa',
            paymentMethod: 'paybill'
        }, items);
    };

    const courseLevels = useMemo(() => {
        if (!courseId) return [];
        return (courses || []).find(c => c.id === courseId)?.levels || [];
    }, [courseId, courses]);

    const institutionMap = useMemo(() => new Map((institutions || []).filter(i => i && i.id).map(i => [i.id, i.name])), [institutions]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">User Management</h3>
                {canManageUserRecords && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setIsAdding(!isAdding); if (!isAdding) resetForm(); }} className="btn-primary">{isAdding ? 'Cancel' : 'Add User'}</button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileImport} accept=".xlsx, .xls, .csv" />
                        <button onClick={() => { activeTab === 'staff' ? setIsImportModalOpen(true) : fileInputRef.current?.click() }} className="btn-secondary flex items-center gap-2">
                            <ArrowUpTrayIcon className="w-5 h-5" /> Import
                        </button>
                        {isEdu && activeTab === 'student' && canManageUserRecords && (
                            <button onClick={() => setIsPromoteModalOpen(true)} className="btn-secondary flex items-center gap-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300">
                                <AcademicCapIcon className="w-5 h-5" /> Promote Students
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                if (filteredUsers.length === 0) return;
                                try {
                                    const blob = await generateMemberQrCodesPdf(
                                        filteredUsers,
                                        currentInstitution!,
                                        props.letterheadConfig,
                                        props.footerImageUrl
                                    );
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `Member_QR_Cards_${new Date().getTime()}.pdf`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                    props.onLogAction?.(`Generated QR Access Cards for ${filteredUsers.length} members`);
                                } catch (err: any) {
                                    alert(`Failed to generate QR codes: ${err.message}`);
                                }
                            }}
                            className="btn-secondary flex items-center gap-2 bg-slate-900 text-white hover:bg-black border-none"
                        >
                            <QrCodeIcon className="w-5 h-5" /> QR Cards
                        </button>
                        {onSendBulkCredentials && filteredUsers.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`Send credentials to all ${filteredUsers.length} filtered users via Email?`)) {
                                            const res = await onSendBulkCredentials(filteredUsers, 'email');
                                            alert(`Batch Complete!\nSuccess: ${res.success_count}\nFailed: ${res.fail_count}`);
                                        }
                                    }}
                                    className="px-3 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors"
                                >
                                    Bulk Email Credentials
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`Send credentials to all ${filteredUsers.length} filtered users via SMS?`)) {
                                            const res = await onSendBulkCredentials(filteredUsers, 'sms');
                                            alert(`Batch Complete!\nSuccess: ${res.success_count}\nFailed: ${res.fail_count}`);
                                        }
                                    }}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                >
                                    Bulk SMS Credentials
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <h4 className="font-bold text-lg mb-4">Register New {activeTab === 'staff' ? (isCoop ? 'Staff Member' : 'Staff Member') : (activeTab === 'customer' ? 'Customer/Lead' : (isCoop ? 'Member/Farmer' : 'Student'))}</h4>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input w-full" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input w-full" placeholder="e.g. john.doe@inst.edu" />
                                <p className="text-[10px] text-slate-500 mt-1">If empty, an email will be generated automatically.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="form-input w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {isRetailAgency ? (activeTab === 'staff' ? 'ID Number' : 'Client/Agent ID') : (isCoop ? (activeTab === 'staff' ? 'Employee ID' : 'Member Number') : (activeTab === 'staff' ? 'Staff ID' : 'Student ID'))}
                                </label>
                                <input type="text" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="form-input w-full font-mono font-bold text-indigo-600 dark:text-indigo-400" placeholder={isRetailAgency ? "e.g. 12345678" : (isCoop ? "e.g. MBR-001" : "EMP-001")} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Gender</label>
                                <select value={gender} onChange={e => setGender(e.target.value as any)} className="form-select w-full">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {(activeTab === 'staff' || activeTab === 'customer') ? (
                                <>
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium mb-2">{activeTab === 'staff' ? 'Assigned Roles' : 'Category'}</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {activeTab === 'staff' && getRolesForInstitution(currentInstitution).filter(r => !['customer', 'lead'].includes(r)).map(r => (
                                                <label key={r} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${roles.includes(r) ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={roles.includes(r)}
                                                        onChange={() => toggleRole(r)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                                    />
                                                    <span className={`text-[10px] font-bold uppercase ${roles.includes(r) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>
                                                        {formatRoleDisplayName(r, currentInstitution)}
                                                    </span>
                                                </label>
                                            ))}
                                            {activeTab === 'customer' && ['customer', 'lead'].map(r => (
                                                <label key={r} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${roles.includes(r as Role) ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={roles.includes(r as Role)}
                                                        onChange={() => toggleRole(r as Role)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                                    />
                                                    <span className={`text-[10px] font-bold uppercase ${roles.includes(r as Role) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>
                                                        {r}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {!isRetailAgency && !isCoop && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Department</label>
                                            <select
                                                value={(currentUser?.role === 'hod' || currentUser?.role === 'dos' || currentUser?.role === 'tto') ? currentUser.departmentId : departmentId}
                                                onChange={e => setDepartmentId(e.target.value)}
                                                disabled={currentUser?.role === 'hod' || currentUser?.role === 'dos' || currentUser?.role === 'tto'}
                                                className="form-select w-full disabled:bg-slate-50"
                                                required={roles.some(r => ROLES_REQUIRING_DEPARTMENT.includes(r))}
                                            >
                                                <option value="">-- Select Department --</option>
                                                {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {roles.includes('driver') && (
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
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Course/Grade</label>
                                        <select value={courseId} onChange={e => setCourseId(e.target.value)} className="form-select w-full" required>
                                            <option value="">-- Select Course --</option>
                                            {(courses || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Stream/Level</label>
                                        <select value={courseLevelId} onChange={e => setCourseLevelId(e.target.value)} className="form-select w-full" required disabled={!courseId}>
                                            <option value="">-- Select Stream --</option>
                                            {courseLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                                {isSaving ? 'Processing...' : `Save ${activeTab === 'staff' ? 'Staff' : (activeTab === 'customer' ? 'Record' : 'Student')}`}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <div className="bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                    {(!showOnly || showOnly === 'staff') && (
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                <UserGroupIcon className="w-4 h-4" />
                                {isRetailAgency ? 'Staff/Agents' : (isCoop ? 'Cooperative Staff' : (isSchool ? 'Teachers & Staff' : 'Faculty & Staff'))}
                            </span>
                        </button>
                    )}
                    {((!isRetailAgency && isEdu) || isCoop) && (!showOnly || showOnly === 'student') && (
                        <button
                            onClick={() => setActiveTab('student')}
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'student' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                <AcademicCapIcon className="w-4 h-4" />
                                {isCoop ? 'Members / Farmers' : (isSchool ? 'Students' : 'Learners')}
                            </span>
                        </button>
                    )}
                    {isRetailAgency && (!showOnly || showOnly === 'customer') && (
                        <button
                            onClick={() => setActiveTab('customer')}
                            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'customer' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4" />
                                Customers & Leads
                            </span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-grow w-full relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={activeTab === 'staff' ? (isRetailAgency ? 'Search staff/agents...' : (isCoop ? 'Search cooperative staff...' : 'Search faculty...')) : (isCoop ? 'Search members...' : 'Search students...')}
                            className="form-input w-full pl-10"
                        />
                        <div className="absolute left-3 top-3 text-slate-400">
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </div>
                    </div>
                    {isSuperAdmin && (institutions || []).length > 0 && (
                        <div className="w-full sm:w-64 flex-shrink-0">
                            <select
                                value={institutionFilter}
                                onChange={e => setInstitutionFilter(e.target.value)}
                                className="form-select w-full"
                                aria-label="Filter by Institution"
                            >
                                <option value="all">All Institutions</option>
                                {(institutions || []).map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name & Details</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Roles</th>
                                {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Institution</th>}
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                                        {u.staffId && <div className="text-[10px] font-mono text-slate-400">ID: {u.staffId}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role]).map((r, idx) => (
                                                <span key={idx} className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {formatRoleDisplayName(r, currentInstitution)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    {isSuperAdmin && (
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                {institutionMap.get(u.institutionId) || 'Unknown'}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            {activeTab === 'student' && (
                                                <button
                                                    onClick={() => setManagingParentsFor(u)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md text-xs font-bold transition-all"
                                                >
                                                    <UserGroupIcon className="w-3.5 h-3.5" />
                                                    Parents
                                                </button>
                                            )}
                                            {isEdu && (u.role === 'teacher' || u.role === 'lecturer' || u.role === 'head_teacher' || u.role === 'dos') && (
                                                <button
                                                    onClick={() => setManagingLessonsFor(u)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-indigo-900/30 dark:text-emerald-300 rounded-md text-xs font-bold transition-all"
                                                >
                                                    <BookOpenIcon className="w-3.5 h-3.5" />
                                                    Workload
                                                </button>
                                            )}
                                            {canManageUserRecords && (
                                                <>
                                                    {onSendBulkCredentials && (
                                                        <div className="flex gap-1">
                                                            <button
                                                                title="Email Credentials"
                                                                onClick={async () => {
                                                                    const res = await onSendBulkCredentials([u], 'email');
                                                                    if (res.success_count > 0) alert("Credentials sent successfully.");
                                                                    else alert("Failed to send email. Please check your SMTP settings.");
                                                                }}
                                                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-all"
                                                            >
                                                                <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                title="SMS Credentials"
                                                                onClick={async () => {
                                                                    const res = await onSendBulkCredentials([u], 'sms');
                                                                    if (res.success_count > 0) alert("Credentials sent successfully.");
                                                                    else alert("Failed to send SMS. Please verify your gateway settings.");
                                                                }}
                                                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-all"
                                                            >
                                                                <PhoneIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setEditingUser(u)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-xs font-bold transition-all"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    {u.role !== 'student' && onAddTimeOffRequest && (
                                                        <button
                                                            onClick={() => setRequestingTimeOffFor(u)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 rounded-md text-xs font-bold transition-all"
                                                        >
                                                            <ClockIcon className="w-3.5 h-3.5" />
                                                            Time Off
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Archive ${u.name}?`)) {
                                                                await onDeleteUser(u.id);
                                                                props.onLogAction?.(`Archived user record: ${u.name} (${u.role})`);
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-md text-xs font-bold transition-all"
                                                    >
                                                        <ArchiveBoxIcon className="w-3.5 h-3.5" />
                                                        Archive
                                                    </button>
                                                </>
                                            )}
                                        </div>
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
                    onImport={activeTab === 'staff' ? onImportUsers : onImportStudents}
                    existingUsers={users}
                    departments={departments}
                    currentInstitution={currentInstitution}
                    currentUser={currentUser}
                    onLogAction={props.onLogAction}
                    onAddTransaction={onAddTransaction}
                    companyDetails={companyDetails}
                    isRetailAgency={isRetailAgency}
                />
            )}

            {requestingTimeOffFor && (
                <TimeOffRequestModal
                    onClose={() => setRequestingTimeOffFor(null)}
                    onSubmit={async (data) => {
                        if (props.onAddTimeOffRequest && requestingTimeOffFor) {
                            await props.onAddTimeOffRequest(requestingTimeOffFor.id, data);
                            setRequestingTimeOffFor(null);
                        }
                    }}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    departments={departments}
                    onClose={() => setEditingUser(null)}
                    onSave={async (id, data) => { await onEditUser(id, data); setEditingUser(null); }}
                    currentInstitution={currentInstitution}
                    fixedDepartmentId={currentUser?.role === 'hod' || currentUser?.role === 'tto' ? currentUser.departmentId : undefined}
                />
            )}

            {isPromoteModalOpen && (
                <PromoteStudentsModal
                    students={users.filter(u => u.role === 'student')}
                    courses={courses}
                    currentInstitutionName={currentInstitution?.name}
                    onClose={() => setIsPromoteModalOpen(false)}
                    onPromote={async (studentIds, targetCourseId, targetCourseLevelId) => {
                        // Process promotions sequentially to avoid overwhelming the database with concurrent RPCs if there are many students
                        let successCount = 0;
                        for (const id of studentIds) {
                            try {
                                await onEditUser(id, { courseId: targetCourseId, courseLevelId: targetCourseLevelId } as any);
                                successCount++;
                            } catch (e) {
                                console.error(`Failed to promote student ${id}`, e);
                            }
                        }
                        const targetCourseName = courses.find(c => c.id === targetCourseId)?.name || 'Next Class';
                        if (props.onLogAction) {
                            await props.onLogAction(`Bulk promoted ${successCount} students to ${targetCourseName}`);
                        }
                        if (successCount < studentIds.length) {
                            alert(`Promoted ${successCount} out of ${studentIds.length} students. Some updates failed.`);
                        }
                    }}
                />
            )}

            {managingParentsFor && (
                <ManageParentsModal
                    student={managingParentsFor}
                    allUsers={users}
                    onClose={() => setManagingParentsFor(null)}
                    onAddParent={onAddParent!}
                    onDeleteParent={onDeleteParent!}
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
                    onAssign={onDirectAssign!}
                    onUpdateAllocation={onUpdateRequest || (() => { })}
                    onDeallocate={onWithdrawRequest}
                />
            )}

            {isPayModalOpen && currentInstitution && companyDetails && pendingStudentSave && (
                <PayNowModal
                    mpesaConfig={companyDetails.mpesaConfig}
                    institutionId={currentInstitution.id}
                    onClose={() => setIsPayModalOpen(false)}
                    onSubmit={handlePaymentSubmit}
                    onSuccess={() => {
                        setIsPayModalOpen(false);
                        processSave(pendingStudentSave);
                        setPendingStudentSave(null);
                    }}
                    forceAmount={companyDetails.subscriptionConfig?.baseCostPerStudent || 0}
                    forcedItems={[{
                        description: `Additional Student License (1 student)`,
                        quantity: 1,
                        unitPrice: companyDetails.subscriptionConfig?.baseCostPerStudent || 0,
                        amount: companyDetails.subscriptionConfig?.baseCostPerStudent || 0
                    }]}
                />
            )}

            <style>{`
                .form-input, .form-select { display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: 1px solid #e2e8f0; }
            `}</style>
        </div>
    );
};
