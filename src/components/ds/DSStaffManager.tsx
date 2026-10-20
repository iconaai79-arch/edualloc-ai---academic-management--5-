import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    UsersIcon,
    UserPlusIcon,
    UserIcon,
    SearchIcon,
    PencilIcon,
    TrashIcon,
    PhoneIcon,
    EnvelopeIcon,
    BuildingOfficeIcon,
    AcademicCapIcon,
    CheckCircleIcon,
    XIcon,
    DownloadIcon,
    ArrowPathIcon,
    KeyIcon,
    ShieldCheckIcon,
    BriefcaseIcon,
    ClockIcon,
    StarIcon,
    LockClosedIcon,
    ChatBubbleLeftRightIcon
} from '../icons';
import { apiService } from '../../services/apiService';
import { useToast } from '../../services/ToastContext';
import { exportSystemUsersToExcel } from './dsExcelExport';
import type { User, DSInstructor, Branch, DSSettings } from '../../types';
import { isUserDirector, DS_CONFIGURABLE_TABS, DEFAULT_DS_ROLE_PERMISSIONS, getUserAllowedDSTabs } from './dsPermissions';

export interface DSStaffManagerProps {
    institutionId: string;
    currentInstitution: any;
    currentUser?: User;
    branches: Branch[];
    activeBranchId: string;
    instructors: DSInstructor[];
    onRefreshInstructors?: () => Promise<void>;
    settings: DSSettings | null;
    onUpdateSettings?: (newSettings: Partial<DSSettings>) => Promise<void>;
}

export interface UnifiedStaffMember {
    id: string;
    userId?: string;
    instructorId?: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    roles: string[];
    branchId?: string;
    status: 'Active' | 'Inactive';
    specialization?: string;
    instructorType?: string;
    licenseNumber?: string;
    rating?: number;
    rawUser?: User;
    rawInstructor?: DSInstructor;
    createdAt?: string;
}

const STAFF_ROLE_OPTIONS = [
    { value: 'driving_instructor', label: 'Driving Instructor / Trainer', category: 'Instructional' },
    { value: 'admin', label: 'School Administrator / Principal', category: 'Administrative' },
    { value: 'director', label: 'Managing Director / Director', category: 'Executive' },
    { value: 'staff', label: 'Front Desk / Customer Service', category: 'Administrative' },
    { value: 'finance', label: 'Finance / Accounts Officer', category: 'Finance' },
    { value: 'driver', label: 'Transport / Logistics Driver', category: 'Operations' },
    { value: 'security', label: 'Campus Security Officer', category: 'Security' },
    { value: 'procurement_officer', label: 'Store & Inventory Keeper', category: 'Operations' },
];

const SPECIALIZATION_PRESETS = [
    'Manual & Automatic (Category B)',
    'Light Commercial Vehicle (Category B)',
    'Heavy Commercial Truck (Category C)',
    'Motorcycle Riding (Category A)',
    'Public Service Vehicle / Bus (Category D)',
    'Articulated Trailer / Special (Category CE)',
    'Classroom Theory & Road Signs Specialist',
    'Defensive Driving Master Instructor'
];

