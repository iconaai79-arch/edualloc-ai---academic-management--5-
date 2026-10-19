import { Institution, Role } from '../types';

/**
 * Returns the appropriate admin role for a new institution based on its type and subtype.
 */
export function getAdminRoleForInstitution(institution: Partial<Institution> | null | undefined): Role {
    if (!institution) return 'head_teacher';
    // Driving School — admin role is admin (check before generic Education)
    if (isDSInstitution(institution)) return 'admin';

    const type = institution.institutionType || (institution as any)?.institution_type;
    const subType = (institution.businessSubType || (institution as any)?.business_sub_type)?.toLowerCase() || '';

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

    if (type === 'HIS' || isHISInstitution(institution)) return 'his_admin';

    if (type === 'Church') return 'church_admin';
    if (type === 'Community' || (type as any) === 'Political Campaign' || subType.includes('campaign') || subType.includes('politics')) return 'campaign_admin';

    // Restaurant & Hospitality
    if (isRestaurantInstitution(institution)) return 'restaurant_admin' as any;

    // Corporate Invoicing & Billing Services
    if (type === 'Invoicing' || type === 'Billing Services' || subType.includes('invoicing') || subType.includes('billing') || (institution.category || '').toLowerCase().includes('invoicing')) return 'admin';

    // Grain Milling & Processing
    if (isMillingInstitution(institution)) return 'miller_admin' as any;

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
export function getRolesForInstitution(institution: Institution | null | undefined): (Role | string)[] {
    if (!institution) return ['admin'];

    const type = institution?.institutionType;
    const subType = institution?.businessSubType?.toLowerCase() || '';

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

    // Restaurant / Cafe / Hospitality POS
    if (isRestaurantInstitution(institution)) {
        return ['restaurant_admin', 'chef', 'waiter', 'cashier', 'finance', 'store', 'security', 'driver'] as any[];
    }

    // Retail
    if (type === 'Pharmacy' || type === 'Chemist' || subType.includes('retail') || subType.includes('hardware') || subType.includes('pharmacy') || subType.includes('chemist') || subType.includes('shop')) {
        return ['retail_agent', 'field_agent', 'customer', 'supplier', 'lead', 'store'];
    }

    // Property Management
    if (type === 'Property Management' || subType.includes('property') || subType.includes('landlord')) {
        return ['property_admin', 'admin', 'managing_director', 'finance', 'finance_officer', 'security', 'reception', 'caretaker', 'driver', 'landlord', 'tenant', 'lead'];
    }

    // Driving School — prioritize before generic educational checks
    if (isDSInstitution(institution)) {
        return ['admin', 'director', 'driving_instructor', 'staff', 'student', 'security', 'driver', 'procurement_officer'];
    }

    // Academic / Schools
    if (isSchoolInstitution(institution)) {
        return ['head_teacher', 'principal', 'deputy', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'operations_manager', 'operation_manager', 'dos', 'hod', 'teacher', 'class_supervisor', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'finance', 'finance_officer', 'accounts_clerk', 'procurement_officer', 'boarding_master', 'boarding_mistress', 'housekeeping_attendant', 'house_keeping_attendant', 'head_cook', 'cook', 'cateress', 'driver', 'transport_assistant', 'event_manager', 'managing_director', 'hoi', 'nurse', 'hr_officer'];
    }

    // Tertiary / Higher Ed
    if (isHigherEdInstitution(institution)) {
        return ['admin', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'operations_manager', 'operation_manager', 'hod', 'tto', 'lecturer', 'teacher', 'class_supervisor', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'finance', 'finance_officer', 'accounts_clerk', 'procurement_officer', 'boarding_master', 'boarding_mistress', 'housekeeping_attendant', 'house_keeping_attendant', 'head_cook', 'cook', 'cateress', 'driver', 'transport_assistant', 'event_manager', 'carwash_admin', 'mechanic_admin', 'managing_director', 'hoi', 'nurse', 'hr_officer'];
    }

    // General Educational Institution Fallback
    if (isEduInstitution(institution)) {
        return ['head_teacher', 'principal', 'deputy', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'operations_manager', 'operation_manager', 'dos', 'hod', 'teacher', 'class_supervisor', 'academics_officer', 'librarian', 'security', 'info_desk', 'store', 'finance', 'finance_officer', 'accounts_clerk', 'procurement_officer', 'boarding_master', 'boarding_mistress', 'housekeeping_attendant', 'house_keeping_attendant', 'head_cook', 'cook', 'cateress', 'driver', 'transport_assistant', 'event_manager', 'managing_director', 'hoi', 'nurse', 'hr_officer'];
    }

    // HIS / Health Information System
    if (type === 'HIS' || isHISInstitution(institution)) {
        return ['his_admin', 'nurse', 'doctor', 'his_doctor', 'receptionist', 'pharmacist', 'lab_tech', 'security', 'info_desk', 'store', 'procurement_officer'] as any[];
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

    // Grain Milling & Processing
    if (isMillingInstitution(institution)) {
        return ['miller_admin', 'weighbridge_operator', 'miller_technician', 'quality_officer', 'packer', 'feed_operator', 'grain_buyer', 'finance', 'finance_officer', 'store', 'security', 'driver'] as any[];
    }

    // Invoicing & Billing Services
    if (type === 'Invoicing' || type === 'Billing Services' || subType.includes('invoicing') || subType.includes('billing') || (institution.category || '').toLowerCase().includes('invoicing')) {
        return ['admin', 'finance', 'finance_officer', 'staff', 'customer', 'supplier'] as any[];
    }

    return ['admin', 'managing_director', 'hr_officer', 'finance_officer', 'procurement_officer', 'staff', 'security', 'driver', 'store', 'customer'] as any[];
}

/**
 * Centralized logic to determine if an institution is a K-12 school.
 */
export function isSchoolInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    // Driving schools are independent commercial academies, never K-12 schools
    if (isDSInstitution(institution)) return false;
    const type = (institution.institutionType || (institution as any)?.institution_type || '').toLowerCase();
    const category = (institution.category || (institution as any)?.category || '').toLowerCase();
    const schoolCats = ['primary', 'secondary', 'kindergarten', 'ecd', 'international', 'pre-primary', 'junior secondary'];
    return (type === 'education' && schoolCats.includes(category)) || schoolCats.includes(type);
}

/**
 * Centralized logic to determine if an institution is a primary school.
 */
export function isPrimaryInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    if (isDSInstitution(institution)) return false;
    const type = (institution.institutionType || (institution as any)?.institution_type || '').toLowerCase();
    const category = (institution.category || (institution as any)?.category || '').toLowerCase();
    const name = (institution.name || (institution as any)?.name || '').toLowerCase();
    const primaryTerms = ['primary', 'kindergarten', 'ecd', 'pre-primary', 'nursery', 'daycare', 'cbc'];
    return primaryTerms.some(term => type.includes(term) || category.includes(term) || name.includes(term));
}

