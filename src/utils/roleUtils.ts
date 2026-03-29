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

    if (subType.includes('coop') || subType.includes('dairy') || subType.includes('tea') || subType.includes('coffee')) return 'cooperative_manager';

    if (type === 'HIS') return 'his_admin';

    if (type === 'Church') return 'church_admin';

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

    // Cooperative, SACCO, Agrovet
    const isCoop = type === 'Cooperative' || type === 'SACCO' || type === 'Agrovet' || 
                   type?.toLowerCase() === 'cooperative' || type?.toLowerCase() === 'sacco' ||
                   subType.includes('coop') || subType.includes('dairy') || subType.includes('sacco') ||
                   subType.includes('agrovet');

    if (isCoop) {
        return ['cooperative_manager', 'coop_chairman', 'farmer', 'rider', 'sacco_officer', 'field_agent', 'supplier', 'lead', 'store', 'security', 'driver'];
    }

    // Car Wash / Car Service
    if (subType.includes('car wash') || subType.includes('car service') || subType.includes('mechanic')) {
        return ['carwash_admin', 'carwash_attendant', 'carwash_customer', 'customer', 'lead'];
    }

    // Retail
    if (subType.includes('retail') || subType.includes('hardware') || subType.includes('pharmacy') || subType.includes('shop')) {
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

    // Church System
    if (type === 'Church') {
        return ['church_admin', 'pastor', 'deacon', 'elder', 'treasurer', 'secretary', 'worker', 'member', 'visitor', 'security'];
    }

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

    const isCooperative = type === 'Cooperative' || type === 'SACCO' || type === 'Agrovet' || 
                         type?.toLowerCase() === 'cooperative' || type?.toLowerCase() === 'sacco' ||
                         subType.includes('coop') || subType.includes('dairy') || subType.includes('sacco');

    if (isCooperative) {
        switch (role) {
            case 'cooperative_manager': return 'Cooperative Manager';
            case 'coop_chairman': return 'Board Chairman';
            case 'sacco_officer': return 'SACCO Officer';
            case 'farmer': return 'Member / Farmer';
            case 'rider': return 'Delivery / Logistics Rider';
            case 'field_agent': return 'Extension Officer';
            case 'supplier': return 'Input Supplier';
            case 'lead': return 'Prospective Member';
            case 'admin': return 'System Administrator';
        }
    }

    const isHIS = type === 'HIS';
    if (isHIS) {
        switch (role) {
            case 'his_admin': return 'Hospital Administrator';
            case 'academics_officer': return 'Medical Record Officer';
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

    // Church context
    if (type === 'Church') {
        switch (role) {
            case 'church_admin': return 'Church Administrator';
            case 'pastor': return 'Pastor / Reverend';
            case 'deacon': return 'Deacon / Deaconess';
            case 'elder': return 'Church Elder';
            case 'treasurer': return 'Church Treasurer';
            case 'secretary': return 'Church Secretary';
            case 'worker': return 'Ministry Worker / Staff';
            case 'member': case 'church_member': return 'Church Member';
            case 'visitor': return 'First-time Visitor';
        }
    }

    // Default formatting: replace underscores with spaces and capitalize
    return String(role)
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
