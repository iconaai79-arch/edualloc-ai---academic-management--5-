import { Institution, Role } from '../types';

/**
 * Returns the appropriate admin role for a new institution based on its type and subtype.
 */
export function getAdminRoleForInstitution(institution: Partial<Institution>): Role {
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

    // Driving School — admin role is Director
    if (type === 'Driving School' || subType.includes('driving school') || (institution.category || '').toLowerCase() === 'driving school') return 'director';

    // Restaurant — admin role is restaurant_admin
    if (type === 'Restaurant' || subType.includes('restaurant') || subType.includes('eatery') || subType.includes('cafe') || (institution.category || '').toLowerCase() === 'restaurant') return 'restaurant_admin';

    // Default for Schools
    return 'head_teacher';
}

/**
 * Checks whether an institution or user role belongs to a Health Information System (HIS / Hospital / Clinic / Medical Center).
 */
export function isHISInstitution(institution: Partial<Institution> | null | undefined, role?: Role | string | null): boolean {
    const medicalRoles = ['his_admin', 'nurse', 'doctor', 'his_doctor', 'receptionist', 'pharmacist', 'lab_tech'];
    if (role && medicalRoles.includes(role)) return true;

    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const cat = (institution.category || '').toLowerCase();
    const subType = (institution.businessSubType || '').toLowerCase();
    const name = (institution.name || '').toLowerCase();

    return type === 'his' || type === 'hospital' || type === 'clinic' || type === 'healthcare' ||
           cat.includes('hospital') || cat.includes('clinic') || cat.includes('healthcare') || cat.includes('medical') || cat.includes('wellness') || cat.includes('his') ||
           subType.includes('hospital') || subType.includes('clinic') || subType.includes('his') ||
           name.includes('hospital') || name.includes('clinic') || name.includes('medical center') || name.includes('dispensary') || name.includes('health center') || name.includes('health system');
}

/**
 * Returns the set of valid staff/personnel roles for a given institution.
 */
export function getRolesForInstitution(institution: Institution | null | undefined): Role[] {
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
    if (type === 'Property Management' || subType.includes('property') || subType.includes('landlord')) {
        return ['property_admin', 'admin', 'managing_director', 'finance', 'finance_officer', 'security', 'reception', 'caretaker', 'driver', 'landlord', 'tenant', 'lead'];
    }

    // Academic / Schools
    if (isSchoolInstitution(institution)) {
        return ['head_teacher', 'operation_manager', 'deputy', 'dos', 'hod', 'teacher', 'class_supervisor', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'finance', 'finance_officer', 'procurement_officer', 'boarding_master', 'driver', 'transport_assistant', 'event_manager', 'managing_director', 'hoi', 'nurse', 'hr_officer', 'cateress'];
    }

    // Tertiary / Higher Ed
    if (isHigherEdInstitution(institution)) {
        return ['admin', 'operation_manager', 'hod', 'tto', 'lecturer', 'teacher', 'class_supervisor', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'finance', 'finance_officer', 'procurement_officer', 'boarding_master', 'driver', 'transport_assistant', 'event_manager', 'carwash_admin', 'mechanic_admin', 'managing_director', 'hoi', 'nurse', 'hr_officer', 'cateress'];
    }

    // HIS / Health Information System
    if (type === 'HIS' || isHISInstitution(institution)) {
        return ['his_admin', 'academics_officer', 'security', 'info_desk', 'store', 'procurement_officer'];
    }

    // Church System
    if (type === 'Church') {
        return ['church_admin', 'pastor', 'deacon', 'elder', 'treasurer', 'secretary', 'worker', 'member', 'visitor', 'security'];
    }

    // Political Campaign & Family Heritage System
    const cat = institution.category || '';
    if (cat.includes('Heritage') || cat.includes('Family')) {
        return ['patriarch', 'matriarch', 'council_elder', 'branch_leader', 'member', 'youth_member', 'descendant', 'visitor', 'security'];
    }
    if (type === 'Community' || (type as any) === 'Political Campaign' || subType.includes('campaign') || subType.includes('politics')) {
        return ['campaign_admin', 'campaign_agent', 'staff', 'member', 'visitor', 'security'];
    }

    // Car Showroom / Automotive Marketplace
    if (type === 'Car Showroom' || subType.includes('car sales') || subType.includes('showroom') || subType.includes('automotive') || subType.includes('motors')) {
        return ['director', 'managing_director', 'finance', 'finance_officer', 'procurement_officer', 'sales', 'reception', 'customer', 'lead'];
    }

    // Driving School
    if (isDSInstitution(institution)) {
        return ['director', 'admin', 'driving_instructor', 'staff', 'student', 'security', 'driver', 'procurement_officer'];
    }

    // Restaurant / Cafe / POS
    if (isRestaurantInstitution(institution)) {
        return ['restaurant_admin', 'chef', 'waiter', 'cashier', 'finance', 'staff', 'security', 'driver', 'store', 'procurement_officer'];
    }

    return ['admin', 'managing_director', 'hr_officer', 'finance_officer', 'procurement_officer', 'staff', 'security', 'driver', 'store', 'customer'] as any[];
}

/**
 * Centralized logic to determine if an institution is a K-12 school.
 */
export function isSchoolInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const schoolCats = ['primary', 'secondary', 'kindergarten', 'ecd', 'international', 'pre-primary', 'junior secondary'];
    return (type === 'education' && schoolCats.includes(category)) || schoolCats.includes(type);
}

/**
 * Centralized logic to determine if an institution is a primary school.
 */
export function isPrimaryInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    return (type === 'education' && ['primary', 'kindergarten', 'ecd', 'pre-primary'].includes(category)) || type === 'primary' || type === 'kindergarten';
}