/**
 * Centralized logic to determine if an institution is a secondary school.
 */
export function isSecondaryInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    if (isDSInstitution(institution)) return false;
    const type = (institution.institutionType || (institution as any)?.institution_type || '').toLowerCase();
    const category = (institution.category || (institution as any)?.category || '').toLowerCase();
    const name = (institution.name || (institution as any)?.name || '').toLowerCase();
    const secondaryTerms = ['secondary', 'junior secondary', 'high school', 'senior school', 'k12'];
    return secondaryTerms.some(term => type.includes(term) || category.includes(term) || name.includes(term));
}

/**
 * Centralized logic to determine if an institution is a higher education entity.
 */
export function isHigherEdInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    if (isDSInstitution(institution)) return false;
    const type = (institution.institutionType || (institution as any)?.institution_type || '').toLowerCase();
    const category = (institution.category || (institution as any)?.category || '').toLowerCase();
    const higherEdCats = ['university', 'college', 'tvet', 'polytechnic', 'institute'];
    return (type === 'education' && higherEdCats.includes(category)) || higherEdCats.includes(type);
}

/**
 * Centralized logic to determine if an institution is a Driving School.
 */
export function isDSInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || (institution as any)?.institution_type || '').toLowerCase();
    const category = (institution.category || (institution as any)?.category || '').toLowerCase();
    const subType = (institution.businessSubType || (institution as any)?.business_sub_type || '').toLowerCase();
    const name = (institution.name || (institution as any)?.institution_name || (institution as any)?.name || '').toLowerCase();
    const id = (institution.id || '').toLowerCase();
    const hasModule = institution.moduleStates?.some(m => ((m as any).moduleId === 'driving_school' || (m as any).module_id === 'driving_school' || (m as any).moduleId === 'ds' || (m as any).module_id === 'ds') && (m.status === 'active' || m.status === 'trial'));
    return type === 'driving school' || type === 'driving_school' || type.includes('driving') ||
           subType.includes('driving school') || subType.includes('driving_school') || subType.includes('driving') ||
           category.includes('driving school') || category.includes('driving_school') || category.includes('driving') ||
           name.includes('driving school') || name.includes('driving academy') || name.includes('motoring') || name.includes('drivers academy') ||
           id.startsWith('ds_') || id.includes('driving') ||
           !!hasModule;
}