export const DSStaffManager: React.FC<DSStaffManagerProps> = ({
    institutionId,
    currentInstitution,
    currentUser,
    branches = [],
    activeBranchId,
    instructors = [],
    onRefreshInstructors,
    settings,
    onUpdateSettings
}) => {
    const { success, error: toastError, info: toastInfo } = useToast();

    // Director Authorization Check
    const isDirector = useMemo(() => isUserDirector(currentUser), [currentUser]);

    // Sub-tab Navigation
    const [staffActiveTab, setStaffActiveTab] = useState<'directory' | 'permissions'>('directory');

    // Director Permissions Modal State
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [targetStaffForPermissions, setTargetStaffForPermissions] = useState<UnifiedStaffMember | null>(null);
    const [staffSelectedTabs, setStaffSelectedTabs] = useState<string[]>([]);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);

    // Role Matrix State (Director level)
    const [roleMatrix, setRoleMatrix] = useState<Record<string, string[]>>(() => {
        return settings?.rolePermissions || DEFAULT_DS_ROLE_PERMISSIONS;
    });

    useEffect(() => {
        if (settings?.rolePermissions) {
            setRoleMatrix(settings.rolePermissions);
        }
    }, [settings?.rolePermissions]);

    // Save Settings Helper with robust fallback
    const saveSettingsPermissions = async (partialSettings: { rolePermissions?: Record<string, string[]>; userPermissions?: Record<string, string[]> }) => {
        setIsSavingPermissions(true);
        try {
            if (onUpdateSettings) {
                await onUpdateSettings(partialSettings);
            } else {
                const payload = {
                    ...(settings || {}),
                    ...partialSettings,
                    id: settings?.id || `ds_settings_${institutionId}`,
                    institutionId,
                    updatedAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('ds_settings', payload);
            }
            success("Director access permissions updated and applied successfully.");
        } catch (err: any) {
            console.error('[DSStaffManager] Error saving permissions:', err);
            toastError("Failed to save permissions: " + (err?.message || err));
        } finally {
            setIsSavingPermissions(false);
        }
    };

    // Open User Permissions Modal
    const handleOpenPermissionsModal = (member: UnifiedStaffMember) => {
        if (!isDirector) {
            toastError("Access Denied: Only the School Director can specify what other users can view or access.");
            return;
        }
        setTargetStaffForPermissions(member);
        
        // Find existing override if any
        const existingOverride = settings?.userPermissions?.[member.id] || (member.userId ? settings?.userPermissions?.[member.userId] : undefined);
        
        if (existingOverride && Array.isArray(existingOverride)) {
            setStaffSelectedTabs([...existingOverride]);
        } else {
            const roleKey = member.role || 'staff';
            const roleDefault = settings?.rolePermissions?.[roleKey] || DEFAULT_DS_ROLE_PERMISSIONS[roleKey] || DEFAULT_DS_ROLE_PERMISSIONS['staff'] || ['dashboard'];
            setStaffSelectedTabs([...roleDefault]);
        }
        setShowPermissionsModal(true);
    };

    // Save User Permissions
    const handleSaveUserPermissions = async () => {
        if (!targetStaffForPermissions) return;
        if (!isDirector) {
            toastError("Access Denied: Only the School Director can specify what other users can view or access.");
            return;
        }

        const memberId = targetStaffForPermissions.id;
        const userId = targetStaffForPermissions.userId;

        const updatedUserPerms: Record<string, string[]> = {
            ...(settings?.userPermissions || {}),
            [memberId]: staffSelectedTabs
        };
        if (userId) {
            updatedUserPerms[userId] = staffSelectedTabs;
        }

        await saveSettingsPermissions({ userPermissions: updatedUserPerms });
        setShowPermissionsModal(false);
        setTargetStaffForPermissions(null);
    };

    // Reset User to Role Default
    const handleResetUserToRoleDefault = async (member: UnifiedStaffMember) => {
        if (!isDirector) {
            toastError("Access Denied: Only the School Director can specify what other users can view or access.");
            return;
        }
        const confirmMsg = `Reset ${member.name}'s module access to standard role defaults?`;
        if (!window.confirm(confirmMsg)) return;

        const updatedUserPerms = { ...(settings?.userPermissions || {}) };
        delete updatedUserPerms[member.id];
        if (member.userId) {
            delete updatedUserPerms[member.userId];
        }

        await saveSettingsPermissions({ userPermissions: updatedUserPerms });
        if (targetStaffForPermissions?.id === member.id) {
            setShowPermissionsModal(false);
            setTargetStaffForPermissions(null);
        }
    };

    // Save Entire Role Matrix
    const handleSaveRoleMatrix = async () => {
        if (!isDirector) {
            toastError("Access Denied: Only the School Director can specify what other users can view or access.");
            return;
        }
        await saveSettingsPermissions({ rolePermissions: roleMatrix });
    };

    const handleToggleRoleTab = (roleKey: string, tabId: string) => {
        setRoleMatrix(prev => {
            const currentTabs = prev[roleKey] || DEFAULT_DS_ROLE_PERMISSIONS[roleKey] || ['dashboard'];
            const exists = currentTabs.includes(tabId);
            const nextTabs = exists
                ? currentTabs.filter(t => t !== tabId)
                : [...currentTabs, tabId];
            return {
                ...prev,
                [roleKey]: nextTabs
            };
        });
    };


    // Data states
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [branchFilter, setBranchFilter] = useState(activeBranchId || 'ALL');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Modals
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<UnifiedStaffMember | null>(null);

    // Password reset modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStaffTarget, setPasswordStaffTarget] = useState<UnifiedStaffMember | null>(null);
    const [newPasswordValue, setNewPasswordValue] = useState('');
    const [sendPasswordSms, setSendPasswordSms] = useState(true);

    // Form state for creating / updating staff
    const [staffFormData, setStaffFormData] = useState<{
        name: string;
        phone: string;
        email: string;
        role: string;
        branchId: string;
        status: 'Active' | 'Inactive';
        specialization: string;
        instructorType: string;
        licenseNumber: string;
        password: string;
        sendCredentialsSms: boolean;
    }>({
        name: '',
        phone: '',
        email: '',
        role: 'driving_instructor',
        branchId: '',
        status: 'Active',
        specialization: '',
        instructorType: 'Both',
        licenseNumber: '',
        password: 'password123',
        sendCredentialsSms: true
    });

    // Fetch institutional users
    const loadUsers = useCallback(async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const fetched = await apiService.fetchUsers(institutionId);
            if (Array.isArray(fetched)) {
                setUsers(fetched);
            }
        } catch (err) {
            console.error('[DSStaffManager] Error loading users:', err);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Update branch filter if parent activeBranchId changes
    useEffect(() => {
        if (activeBranchId) {
            setBranchFilter(activeBranchId);
        }
    }, [activeBranchId]);

    // Unified Staff List
    const unifiedStaffList: UnifiedStaffMember[] = useMemo(() => {
        const rawInst = institutionId ? institutionId.replace(/^inst_/, '') : '';
        const prefixedInst = institutionId ? (institutionId.startsWith('inst_') ? institutionId : `inst_${institutionId}`) : '';

        // Filter out students/customers/leads from users
        const nonLearnerUsers = (users || []).filter(u => {
            if (!u) return false;
            const role = String(u.role || '').toLowerCase().trim();
            const rolesArr = (Array.isArray(u.roles) ? u.roles : []).map(r => String(r).toLowerCase().trim());
            if (['student', 'learner', 'candidate', 'parent', 'guardian', 'customer', 'lead', 'visitor'].includes(role)) return false;
            if (rolesArr.some(r => ['student', 'learner', 'candidate', 'parent', 'customer'].includes(r))) return false;

            if (institutionId) {
                const uInst = u.institutionId || (u as any).institution_id;
                const isMatch = uInst === institutionId || uInst === rawInst || uInst === prefixedInst;
                const isLinkedInst = (instructors || []).some(i => 
                    i.id === u.id || 
                    (i.email && i.email.toLowerCase() === (u.email || '').toLowerCase()) ||
                    (i.phone && i.phone === u.phoneNumber)
                );
                if (!isMatch && !isLinkedInst) return false;
            }
            return true;
        });

        const list: UnifiedStaffMember[] = [];
        const seenEmails = new Set<string>();
        const seenPhones = new Set<string>();
        const seenIds = new Set<string>();

        // 1. Process users
        nonLearnerUsers.forEach(u => {
            const cleanPhone = (u.phoneNumber || (u as any).phone || '').trim();
            const cleanEmail = (u.email || '').toLowerCase().trim();

            const linkedInstructor = (instructors || []).find(i => 
                i.id === u.id || 
                (cleanEmail && i.email && i.email.toLowerCase() === cleanEmail) ||
                (cleanPhone && i.phone && i.phone === cleanPhone)
            );

            const member: UnifiedStaffMember = {
                id: u.id,
                userId: u.id,
                instructorId: linkedInstructor?.id,
                name: u.name || (u as any).fullName || linkedInstructor?.name || 'Staff Member',
                email: cleanEmail,
                phone: cleanPhone,
                role: u.role || (linkedInstructor ? 'driving_instructor' : 'staff'),
                roles: Array.isArray(u.roles) ? u.roles : [u.role || 'staff'],
                branchId: (u as any).branchId || (u as any).branch_id || linkedInstructor?.branchId || (linkedInstructor as any)?.branch_id || '',
                status: ((u as any).status || linkedInstructor?.status || 'Active') === 'Inactive' ? 'Inactive' : 'Active',
                specialization: linkedInstructor?.specialization || (Array.isArray(u.expertise) ? u.expertise.join(', ') : ''),
                instructorType: linkedInstructor?.instructorType || (u as any).driverType || 'Both',
                licenseNumber: linkedInstructor?.licenseNumber,
                rating: linkedInstructor?.rating || 5,
                rawUser: u,
                rawInstructor: linkedInstructor,
                createdAt: (u as any).createdAt || linkedInstructor?.createdAt
            };

            list.push(member);
            seenIds.add(member.id);
            if (linkedInstructor) seenIds.add(linkedInstructor.id);
            if (cleanEmail) seenEmails.add(cleanEmail);
            if (cleanPhone) seenPhones.add(cleanPhone);
        });

        // 2. Process instructors not yet in users table
        (instructors || []).forEach(inst => {
            if (seenIds.has(inst.id)) return;
            const cleanPhone = (inst.phone || '').trim();
            const cleanEmail = (inst.email || '').toLowerCase().trim();
            if (cleanPhone && seenPhones.has(cleanPhone)) return;
            if (cleanEmail && seenEmails.has(cleanEmail)) return;

            list.push({
                id: inst.id,
                instructorId: inst.id,
                name: inst.name || 'Instructor',
                email: cleanEmail,
                phone: cleanPhone,
                role: 'driving_instructor',
                roles: ['driving_instructor'],
                branchId: inst.branchId || (inst as any).branch_id || '',
                status: inst.status === 'Inactive' ? 'Inactive' : 'Active',
                specialization: inst.specialization || 'General Driving',
                instructorType: inst.instructorType || 'Both',
                licenseNumber: inst.licenseNumber,
                rating: inst.rating || 5,
                rawInstructor: inst,
                createdAt: inst.createdAt
            });

            seenIds.add(inst.id);
        });

        return list;
    }, [users, instructors, institutionId]);

    // Filtered Staff
    const filteredStaff = useMemo(() => {
        return unifiedStaffList.filter(member => {
            // Search
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchName = member.name.toLowerCase().includes(q);
                const matchPhone = member.phone.includes(q);
                const matchEmail = member.email.toLowerCase().includes(q);
                const matchSpec = (member.specialization || '').toLowerCase().includes(q);
                const matchLicense = (member.licenseNumber || '').toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchEmail && !matchSpec && !matchLicense) {
                    return false;
                }
            }

            // Role filter
            if (roleFilter !== 'All') {
                if (roleFilter === 'instructors' && member.role !== 'driving_instructor') return false;
                if (roleFilter === 'admins' && member.role !== 'admin' && member.role !== 'director') return false;
                if (roleFilter === 'support' && (member.role === 'driving_instructor' || member.role === 'admin' || member.role === 'director')) return false;
                if (!['instructors', 'admins', 'support'].includes(roleFilter) && member.role !== roleFilter) return false;
            }

            // Branch filter
            if (branchFilter && branchFilter !== 'ALL') {
                if (member.branchId && member.branchId !== branchFilter) {
                    return false;
                }
            }

            // Status filter
            if (statusFilter !== 'All') {
                if (member.status !== statusFilter) return false;
            }

            return true;
        });
    }, [unifiedStaffList, searchTerm, roleFilter, branchFilter, statusFilter]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = unifiedStaffList.length;
        const instructorsCount = unifiedStaffList.filter(s => s.role === 'driving_instructor').length;
        const adminsCount = unifiedStaffList.filter(s => s.role === 'admin' || s.role === 'director').length;
        const activeCount = unifiedStaffList.filter(s => s.status === 'Active').length;
        const branchesCount = new Set(unifiedStaffList.map(s => s.branchId).filter(Boolean)).size;

        return {
            total,
            instructorsCount,
            adminsCount,
            activeCount,
            branchesCount: branchesCount || (branches.length > 0 ? 1 : 0)
        };
    }, [unifiedStaffList, branches]);

    // Format helper for role label & badge color
    const getRoleDetails = (role: string) => {
        switch (role) {
            case 'admin':
                return { label: 'Administrator', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
            case 'director':
                return { label: 'Director / Executive', color: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800' };
            case 'driving_instructor':
                return { label: 'Certified Instructor', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
            case 'finance':
                return { label: 'Finance & Accounts', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
            case 'driver':
                return { label: 'Logistics Driver', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
            case 'security':
                return { label: 'Campus Security', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
            case 'procurement_officer':
                return { label: 'Storekeeper', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
            default:
                return { label: 'Administrative Staff', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
        }
    };

    // Open Add Modal
    const handleOpenAddModal = () => {
        setEditingStaff(null);
        setStaffFormData({
            name: '',
            phone: '',
            email: '',
            role: 'driving_instructor',
            branchId: (branchFilter && branchFilter !== 'ALL') ? branchFilter : (branches[0]?.id || ''),
            status: 'Active',
            specialization: '',
            instructorType: 'Both',
            licenseNumber: '',
            password: 'password123',
            sendCredentialsSms: true
        });
        setShowStaffModal(true);
    };

    // Open Edit Modal
    const handleOpenEditModal = (member: UnifiedStaffMember) => {
        setEditingStaff(member);
        setStaffFormData({
            name: member.name,
            phone: member.phone,
            email: member.email,
            role: member.role || 'driving_instructor',
            branchId: member.branchId || '',
            status: member.status,
            specialization: member.specialization || '',
            instructorType: member.instructorType || 'Both',
            licenseNumber: member.licenseNumber || '',
            password: '',
            sendCredentialsSms: false
        });
        setShowStaffModal(true);
    };

    // Save Staff (Add or Edit)
    const handleSaveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffFormData.name.trim()) {
            toastError("Staff name is required.");
            return;
        }
        if (!staffFormData.phone.trim()) {
            toastError("Phone number is required for login credentials.");
            return;
        }

        setIsSaving(true);
        try {
            const userId = editingStaff?.userId || editingStaff?.id || `usr_${Date.now()}`;
            const targetBranch = staffFormData.branchId || null;

            // 1. Prepare User Payload
            const userPayload: any = {
                id: userId,
                name: staffFormData.name.trim(),
                phoneNumber: staffFormData.phone.trim(),
                phone: staffFormData.phone.trim(),
                email: staffFormData.email.trim().toLowerCase() || null,
                role: staffFormData.role,
                roles: [staffFormData.role],
                branchId: targetBranch,
                branch_id: targetBranch,
                institutionId: institutionId,
                institution_id: institutionId,
                status: staffFormData.status,
                expertise: staffFormData.specialization ? [staffFormData.specialization] : []
            };

            if (!editingStaff && staffFormData.password) {
                userPayload.password = staffFormData.password;
            }

            // Save user
            await apiService.saveUser(userPayload);

            // 2. If Driving Instructor, sync to ds_instructors
            if (staffFormData.role === 'driving_instructor') {
                const instructorId = editingStaff?.instructorId || (editingStaff?.id.startsWith('inst_') ? editingStaff.id : `inst_${Date.now()}`);
                const instructorPayload: any = {
                    id: instructorId,
                    userId: userId,
                    name: staffFormData.name.trim(),
                    phone: staffFormData.phone.trim(),
                    email: staffFormData.email.trim().toLowerCase() || null,
                    specialization: staffFormData.specialization || 'Manual & Automatic',
                    instructorType: staffFormData.instructorType || 'Both',
                    licenseNumber: staffFormData.licenseNumber.trim() || undefined,
                    branchId: targetBranch,
                    branch_id: targetBranch,
                    institutionId: institutionId,
                    status: staffFormData.status,
                    rating: editingStaff?.rating || 5
                };
                await apiService.saveModuleRecord('ds_instructors', instructorPayload);
            }

            // 3. Dispatch SMS if requested
            if (staffFormData.sendCredentialsSms && staffFormData.phone) {
                try {
                    const schoolName = settings?.schoolName || currentInstitution?.name || 'Driving School';
                    const tempPass = staffFormData.password || 'password123';
                    const portalUrl = window.location.origin;
                    const roleLabel = STAFF_ROLE_OPTIONS.find(r => r.value === staffFormData.role)?.label.split('/')[0].trim() || 'Staff';
                    
                    const message = `Welcome to ${schoolName}!\nYour ${roleLabel} account is ready.\nPortal: ${portalUrl}\nUsername: ${staffFormData.phone}\nPassword: ${tempPass}\nPlease change your password on first login.`;
                    
                    await apiService.sendSms(staffFormData.phone, message, currentInstitution?.smsConfig, 1, institutionId);
                    toastInfo("Welcome credentials sent to staff phone via SMS.");
                } catch (smsErr) {
                    console.warn('[DSStaffManager] SMS dispatch error:', smsErr);
                }
            }

            success(editingStaff ? "Staff details updated successfully." : "New staff member registered successfully.");
            setShowStaffModal(false);
            setEditingStaff(null);

            // Refresh data
            await loadUsers();
            if (onRefreshInstructors) {
                await onRefreshInstructors().catch(() => {});
            }
        } catch (err: any) {
            console.error('[DSStaffManager] Save staff error:', err);
            toastError("Failed to save staff record: " + (err?.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Staff
    const handleDeleteStaff = async (member: UnifiedStaffMember) => {
        const confirmMsg = `Are you sure you want to remove ${member.name} (${member.role})?\nThis will deactivate their access to the system.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            if (member.userId) {
                await apiService.deleteModuleRecord('users', member.userId).catch(() => {});
            }
            if (member.instructorId) {
                await apiService.deleteModuleRecord('ds_instructors', member.instructorId).catch(() => {});
            }
            success(`${member.name} has been removed from staff.`);
            await loadUsers();
            if (onRefreshInstructors) {
                await onRefreshInstructors().catch(() => {});
            }
        } catch (err: any) {
            console.error('[DSStaffManager] Delete staff error:', err);
            toastError("Failed to delete staff member: " + (err?.message || err));
        }
    };

    // Toggle Status
    const handleToggleStatus = async (member: UnifiedStaffMember) => {
        const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';
        try {
            if (member.userId) {
                await apiService.saveUser({
                    id: member.userId,
                    status: newStatus
                } as any);
            }
            if (member.instructorId) {
                await apiService.saveModuleRecord('ds_instructors', {
                    id: member.instructorId,
                    status: newStatus
                });
            }
            success(`${member.name} status updated to ${newStatus}.`);
            await loadUsers();
            if (onRefreshInstructors) {
                await onRefreshInstructors().catch(() => {});
            }
        } catch (err) {
            toastError("Failed to update status.");
        }
    };

    // Handle Password Reset & SMS
    const handleExecutePasswordReset = async () => {
        if (!passwordStaffTarget) return;
        if (!newPasswordValue.trim()) {
            toastError("Please enter a new password.");
            return;
        }

        try {
            const userId = passwordStaffTarget.userId || passwordStaffTarget.id;
            await apiService.saveUser({
                id: userId,
                password: newPasswordValue.trim()
            } as any);

            if (sendPasswordSms && passwordStaffTarget.phone) {
                const schoolName = settings?.schoolName || currentInstitution?.name || 'Driving School';
                const portalUrl = window.location.origin;
                const message = `Notice from ${schoolName}:\nYour portal login password has been reset.\nPortal: ${portalUrl}\nUsername: ${passwordStaffTarget.phone}\nNew Password: ${newPasswordValue.trim()}`;
                
                await apiService.sendSms(passwordStaffTarget.phone, message, currentInstitution?.smsConfig, 1, institutionId);
                toastInfo("Password update SMS dispatched to staff phone.");
            }

            success(`Password updated for ${passwordStaffTarget.name}.`);
            setShowPasswordModal(false);
            setPasswordStaffTarget(null);
            setNewPasswordValue('');
        } catch (err: any) {
            console.error('[DSStaffManager] Password reset error:', err);
            toastError("Failed to reset password: " + (err?.message || err));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Top Header Card */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider mb-2">
                        <UsersIcon className="w-3.5 h-3.5" />
                        Human Resources & Role Authorization
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                        Staff & Instructor Personnel Directory
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Register instructors, front desk operators, directors, and finance officers with campus scoping & password resets.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={loadUsers}
                        disabled={isLoading}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all border border-slate-200 dark:border-slate-700"
                        title="Reload Staff Data"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const fname = exportSystemUsersToExcel(users, instructors, branches, currentInstitution?.name, currentInstitution?.id);
                            success(`Exported staff & user roster to ${fname}`);
                        }}
                        className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export Staff Excel
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/25 hover:scale-105 active:scale-95"
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        Add New Staff
                    </button>
                </div>
            </div>

            {/* Sub-Tab Navigation Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setStaffActiveTab('directory')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            staffActiveTab === 'directory'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <UsersIcon className="w-4 h-4" />
                        Personnel Directory
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            {unifiedStaffList.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (!isDirector) {
                                toastError("Access Restricted: Only the School Director can specify what other users can view or access.");
                                return;
                            }
                            setStaffActiveTab('permissions');
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            staffActiveTab === 'permissions'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <ShieldCheckIcon className="w-4 h-4" />
                        Director Access Control Matrix
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            staffActiveTab === 'permissions' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                            {isDirector ? 'Director Only' : 'Restricted'}
                        </span>
                    </button>
                </div>

                {!isDirector && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <LockClosedIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Director Governance: Access rights are controlled exclusively by the School Director</span>
                    </div>
                )}
            </div>


            {staffActiveTab === 'directory' && (
            <>
            {/* KPI Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Personnel</span>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white mt-1 italic tracking-tight">{metrics.total}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{metrics.activeCount} Active Employees</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Certified Trainers</span>
                        <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1 italic tracking-tight">{metrics.instructorsCount}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Theory & In-Car Instructors</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <AcademicCapIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">Admins & Executives</span>
                        <h4 className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-1 italic tracking-tight">{metrics.adminsCount}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">System Administrators</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <ShieldCheckIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Campus Coverage</span>
                        <h4 className="text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 italic tracking-tight">{metrics.branchesCount}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{branches.length || 1} Branches Registered</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <BuildingOfficeIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Search Field */}
                    <div className="relative flex-1">
                        <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search staff by full name, phone, email, specialization, or license..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <XIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl self-end md:self-auto">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Grid Cards
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Roster Table
                        </button>
                    </div>
                </div>

                {/* Sub-Filters */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    {/* Role Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role:</span>
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="All">All Roles ({unifiedStaffList.length})</option>
                            <option value="instructors">Driving Instructors</option>
                            <option value="admins">Admins & Directors</option>
                            <option value="finance">Finance Officers</option>
                            <option value="staff">Front Desk Staff</option>
                            <option value="driver">Logistics Drivers</option>
                            <option value="security">Security Detail</option>
                        </select>
                    </div>

                    {/* Branch Filter */}
                    {branches && branches.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campus:</span>
                            <select
                                value={branchFilter}
                                onChange={e => setBranchFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="ALL">All Branches & Campuses</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} {b.code ? `(${b.code})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active Only</option>
                            <option value="Inactive">Inactive Only</option>
                        </select>
                    </div>

                    {(searchTerm || roleFilter !== 'All' || (branchFilter && branchFilter !== 'ALL') || statusFilter !== 'All') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setRoleFilter('All');
                                setBranchFilter('ALL');
                                setStatusFilter('All');
                            }}
                            className="ml-auto text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {filteredStaff.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <UsersIcon className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">No Staff Records Match Filters</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        No active employees or instructors were found matching the selected search query or role filter.
                    </p>
                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700"
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        Add First Staff Member
                    </button>
                </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && filteredStaff.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStaff.map(member => {
                        const roleMeta = getRoleDetails(member.role);
                        const branchObj = branches.find(b => b.id === member.branchId);

                        return (
                            <div
                                key={member.id}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-7 shadow-sm hover:shadow-xl hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Card Top: Initials & Status Badge */}
                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">
                                                    {member.name}
                                                </h4>
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mt-1 ${roleMeta.color}`}>
                                                    {roleMeta.label}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(member)}
                                            className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border transition-colors ${
                                                member.status === 'Active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                            }`}
                                            title="Click to toggle Active / Inactive"
                                        >
                                            {member.status}
                                        </button>
                                    </div>

                                    {/* Campus / Branch Tag */}
                                    <div className="mb-4">
                                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-750">
                                            <BuildingOfficeIcon className="w-3.5 h-3.5 text-indigo-500" />
                                            {branchObj ? branchObj.name : 'Main / Global Campus'}
                                        </span>
                                    </div>

                                    {/* Contact Information */}
                                    <div className="space-y-2 text-xs py-3 border-y border-slate-50 dark:border-slate-800/80">
                                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                                                Phone
                                            </span>
                                            <a
                                                href={`tel:${member.phone}`}
                                                className="font-black text-slate-900 dark:text-white hover:text-indigo-600 transition-colors"
                                            >
                                                {member.phone || '—'}
                                            </a>
                                        </div>

                                        {member.email && (
                                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                    <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    Email
                                                </span>
                                                <span className="font-bold truncate max-w-[170px]" title={member.email}>
                                                    {member.email}
                                                </span>
                                            </div>
                                        )}

                                        {/* Instructor Specific Attributes */}
                                        {member.role === 'driving_instructor' && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                        <AcademicCapIcon className="w-3.5 h-3.5 text-indigo-400" />
                                                        Classes
                                                    </span>
                                                    <span className="font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[170px]">
                                                        {member.specialization || 'Manual & Auto'}
                                                    </span>
                                                </div>

                                                {member.licenseNumber && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400">NTSA License</span>
                                                        <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                                            {member.licenseNumber}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons Footer */}
                                <div className="mt-5 pt-3 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPermissionsModal(member)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all border ${
                                            isDirector
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                                        }`}
                                        title={isDirector ? "Configure Module Access (Director Only)" : "Only School Director can configure permissions"}
                                    >
                                        <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500" />
                                        Access
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPasswordStaffTarget(member);
                                            setNewPasswordValue('welcome123');
                                            setShowPasswordModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all border border-slate-200 dark:border-slate-700"
                                        title="Reset Password & SMS"
                                    >
                                        <KeyIcon className="w-3.5 h-3.5" />
                                        Password
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(member)}
                                        className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
                                        title="Edit Staff Member"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteStaff(member)}
                                        className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-slate-200 dark:border-slate-700"
                                        title="Delete / Deactivate"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && filteredStaff.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <tr>
                                    <th className="p-5">Staff Member</th>
                                    <th className="p-5">Role & Category</th>
                                    <th className="p-5">Campus Branch</th>
                                    <th className="p-5">Phone Contact</th>
                                    <th className="p-5">Email Address</th>
                                    <th className="p-5">Specialization / License</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 font-bold">
                                {filteredStaff.map(member => {
                                    const roleMeta = getRoleDetails(member.role);
                                    const branchObj = branches.find(b => b.id === member.branchId);

                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-900 dark:text-white uppercase">{member.name}</span>
                                                        {member.instructorId && (
                                                            <span className="block text-[8px] text-indigo-500 uppercase tracking-widest font-black">Trainer ID: {member.instructorId.substring(0, 8)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${roleMeta.color}`}>
                                                    {roleMeta.label}
                                                </span>
                                            </td>

                                            <td className="p-5 text-slate-600 dark:text-slate-300">
                                                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black">
                                                    📍 {branchObj ? branchObj.name : 'Main Campus'}
                                                </span>
                                            </td>

                                            <td className="p-5 text-slate-900 dark:text-white font-mono">
                                                {member.phone || '—'}
                                            </td>

                                            <td className="p-5 text-slate-500 dark:text-slate-400">
                                                {member.email || '—'}
                                            </td>

                                            <td className="p-5 text-indigo-600 dark:text-indigo-400">
                                                {member.specialization || (member.licenseNumber ? `Lic: ${member.licenseNumber}` : '—')}
                                            </td>

                                            <td className="p-5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(member)}
                                                    className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                                        member.status === 'Active'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {member.status}
                                                </button>
                                            </td>

                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenPermissionsModal(member)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all"
                                                        title={isDirector ? "Configure Access Permissions (Director Exclusive)" : "Director access control"}
                                                    >
                                                        <ShieldCheckIcon className="w-4 h-4 text-indigo-500" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPasswordStaffTarget(member);
                                                            setNewPasswordValue('welcome123');
                                                            setShowPasswordModal(true);
                                                        }}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all"
                                                        title="Reset Password & SMS"
                                                    >
                                                        <KeyIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(member)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteStaff(member)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                                        title="Delete"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            </>
            )}

            {/* Director Access Control Matrix Tab */}
            {staffActiveTab === 'permissions' && (
                <div className="space-y-8 animate-fade-in">
                    {!isDirector ? (
                        <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-rose-200 dark:border-rose-900/40 text-center space-y-4 max-w-xl mx-auto">
                            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
                                <ShieldCheckIcon className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Director Governance Control
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                In this Driving School, only the <strong>School Director</strong> has authorization to specify what other users can view or access.
                            </p>
                            <button
                                type="button"
                                onClick={() => setStaffActiveTab('directory')}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase"
                            >
                                Back to Directory
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Director Banner */}
                            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-800/50">
                                <div className="space-y-1.5">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider">
                                        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                                        Director Governance & Module Authorization Matrix
                                    </div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">
                                        User & Role Access Control Center
                                    </h3>
                                    <p className="text-xs text-indigo-200/80 max-w-2xl font-medium leading-relaxed">
                                        As the School Director, you hold exclusive authority to configure module visibility. Configure default permissions per role below, or click any staff member in the directory to set granular custom overrides.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSaveRoleMatrix}
                                        disabled={isSavingPermissions}
                                        className="flex items-center gap-2 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSavingPermissions ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon className="w-4 h-4" />
                                                Save Role Matrix
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Role Permission Cards Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {STAFF_ROLE_OPTIONS.filter(r => r.value !== 'director').map(role => {
                                    const activeTabs = roleMatrix[role.value] || DEFAULT_DS_ROLE_PERMISSIONS[role.value] || ['dashboard'];
                                    const staffCount = unifiedStaffList.filter(s => s.role === role.value).length;
                                    return (
                                        <div key={role.value} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
                                                        {role.category} Role
                                                    </span>
                                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {role.label.split('/')[0].trim()}
                                                    </h4>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {staffCount} Active Personnel with this role
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRoleMatrix(prev => ({
                                                            ...prev,
                                                            [role.value]: DEFAULT_DS_ROLE_PERMISSIONS[role.value] || ['dashboard']
                                                        }));
                                                        toastInfo(`Reset ${role.label} to default permissions.`);
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider"
                                                >
                                                    Reset Defaults
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Permitted Modules ({activeTabs.length} of {DS_CONFIGURABLE_TABS.length}):
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {DS_CONFIGURABLE_TABS.map(tab => {
                                                        const isEnabled = activeTabs.includes(tab.id);
                                                        return (
                                                            <button
                                                                key={tab.id}
                                                                type="button"
                                                                onClick={() => handleToggleRoleTab(role.value, tab.id)}
                                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                                    isEnabled
                                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                                                }`}
                                                            >
                                                                {isEnabled ? '✓' : '+'}
                                                                {tab.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Individual Custom Overrides Section */}
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                                            Individual Staff Overrides
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Staff members with custom module visibility configured independently of their standard role.
                                        </p>
                                    </div>
                                </div>

                                {Object.keys(settings?.userPermissions || {}).length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-xs text-slate-400 font-bold">
                                            No individual overrides active. All staff members inherit their standard role permissions configured above.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(settings?.userPermissions || {}).map(([targetId, permittedTabs]) => {
                                            const member = unifiedStaffList.find(s => s.id === targetId || s.userId === targetId);
                                            if (!member) return null;
                                            return (
                                                <div key={targetId} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h5 className="font-black text-xs text-slate-900 dark:text-white uppercase">
                                                                {member.name}
                                                            </h5>
                                                            <span className="text-[9px] font-bold text-indigo-500 uppercase">
                                                                {member.role}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResetUserToRoleDefault(member)}
                                                            className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-wider"
                                                        >
                                                            Revert
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(permittedTabs || []).map(tabId => (
                                                            <span key={tabId} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-md text-[9px] font-bold uppercase">
                                                                {tabId}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenPermissionsModal(member)}
                                                        className="w-full py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-600"
                                                    >
                                                        Modify Access
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}


            {/* Modal: Add / Edit Staff Member */}
            {showStaffModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <UserPlusIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {editingStaff ? 'Update Staff Member' : 'Register New Staff Member'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        Driving School Human Resources
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowStaffModal(false);
                                    setEditingStaff(null);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveStaff} className="p-8 space-y-5 overflow-y-auto flex-1">
                            {/* Full Name & Phone */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={staffFormData.name}
                                        onChange={e => setStaffFormData({ ...staffFormData, name: e.target.value })}
                                        placeholder="e.g. David Kimani"
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Phone Number (Username) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="tel"
                                        value={staffFormData.phone}
                                        onChange={e => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                                        placeholder="07XX XXX XXX"
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Email & Role */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Email Address (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        value={staffFormData.email}
                                        onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                                        placeholder="staff@drivingschool.co.ke"
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        System Role <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={staffFormData.role}
                                        onChange={e => setStaffFormData({ ...staffFormData, role: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {STAFF_ROLE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label} ({opt.category})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Campus Branch & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Assigned Campus / Branch
                                    </label>
                                    <select
                                        value={staffFormData.branchId}
                                        onChange={e => setStaffFormData({ ...staffFormData, branchId: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Main Campus (All Branches)</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} {b.code ? `(${b.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Account Status
                                    </label>
                                    <select
                                        value={staffFormData.status}
                                        onChange={e => setStaffFormData({ ...staffFormData, status: e.target.value as any })}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Active">Active (Permitted to Log In)</option>
                                        <option value="Inactive">Inactive (Suspended)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Special Fields for Driving Instructors */}
                            {staffFormData.role === 'driving_instructor' && (
                                <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/60 rounded-3xl space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                                        <AcademicCapIcon className="w-4 h-4" />
                                        Driving Trainer Specifics
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                Trainer Scope
                                            </label>
                                            <select
                                                value={staffFormData.instructorType}
                                                onChange={e => setStaffFormData({ ...staffFormData, instructorType: e.target.value })}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white"
                                            >
                                                <option value="Both">Both (Theory & Practical)</option>
                                                <option value="Driving Instructor">Practical Only (In-Car Driving)</option>
                                                <option value="Theory Trainer">Theory Only (Classroom / Rules)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                NTSA License / Badge #
                                            </label>
                                            <input
                                                type="text"
                                                value={staffFormData.licenseNumber}
                                                onChange={e => setStaffFormData({ ...staffFormData, licenseNumber: e.target.value })}
                                                placeholder="e.g. NTSA-INST-8823"
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Vehicle Classes / Specialization
                                        </label>
                                        <input
                                            type="text"
                                            value={staffFormData.specialization}
                                            onChange={e => setStaffFormData({ ...staffFormData, specialization: e.target.value })}
                                            placeholder="e.g. Category B (Light), Category C (Truck)"
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-white"
                                        />
                                        {/* Presets */}
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {SPECIALIZATION_PRESETS.slice(0, 4).map(preset => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setStaffFormData({ ...staffFormData, specialization: preset })}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-bold hover:border-indigo-500 hover:text-indigo-600"
                                                >
                                                    {preset.split('(')[0].trim()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Initial Password (only on Add) */}
                            {!editingStaff && (
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-wider">
                                        <LockClosedIcon className="w-4 h-4 text-indigo-500" />
                                        Login Security Credentials
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                Temporary Password
                                            </label>
                                            <input
                                                type="text"
                                                value={staffFormData.password}
                                                onChange={e => setStaffFormData({ ...staffFormData, password: e.target.value })}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono font-bold text-xs text-slate-900 dark:text-white"
                                                placeholder="password123"
                                            />
                                        </div>

                                        <div className="flex items-center pt-5">
                                            <label className="flex items-center gap-2.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={staffFormData.sendCredentialsSms}
                                                    onChange={e => setStaffFormData({ ...staffFormData, sendCredentialsSms: e.target.checked })}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    Dispatch Portal Link & Password via SMS
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStaffModal(false);
                                        setEditingStaff(null);
                                    }}
                                    className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4" />
                                            {editingStaff ? 'Save Changes' : 'Register Staff'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Password Reset & SMS Dispatch */}
            {showPasswordModal && passwordStaffTarget && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                        <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                                    <KeyIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Reset Staff Password
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {passwordStaffTarget.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPasswordStaffTarget(null);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-7 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    New Access Password
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={newPasswordValue}
                                        onChange={e => setNewPasswordValue(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter password..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewPasswordValue(`Pass${Math.floor(1000 + Math.random() * 9000)}!`)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[9px] font-black uppercase"
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                                <input
                                    type="checkbox"
                                    checked={sendPasswordSms}
                                    onChange={e => setSendPasswordSms(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Send New Password to {passwordStaffTarget.phone || 'Phone'} via SMS
                                </span>
                            </label>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordStaffTarget(null);
                                    }}
                                    className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecutePasswordReset}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-600/20"
                                >
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Director Module Visibility & Permissions Manager */}
            {showPermissionsModal && targetStaffForPermissions && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <ShieldCheckIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            Configure User Module Access
                                        </h3>
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full text-[9px] font-black uppercase">
                                            Director Governance
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        {targetStaffForPermissions.name} • {targetStaffForPermissions.role} • {targetStaffForPermissions.phone}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPermissionsModal(false);
                                    setTargetStaffForPermissions(null);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6 overflow-y-auto flex-1">
                            {/* Presets Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Presets:</span>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                        Currently selected: <strong>{staffSelectedTabs.length}</strong> of {DS_CONFIGURABLE_TABS.length} modules
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStaffSelectedTabs(DS_CONFIGURABLE_TABS.map(t => t.id))}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-[10px] font-black uppercase shadow-sm border border-slate-200 dark:border-slate-600"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const roleKey = targetStaffForPermissions.role || 'staff';
                                            const def = settings?.rolePermissions?.[roleKey] || DEFAULT_DS_ROLE_PERMISSIONS[roleKey] || DEFAULT_DS_ROLE_PERMISSIONS['staff'] || ['dashboard'];
                                            setStaffSelectedTabs([...def]);
                                        }}
                                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase border border-indigo-200 dark:border-indigo-800"
                                    >
                                        Role Default
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStaffSelectedTabs(['dashboard'])}
                                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase"
                                    >
                                        Basic Only
                                    </button>
                                </div>
                            </div>

                            {/* Modules Checkbox Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {DS_CONFIGURABLE_TABS.map(tab => {
                                    const isChecked = staffSelectedTabs.includes(tab.id);
                                    const isSettings = tab.id === 'settings';
                                    return (
                                        <label
                                            key={tab.id}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                                                isChecked
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                                                    : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setStaffSelectedTabs(prev => [...prev, tab.id]);
                                                    } else {
                                                        setStaffSelectedTabs(prev => prev.filter(t => t !== tab.id));
                                                    }
                                                }}
                                                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1 space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {tab.label}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {tab.category}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                                    {tab.description}
                                                </p>
                                                {isSettings && (
                                                    <span className="inline-block mt-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                                        ⚠️ Settings access is strictly reserved for the School Director.
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            {/* Governance Notice */}
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                                <strong>Director Enforcement:</strong> When saved, this user will only see and access the checked modules above in their navigation bar and sidebar. Any unselected modules will be strictly inaccessible.
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleResetUserToRoleDefault(targetStaffForPermissions)}
                                className="px-5 py-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all"
                            >
                                Revert to Role Default
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPermissionsModal(false);
                                        setTargetStaffForPermissions(null);
                                    }}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveUserPermissions}
                                    disabled={isSavingPermissions}
                                    className="flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                                >
                                    {isSavingPermissions ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Save User Permissions
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
