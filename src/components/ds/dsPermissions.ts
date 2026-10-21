import type { User, DSSettings } from '../../types';

export interface DSModulePermissionItem {
    id: string;
    label: string;
    category: 'Executive' | 'Cadets' | 'Operations' | 'Financials' | 'Communications' | 'Analytics' | 'Terminals' | 'Governance';
    desc: string;
    isDirectorOnly?: boolean;
}

export const DS_CONFIGURABLE_TABS: DSModulePermissionItem[] = [
    { id: 'dashboard', label: 'Command Overview', category: 'Executive', desc: 'Main executive metrics, KPI cards & live alerts' },
    { id: 'students', label: 'Cadets / Students', category: 'Cadets', desc: 'Cadet directory, registrations, lesson progress & fee ledger' },
    { id: 'leads', label: 'Enquiries & Leads', category: 'Cadets', desc: 'Prospective enquiries pipeline & marketing conversion' },
    { id: 'lessons', label: 'Lessons Schedule', category: 'Operations', desc: 'Practical & theory lessons timetable, booking & calendar' },
    { id: 'dispatch', label: 'Live Vehicle Dispatch', category: 'Operations', desc: 'Vehicle check-out, student boarding & attendance verification' },
    { id: 'fleet', label: 'Fleet Assets', category: 'Operations', desc: 'Vehicles registry, service maintenance, mileage & insurance' },
    { id: 'instructors', label: 'Instructors Roster', category: 'Operations', desc: 'Driving trainers profiles, lesson logs & ratings' },
    { id: 'finance', label: 'Finance Ledger', category: 'Financials', desc: 'Invoices, payments, receipts, fee balances & cashier logs' },
    { id: 'broadcaster', label: 'SMS Broadcaster', category: 'Communications', desc: 'Bulk SMS, payment reminders, lesson alerts & promotions' },
    { id: 'reports', label: 'Reports & Analytics', category: 'Analytics', desc: 'Income, debt balances, NTSA logbooks & audit sheets' },
    { id: 'portal', label: 'Student Kiosk / Portal', category: 'Terminals', desc: 'Self-service kiosk check-in & biometric clearance' },
    { id: 'settings', label: 'System Configuration', category: 'Governance', desc: 'Rates, fee rules, staff management & access control (Director Only)', isDirectorOnly: true }
];

export const DEFAULT_DS_ROLE_PERMISSIONS: Record<string, string[]> = {
    director: ['dashboard', 'students', 'leads', 'lessons', 'dispatch', 'fleet', 'instructors', 'finance', 'broadcaster', 'reports', 'portal', 'settings'],
    super_admin: ['dashboard', 'students', 'leads', 'lessons', 'dispatch', 'fleet', 'instructors', 'finance', 'broadcaster', 'reports', 'portal', 'settings'],
    admin: ['dashboard', 'students', 'leads', 'lessons', 'dispatch', 'fleet', 'instructors', 'finance', 'broadcaster', 'reports', 'portal'],
    driving_instructor: ['dashboard', 'lessons', 'students', 'portal'],
    finance: ['dashboard', 'finance', 'students', 'reports'],
    finance_officer: ['dashboard', 'finance', 'students', 'reports'],
    accounts_clerk: ['dashboard', 'finance', 'students', 'reports'],
    staff: ['dashboard', 'students', 'leads', 'lessons', 'portal'],
    driver: ['dashboard', 'fleet', 'dispatch'],
    security: ['dashboard', 'portal', 'dispatch'],
    procurement_officer: ['dashboard', 'fleet', 'finance']
};

export function isUserDirector(user?: User | null): boolean {
    if (!user) return false;
    const rolesList = [
        (user.role || '').toLowerCase(),
        ...(Array.isArray(user.roles) ? user.roles : []).map(r => (r || '').toLowerCase())
    ];
    return rolesList.some(role => 
        ['director', 'super_admin', 'superadmin', 'super admin', 'super-admin', 'system_admin', 'system admin', 'system-admin', 'owner', 'reseller'].includes(role) || 
        role.includes('director') || 
        role.includes('owner') || 
        role.includes('super_admin') || 
        role.includes('superadmin') || 
        role.includes('super admin') || 
        role.includes('super-admin') || 
        role.includes('reseller')
    );
}

export function getUserAllowedDSTabs(user?: User | null, settings?: DSSettings | null): string[] {
    if (!user) return DEFAULT_DS_ROLE_PERMISSIONS.staff;
    
    // Director has unrestricted access to all modules
    if (isUserDirector(user)) {
        return ['dashboard', 'students', 'leads', 'lessons', 'dispatch', 'fleet', 'instructors', 'finance', 'broadcaster', 'reports', 'portal', 'settings', 'showcase'];
    }

    // 1. Check user-specific custom permissions configured by the Director
    const userId = user.id || '';
    if (settings?.userPermissions && Array.isArray(settings.userPermissions[userId]) && settings.userPermissions[userId].length > 0) {
        // Enforce: non-directors can never access settings
        return settings.userPermissions[userId].filter(tab => tab !== 'settings');
    }

    // 2. Check role permissions configured by the Director
    const userRole = (user.role || 'staff').toLowerCase();
    if (settings?.rolePermissions && Array.isArray(settings.rolePermissions[userRole]) && settings.rolePermissions[userRole].length > 0) {
        return settings.rolePermissions[userRole].filter(tab => tab !== 'settings');
    }

    // 3. Fallback to default role permissions
    const defaults = DEFAULT_DS_ROLE_PERMISSIONS[userRole] || DEFAULT_DS_ROLE_PERMISSIONS.staff;
    return defaults.filter(tab => tab !== 'settings');
}