/**
 * Centralized logic to determine if an institution is Property Management / Real Estate.
 */
export function isPMInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = (institution.businessSubType || '').toLowerCase();
    const name = (institution.name || '').toLowerCase();
    const hasModule = institution.moduleStates?.some(m => (m.moduleId === 'property' || m.moduleId === 'property_management') && (m.status === 'active' || m.status === 'trial'));
    return type === 'property management' || type.includes('property') || type.includes('real estate') ||
           subType.includes('property') || subType.includes('real estate') || subType.includes('landlord') ||
           category.includes('property') || category.includes('real estate') ||
           name.includes('property') || name.includes('apartments') || name.includes('estates') ||
           !!hasModule;
}

/**
 * Centralized logic to determine if an institution is an educational entity.
 */
export function isEduInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;

    // Driving School accounts are independent commercial businesses — never part of the educational school pipeline
    if (isDSInstitution(institution)) return false;

    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = (institution.businessSubType || '').toLowerCase();
    const name = (institution.name || '').toLowerCase();

    // Dedicated standalone HIS / Hospital / Medical institutions are NOT education
    if (type === 'his' || type === 'hospital' || type === 'clinic' || subType.includes('hospital') || subType.includes('clinic')) {
        return false;
    }

    // Invoicing & Billing accounts are independent commercial businesses
    if (type === 'invoicing' || type === 'billing services' || category.includes('invoicing') || category.includes('billing') || subType.includes('invoicing') || subType.includes('billing')) {
        return false;
    }

    const eduCats = ['primary', 'secondary', 'university', 'college', 'institute', 'polytechnic', 'ecd', 'international', 'tvet', 'kindergarten', 'pre-primary', 'junior secondary', 'school', 'academy', 'high school', 'k-12', 'education', 'tuition'];
    
    return type === 'education' || type === 'school' || eduCats.includes(type) || eduCats.includes(category) || eduCats.some(c => category.includes(c) || subType.includes(c) || name.includes(c));
}

/**
 * Centralized logic to determine if an institution is an Invoicing & Billing entity.
 */
export function isInvoicingInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = (institution.businessSubType || '').toLowerCase();
    const hasModule = institution.moduleStates?.some(m => (m.moduleId === 'invoicing' || m.moduleId === 'corporate_invoicing') && (m.status === 'active' || m.status === 'trial'));
    return type === 'invoicing' || type === 'billing services' || category.includes('invoicing') || category.includes('billing') || subType.includes('invoicing') || subType.includes('billing') || !!hasModule;
}

/**
 * Centralized logic to determine if an institution is a Grain / Maize Miller.
 */
export function isMillingInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = institution.businessSubType?.toLowerCase() || '';
    const name = (institution.name || '').toLowerCase();
    const hasModule = institution.moduleStates?.some(m => (m.moduleId === 'milling' || m.moduleId === 'grain_milling') && (m.status === 'active' || m.status === 'trial'));
    
    return type === 'maize miller' || type === 'milling' || type === 'grain processing' ||
           category.includes('miller') || category.includes('milling') || category.includes('grain') ||
           subType.includes('milling') || subType.includes('miller') || subType.includes('posho') || subType.includes('grain') ||
           name.includes('miller') || name.includes('millers') || name.includes('milling') || name.includes('grain') || name.includes('flour') || !!hasModule;
}

/**
 * Centralized logic to determine if an institution is a Restaurant, Cafe, Eatery or Hospitality POS entity.
 */