/**
 * Centralized logic to determine if an institution is a secondary school.
 */
export function isSecondaryInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    return (type === 'education' && (category === 'secondary' || category === 'junior secondary')) || type === 'secondary';
}

/**
 * Centralized logic to determine if an institution is a higher education entity.
 */
export function isHigherEdInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const higherEdCats = ['university', 'college', 'tvet', 'polytechnic', 'institute'];
    return (type === 'education' && higherEdCats.includes(category)) || higherEdCats.includes(type);
}

/**
 * Centralized logic to determine if an institution is an educational entity.
 */
export function isEduInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const eduCats = ['primary', 'secondary', 'university', 'college', 'institute', 'polytechnic', 'ecd', 'international', 'tvet', 'kindergarten', 'pre-primary', 'junior secondary'];
    // Driving School accounts are independent — not part of the education pipeline
    if (category === 'driving school' || type === 'driving school') return false;
    
    return type === 'education' || eduCats.includes(type) || eduCats.includes(category);
}

/**
 * Centralized logic to determine if an institution is a Driving School.
 */
export function isDSInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = institution.businessSubType?.toLowerCase() || '';
    const hasModule = institution.moduleStates?.some(m => m.moduleId === 'driving_school' && (m.status === 'active' || m.status === 'trial'));
    return type === 'driving school' || subType.includes('driving school') || category === 'driving school' || !!hasModule;
}

/**
 * Centralized logic to determine if an institution is a Restaurant / Cafe.
 */
export function isRestaurantInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = institution.businessSubType?.toLowerCase() || '';
    const hasModule = institution.moduleStates?.some(m => (m.moduleId === 'restaurant_pos' || m.moduleId === 'restaurant') && (m.status === 'active' || m.status === 'trial'));
    return type === 'restaurant' || subType.includes('restaurant') || subType.includes('eatery') || subType.includes('cafe') || category === 'restaurant' || !!hasModule;
}

/**
 * Logic to properly display role names to the user.
 */
export function formatRoleDisplayName(role: Role, institution?: Institution | null): string {
    if (!role) return 'User';
    if (role === 'hod') return 'Head of Department';

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

    const isHIS = type === 'HIS' || isHISInstitution(institution);
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
            case 'operation_manager': case 'operations_manager': return 'Operation Manager';
            case 'deputy': return 'Deputy Principal';
            case 'dos': case 'academics_officer': return 'DOS / Academics';
            case 'teacher': case 'lecturer': return 'Teacher';
            case 'class_supervisor': return 'Class Supervisor';
            case 'boarding_master': return 'Boarding Manager';
            case 'managing_director': return 'Managing Director';
            case 'hoi': return 'HOI';
            case 'nurse': return 'School Nurse';
            case 'cateress': return 'Cateress';
            case 'finance': return 'Finance Manager';
            case 'finance_officer': return 'Finance Officer';
            case 'procurement_officer': return 'Procurement Officer';
            case 'store': return 'Storekeeper';
            case 'librarian': return 'Librarian';
            case 'security': return 'Security Officer';
            case 'info_desk': return 'Info Desk';
            case 'transport_assistant': return 'Transport Coordinator';
            case 'hr_officer': return 'HR Officer';
            case 'event_manager': return 'Events Manager';
        }
    }

    // Family Heritage context
    const catName = institution?.category || '';
    if (catName.includes('Heritage') || catName.includes('Family')) {
        switch (role) {
            case 'patriarch': case 'admin': return 'Patriarch / Head of Family';
            case 'matriarch': return 'Matriarch';
            case 'council_elder': return 'Council Elder';
            case 'branch_leader': return 'Branch Leader';
            case 'member': case 'staff': return 'Family Member';
            case 'youth_member': return 'Youth Council Member';
            case 'descendant': return 'Descendant';
            default: break;
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

    // Driving School context
    if (isDSInstitution(institution)) {
        switch (role) {
            case 'director': return 'School Director';
            case 'admin': return 'School Administrator';
            case 'driving_instructor': return 'Driving Instructor';
            case 'staff': return 'Staff Member';
            case 'student': return 'Student / Learner';
            case 'security': return 'Security Officer';
            case 'driver': return 'Driver';
            case 'finance': return 'Finance Officer';
            default: break;
        }
    }

    // Restaurant / Cafe context
    if (isRestaurantInstitution(institution)) {
        switch (role) {
            case 'restaurant_admin': return 'Restaurant Manager / Owner';
            case 'chef': return 'Head Chef / Kitchen Staff';
            case 'waiter': return 'Waitstaff / Server';
            case 'cashier': return 'POS Cashier';
            case 'finance': return 'Finance Manager';
            case 'store': return 'Inventory / Storekeeper';
            default: break;
        }
    }

    // Automotive Showroom context
    if (type === 'Car Showroom' || subType.includes('car sales') || subType.includes('showroom') || subType.includes('automotive') || subType.includes('motors')) {
        switch (role) {
            case 'director': return 'Director';
            case 'finance': return 'Finance Manager';
            case 'finance_officer': return 'Finance Officer';
            case 'sales': return 'Sales Executive';
            case 'reception': return 'Front Desk / Reception';
        }
    }

    // Default formatting: replace underscores with spaces and capitalize
    if (role === 'constituency_admin') return 'Constituency Admin';
    if (role === 'constituency_staff') return 'Constituency Staff';
    if (role === 'mechanic_admin') return 'Garage Manager';
    if (role === 'carwash_admin') return 'Car Wash Manager';
    if (role === 'managing_director') return 'Managing Director';
    if (role === 'hoi') return 'HOI';
    if (role === 'cateress') return 'Cateress';

    return String(role)
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
