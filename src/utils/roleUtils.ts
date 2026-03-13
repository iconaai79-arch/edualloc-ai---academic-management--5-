import { Institution, Role } from '../types';

/**
 * Returns the appropriate admin role for a new institution based on its type and subtype.
 */
export const getAdminRoleForInstitution = (institution: Partial<Institution>): Role => {
    const type = institution.institutionType;
    const subType = institution.businessSubType?.toLowerCase() || '';

    if (type === 'University' || type === 'College') return 'admin';
    if (type === 'Reseller') return 'reseller';

    // Retail & Service institutions
    if (subType.includes('car wash') || subType.includes('car service')) return 'carwash_admin';
    if (subType.includes('agrovet')) return 'agrovet_admin';
    if (subType.includes('property')) return 'property_admin';
    if (subType.includes('retail') || subType.includes('hardware') || subType.includes('pharmacy') || subType.includes('shop')) return 'retail_agent';

    if (type === 'HIS') return 'his_admin';

    // Default for Schools
    return 'head_teacher';
};

/**
 * Returns the set of valid staff/personnel roles for a given institution.
 */
export const getRolesForInstitution = (institution: Institution | null | undefined): Role[] => {
    if (!institution) return ['admin'];

    const type = institution.institutionType;
    const subType = institution.businessSubType?.toLowerCase() || '';

    // Car Wash / Car Service
    if (subType.includes('car wash') || subType.includes('car service') || subType.includes('mechanic')) {
        return ['carwash_admin', 'carwash_attendant', 'carwash_customer', 'customer', 'lead'];
    }

    // Retail
    if (subType.includes('retail') || subType.includes('hardware') || subType.includes('pharmacy') || subType.includes('shop') || subType.includes('agrovet')) {
        return ['retail_agent', 'field_agent', 'customer', 'supplier', 'lead', 'store'];
    }

    // Property Management
    if (subType.includes('property') || subType.includes('landlord')) {
        return ['property_admin', 'landlord', 'tenant', 'lead'];
    }

    // Academic / Schools
    if (type === 'Primary' || type === 'Secondary' || type === 'Kindergarten') {
        return ['head_teacher', 'deputy', 'dos', 'teacher', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'boarding_master', 'driver', 'transport_assistant'];
    }

    // Tertiary / Higher Ed
    if (type === 'University' || type === 'College' || type === 'TVET') {
        return ['admin', 'hod', 'tto', 'lecturer', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'boarding_master', 'driver'];
    }

    // HIS / Health Information System
    if (type === 'HIS') {
        return ['his_admin', 'academics_officer', 'security', 'info_desk', 'store'];
    }

    // Fallback/Generic
    return ['admin', 'staff', 'customer'] as any[];
};

/**
 * Logic to properly display role names to the user.
 */
export const formatRoleDisplayName = (role: Role, institution?: Institution | null): string => {
    if (!role) return 'User';

    const type = institution?.institutionType;
    const subType = institution?.businessSubType?.toLowerCase() || '';

    // Car Wash context
    if (subType.includes('car wash') || subType.includes('car service')) {
        switch (role) {
            case 'carwash_admin': return 'Manager / Owner';
            case 'carwash_attendant': return 'Service Attendant';
            default: break;
        }
    }

    // School context
    const isSchool = type === 'Primary' || type === 'Secondary';
    if (isSchool) {
        switch (role) {
            case 'head_teacher': case 'admin': return 'Head Teacher';
            case 'deputy': return 'Deputy Principal';
            case 'dos': case 'academics_officer': return 'DOS / Academics';
            case 'teacher': case 'lecturer': return 'Teacher';
            case 'boarding_master': return 'Boarding Manager';
        }
    }

    const isHIS = type === 'HIS';
    if (isHIS) {
        switch (role) {
            case 'his_admin': return 'Hospital Administrator';
            case 'academics_officer': return 'Medical Record Officer';
        }
    }

    // Default formatting: replace underscores with spaces and capitalize
    return String(role)
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