export function isRestaurantInstitution(institution: Partial<Institution> | null | undefined): boolean {
    if (!institution) return false;
    const type = (institution.institutionType || '').toLowerCase();
    const category = (institution.category || '').toLowerCase();
    const subType = institution.businessSubType?.toLowerCase() || '';
    const name = (institution.name || '').toLowerCase();
    const hasModule = institution.moduleStates?.some(m => (m.moduleId === 'restaurant' || m.moduleId === 'restaurant_pos' || m.moduleId === 'hospitality') && (m.status === 'active' || m.status === 'trial'));

    return type === 'restaurant' || type === 'hospitality' || type === 'cafe' || type === 'hotel' ||
           category.includes('restaurant') || category.includes('cafe') || category.includes('eatery') || category.includes('hotel') || category.includes('hospitality') ||
           subType.includes('restaurant') || subType.includes('cafe') || subType.includes('eatery') || subType.includes('hotel') || subType.includes('bar') ||
           name.includes('restaurant') || name.includes('cafe') || name.includes('hotel') || name.includes('diner') || name.includes('bistro') || !!hasModule;
}


/**
 * Logic to properly display role names to the user.
 */
export function formatRoleDisplayName(role: Role | string, institution?: Institution | null): string {
    if (!role) return 'User';
    const roleStr = String(role);
    if (roleStr === 'deputy_hoi_academics') return 'Deputy HOI-Academics';
    if (roleStr === 'deputy_hoi_boarding') return 'Deputy HOI-Boarding';
    if (roleStr === 'deputy_hoi_administration') return 'Deputy HOI-Administration';
    if (roleStr === 'cao') return 'CAO';
    if (roleStr === 'operations_manager' || roleStr === 'operation_manager') return 'Operations Manager';
    if (roleStr === 'accounts_clerk') return 'Accounts Clerk';
    if (roleStr === 'housekeeping_attendant' || roleStr === 'house_keeping_attendant') return 'House Keeping Attendant';
    if (roleStr === 'boarding_master') return 'Boarding Master';
    if (roleStr === 'boarding_mistress') return 'Boarding Mistress';
    if (roleStr === 'head_cook') return 'Head Cook';
    if (roleStr === 'cook') return 'Cook';
    if (roleStr === 'hod') return 'Head of Department (HOD)';
    if (roleStr === 'dos' || roleStr === 'director_of_studies') return 'Director of Studies (DOS)';
    if (roleStr === 'academics_officer') return 'Academics Officer';
    if (roleStr === 'deputy' || roleStr === 'deputy_head' || roleStr === 'deputy_principal' || roleStr === 'deputy_headteacher') return 'Deputy Principal / Head';

    const type = institution?.institutionType;
    const subType = institution?.businessSubType?.toLowerCase() || '';

    // Milling context
    if (isMillingInstitution(institution)) {
        switch (role as string) {
            case 'miller_admin': return 'Plant General Manager';
            case 'weighbridge_operator': return 'Weighbridge & Scale Officer';
            case 'miller_technician': return 'Chief Miller / Operator';
            case 'quality_officer': return 'QA & Lab Specialist';
            case 'packer': return 'Packaging Supervisor';
            case 'feed_operator': return 'Animal Feeds Formulator';
            case 'grain_buyer': return 'Grain Procurement Officer';
        }
    }

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
        switch (role as string) {
            case 'his_admin': return 'Hospital Administrator';
            case 'academics_officer': return 'Medical Record Officer';
        }
    }

    // School context
    if (isSchoolInstitution(institution)) {
        switch (role as string) {
            case 'head_teacher': case 'headteacher': case 'admin': case 'principal': case 'headmaster': case 'headmistress': return 'Head Teacher / Principal';
            case 'deputy_hoi_academics': return 'Deputy HOI-Academics';
            case 'deputy_hoi_boarding': return 'Deputy HOI-Boarding';
            case 'deputy_hoi_administration': return 'Deputy HOI-Administration';
            case 'cao': return 'CAO';
            case 'operation_manager': case 'operations_manager': return 'Operations Manager';
            case 'accounts_clerk': return 'Accounts Clerk';
            case 'housekeeping_attendant': case 'house_keeping_attendant': return 'House Keeping Attendant';
            case 'boarding_master': return 'Boarding Master';
            case 'boarding_mistress': return 'Boarding Mistress';
            case 'head_cook': return 'Head Cook';
            case 'cook': return 'Cook';
            case 'deputy': case 'deputy_headteacher': case 'deputy_principal': case 'deputy_head': return 'Deputy Principal / Head';
            case 'dos': case 'director_of_studies': return 'Director of Studies (DOS)';
            case 'academics_officer': return 'Academics Officer';
            case 'hod': return 'Head of Department (HOD)';
            case 'teacher': case 'lecturer': case 'practice_teacher': return 'Teacher';
            case 'class_supervisor': return 'Class Supervisor';
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

/**
 * Standard teacher roles that belong strictly to the Teacher Portal.
 * Includes Head of Department (HOD) who are classroom instructors heading departmental curriculum.
 */
export const TEACHER_ROLES: Role[] = ['teacher', 'lecturer', 'practice_teacher', 'county_teacher', 'hod'];

/**
 * Checks if a given role is a teacher-related role.
 */
export function isTeacherRole(role?: Role | string | null): boolean {
    if (!role) return false;
    const normalized = String(role).toLowerCase();
    return TEACHER_ROLES.some(r => r.toLowerCase() === normalized);
}

/**
 * Administrative leadership roles with access to the Admin Portal (including DOS, Headteacher, Deputy).
 */
export const SCHOOL_ADMIN_ROLES: (Role | string)[] = [
    'super_admin',
    'group_admin',
    'school_group_admin',
    'school_admin',
    'admin',
    'head_teacher',
    'headteacher',
    'principal',
    'headmaster',
    'headmistress',
    'deputy',
    'deputy_headteacher',
    'deputy_principal',
    'deputy_head',
    'deputy_hoi_academics',
    'deputy_hoi_boarding',
    'deputy_hoi_administration',
    'cao',
    'dos',
    'director_of_studies',
    'academics_officer',
    'director',
    'managing_director',
    'hoi',
    'operation_manager',
    'operations_manager',
    'manager'
];

/**
 * Checks if a given role is an institutional administrative leadership role.
 */
export function isSchoolAdminRole(role?: Role | string | null): boolean {
    if (!role) return false;
    const normalized = String(role).toLowerCase();
    return SCHOOL_ADMIN_ROLES.some(r => r.toLowerCase() === normalized);
}

/**
 * Checks if a user is strictly a teacher or HOD (possesses teaching/HOD role without holding executive leadership roles like Principal, Deputy, DOS).
 */
export function isStrictTeacherUser(user: { role?: Role | string | null; roles?: (Role | string)[] | null } | null | undefined): boolean {
    if (!user) return false;
    const primaryRole = String(user.role || '').toLowerCase();
    const userRoles: string[] = Array.isArray(user.roles)
        ? user.roles.map(r => String(r).toLowerCase())
        : (user.role ? [primaryRole] : []);

    // Primary teacher or HOD roles strictly belong to Teacher Portal unless holding senior executive leadership
    if (primaryRole === 'teacher' || primaryRole === 'hod' || primaryRole === 'lecturer' || primaryRole === 'practice_teacher') {
        const seniorExecutiveRoles = [
            'head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress',
            'deputy', 'deputy_headteacher', 'deputy_principal', 'deputy_head',
            'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao',
            'dos', 'director_of_studies', 'super_admin'
        ];
        const hasSeniorExecutive = userRoles.some(r => seniorExecutiveRoles.includes(r));
        if (!hasSeniorExecutive) {
            return true;
        }
    }

    const hasAdmin = userRoles.some(r => SCHOOL_ADMIN_ROLES.some(ar => ar.toLowerCase() === r));
    if (hasAdmin) return false;

    return isTeacherRole(user.role) || userRoles.some(r => isTeacherRole(r));
}

/**
 * Checks if a user has authorization to access the Admin Portal.
 * Teachers and HODs are strictly restricted from the Admin Portal unless they hold administrative leadership roles.
 */
export function canAccessAdminPortal(user: { role?: Role | string | null; roles?: (Role | string)[] | null } | null | undefined, activeRole?: Role | string | null): boolean {
    if (!user) return false;
    if (isStrictTeacherUser(user)) return false;
    if (activeRole && isTeacherRole(activeRole)) return false;
    if (activeRole && isSchoolAdminRole(activeRole)) return true;

    const userRoles: string[] = Array.isArray(user.roles)
        ? user.roles.map(r => String(r).toLowerCase())
        : (user.role ? [String(user.role).toLowerCase()] : []);

    return userRoles.some(r => SCHOOL_ADMIN_ROLES.some(ar => ar.toLowerCase() === r));
}
