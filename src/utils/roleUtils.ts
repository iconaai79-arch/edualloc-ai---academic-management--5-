import { Institution, Role } from '../types';

/**
 * Returns the appropriate admin role for a new institution based on its type and subtype.
 */
export const getAdminRoleForInstitution = (institution: Partial<Institution>): Role => {
    const type = institution.institutionType;
    const subType = institution.businessSubType?.toLowerCase() || '';

    if (type === 'Education') {
        const cat = institution.category;
        if (cat === 'University' || cat === 'College' || cat === 'TVET' || cat === 'Polytechnic' || cat === 'Institute') return 'admin';
        return 'head_teacher';
    }

    if ((type as any) === 'University' || (type as any) === 'College') return 'admin';
    if (type === 'Reseller') return 'reseller';

    // Retail & Service institutions
    if (subType.includes('car wash') || subType.includes('car service')) return 'carwash_admin';
    if (subType.includes('agrovet')) return 'agrovet_admin';
    if (subType.includes('property')) return 'property_admin';
    if (type === 'Pharmacy' || type === 'Chemist' || subType.includes('retail') || subType.includes('hardware') || subType.includes('pharmacy') || subType.includes('chemist') || subType.includes('shop')) return 'retail_agent';

    if (subType.includes('coop') || subType.includes('dairy') || subType.includes('tea') || subType.includes('coffee')) return 'cooperative_manager';

    if (type === 'HIS') return 'his_admin';

    if (type === 'Church') return 'church_admin';
    if (type === 'Community' || (type as any) === 'Political Campaign' || subType.includes('campaign') || subType.includes('politics')) return 'campaign_admin';

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
                   (type as string)?.toLowerCase() === 'cooperative' || (type as string)?.toLowerCase() === 'sacco' ||
                   subType.includes('coop') || subType.includes('dairy') || subType.includes('sacco') ||
                   subType.includes('agrovet') || subType.includes('tea') || subType.includes('coffee') ||
                   subType.includes('sugar');

    if (isCoop) {
        return ['cooperative_manager', 'coop_chairman', 'staff', 'farmer', 'rider', 'sacco_officer', 'field_agent', 'supplier', 'lead', 'store', 'security', 'driver'];
    }

    // Car Wash / Car Service
    if (subType.includes('car wash') || subType.includes('car service') || subType.includes('mechanic')) {
        return ['carwash_admin', 'carwash_attendant', 'carwash_customer', 'customer', 'lead'];
    }

    // Retail
    if (type === 'Pharmacy' || type === 'Chemist' || subType.includes('retail') || subType.includes('hardware') || subType.includes('pharmacy') || subType.includes('chemist') || subType.includes('shop')) {
        return ['retail_agent', 'field_agent', 'customer', 'supplier', 'lead', 'store'];
    }

    // Property Management
    if (subType.includes('property') || subType.includes('landlord')) {
        return ['property_admin', 'landlord', 'tenant', 'lead'];
    }

    // Academic / Schools
    if (isSchoolInstitution(institution)) {
        return ['head_teacher', 'deputy', 'dos', 'teacher', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'boarding_master', 'driver', 'transport_assistant'];
    }

    // Tertiary / Higher Ed
    if (isHigherEdInstitution(institution)) {
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

    // Political Campaign System
    if (type === 'Community' || (type as any) === 'Political Campaign' || subType.includes('campaign') || subType.includes('politics')) {
        return ['campaign_admin', 'campaign_agent', 'staff', 'member', 'visitor', 'security'];
    }

    // Car Showroom / Automotive Marketplace
    if (type === 'Car Showroom' || subType.includes('car sales') || subType.includes('showroom') || subType.includes('automotive') || subType.includes('motors')) {
        return ['director', 'finance', 'sales', 'reception', 'customer', 'lead'];
    }

    // Driving School
    if (type === 'Driving School' || subType.includes('driving school') || (institution?.category?.toLowerCase().includes('driving school'))) {
        return ['admin', 'driving_instructor', 'staff', 'student', 'security', 'driver'];
    }

    return ['admin', 'staff', 'customer'] as any[];
};

/**
 * Centralized logic to determine if an institution is a K-12 school.
 */
export const isSchoolInstitution = (institution: Partial<Institution> | null | undefined): boolean => {
    if (!institution) return false;
    const type = institution.institutionType;
    const category = institution.category;
    const schoolCats = ['Primary', 'Secondary', 'Kindergarten', 'ECD', 'International', 'Pre-primary', 'Junior Secondary'];
    return (type === 'Education' && schoolCats.includes(category || '')) || schoolCats.includes(type as any);
};

/**
 * Centralized logic to determine if an institution is a primary school.
 */
export const isPrimaryInstitution = (institution: Partial<Institution> | null | undefined): boolean => {
    if (!institution) return false;
    const type = institution.institutionType;
    const category = institution.category;
    return (type === 'Education' && (category === 'Primary' || category === 'Kindergarten' || category === 'ECD' || category === 'Pre-primary')) || (type as any) === 'Primary' || (type as any) === 'Kindergarten';
};

/**
 * Centralized logic to determine if an institution is a secondary school.
 */
export const isSecondaryInstitution = (institution: Partial<Institution> | null | undefined): boolean => {
    if (!institution) return false;
    const type = institution.institutionType;
    const category = institution.category;
    return (type === 'Education' && (category === 'Secondary' || category === 'Junior Secondary')) || (type as any) === 'Secondary';
};

/**
 * Centralized logic to determine if an institution is a higher education entity.
 */
export const isHigherEdInstitution = (institution: Partial<Institution> | null | undefined): boolean => {
    if (!institution) return false;
    const type = institution.institutionType;
    const category = institution.category;
    const higherEdCats = ['University', 'College', 'TVET', 'Polytechnic', 'Institute'];
    return (type === 'Education' && higherEdCats.includes(category || '')) || higherEdCats.includes(type as any);
};

/**
 * Centralized logic to determine if an institution is an educational entity.
 */
export const isEduInstitution = (institution: Partial<Institution> | null | undefined): boolean => {
    if (!institution) return false;
    const type = institution.institutionType;
    const category = institution.category;
    const eduCats = ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten', 'Pre-primary', 'Junior Secondary', 'Driving School'];
    return type === 'Education' || eduCats.includes(type as any) || eduCats.includes(category || '');
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

    // Cooperative, SACCO, Agrovet context check
    const name = institution?.name?.toLowerCase() || '';
    const isCooperative = institution?.institutionType === 'Cooperative' || 
                         institution?.institutionType === 'SACCO' || 
                         institution?.institutionType === 'Agrovet' || 
                         (institution?.institutionType as string)?.toLowerCase() === 'cooperative' || 
                         (institution?.institutionType as string)?.toLowerCase() === 'sacco' ||
                         subType.includes('coop') || 
                         subType.includes('dairy') || 
                         subType.includes('sacco') || 
                         subType.includes('agrovet') ||
                         subType.includes('tea') || 
                         subType.includes('coffee') || 
                         subType.includes('sugar') ||
                         name.includes('coop') ||
                         name.includes('sacco');

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
            case 'admin': return 'Coop Administrator';
            case 'staff': return 'Coop Staff';
            case 'security': return 'Security Detail';
            case 'driver': return 'Logistics Driver';
            case 'store': return 'Inventory / Store Manager';
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
    if (isSchoolInstitution(institution)) {
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

    // Automotive Showroom context
    if (type === 'Car Showroom' || subType.includes('car sales') || subType.includes('showroom') || subType.includes('automotive') || subType.includes('motors')) {
        switch (role) {
            case 'director': return 'Director';
            case 'finance': return 'Finance Manager';
            case 'sales': return 'Sales Executive';
            case 'reception': return 'Front Desk / Reception';
        }
    }

    // Default formatting: replace underscores with spaces and capitalize
    return String(role)
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
