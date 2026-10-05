export const getInitials = (name?: string | null): string => {
    if (!name || typeof name !== 'string') return 'U';
    const clean = name.trim();
    if (!clean) return 'U';
    return clean
        .split(/\s+/)
        .map(n => n[0])
        .filter(Boolean)
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'U';
};

/**
 * Generates a random alphanumeric string of a specified length.
 * Defaults to 6 characters as per institution ID requirements.
 */
export const generateAlphanumericCode = (length: number = 6): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Formats Kenyan phone numbers by standardizing them to '254XXXXXXXXX' 
 * (pure digits) for SMS gateways (e.g. Zettatel, Sematime), handling
 * prefixes like '07', '01', '+254', '2540', and stripping spaces/dashes.
 */
export const formatPhoneNumber = (phone: string): string => {
    if (!phone || typeof phone !== 'string') return '';

    // Strip spaces, dashes, parentheses, dots
    let clean = phone.trim().replace(/[\s\-\(\)\.]/g, '');

    // Strip leading '+'
    if (clean.startsWith('+')) {
        clean = clean.substring(1);
    }

    // Fix common typo: 25407... or 25401... -> 2547... / 2541...
    if (clean.startsWith('2540') && clean.length >= 13) {
        clean = '254' + clean.substring(4);
    }

    // Local Kenyan format: 07xx or 01xx (10 digits) -> 2547xx / 2541xx
    if (clean.startsWith('0') && clean.length === 10) {
        clean = '254' + clean.substring(1);
    }

    // 9-digit Kenyan format without leading 0: 7xx... or 1xx... -> 2547... / 2541...
    if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
        clean = '254' + clean;
    }

    // Ensure only digits remain
    return clean.replace(/[^\d]/g, '');
};

/**
 * Normalizes a phone number to local digits without '254' country code
 * and without leading '0' (returns pure local 9-digit base e.g. 712345678).
 */
export const normalizePhone = (phone: string): string => {
    if (!phone || typeof phone !== 'string') return '';
    let d = phone.trim().replace(/[\s\-\(\)\.]/g, '').replace(/[^\d]/g, '');
    if (d.startsWith('2540') && d.length >= 13) {
        d = d.substring(4);
    } else if (d.startsWith('254') && d.length > 9) {
        d = d.substring(3);
    }
    if (d.startsWith('0')) {
        d = d.substring(1);
    }
    return d;
};

/**
 * Checks if two phone numbers match, allowing for truncated/partial numbers.
 */
export const phonesMatch = (a: string, b: string): boolean => {
    const na = normalizePhone(a);
    const nb = normalizePhone(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    
    // Check if one is a suffix of another with at least 7 digits to avoid collisions
    const minLen = Math.min(na.length, nb.length);
    if (minLen >= 7) {
        return na.slice(-minLen) === nb.slice(-minLen);
    }
    return false;
};

/**
 * Checks if one phone number contains another (normalized).
 * Useful for substring searches like search filters.
 */
export const phoneContains = (stored: string, query: string): boolean => {
    const nStored = normalizePhone(stored);
    const nQuery = normalizePhone(query);
    if (!nStored || !nQuery) return false;
    return nStored.includes(nQuery) || nQuery.includes(nStored);
};

export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

/**
 * Safely and comprehensively extracts a clean, dialed-ready Kenyan parent phone number
 * from a student object and/or linked enrollments list.
 * Checks all nested metadata, alternate fields, guardian contacts, and enrollment records.
 */
export const extractParentPhoneNumber = (student?: any, enrollments?: any[]): string => {
    if (!student) return '';

    const isPlaceholderPhone = (p: string): boolean => {
        if (!p) return true;
        const digits = p.replace(/\D/g, '');
        if (digits.length < 9) return true;
        if (/^(0+|1+|2+|3+|4+|5+|6+|7+|8+|9+)$/.test(digits)) return true;
        if (digits === '254700000000' || digits === '0700000000' || digits === '123456789') return true;
        return false;
    };

    const candidates: (string | undefined | null)[] = [
        student.parentPhone,
        student.parent_phone,
        student.parentPhoneNumber,
        student.parent_phone_number,
        student.parentPhone2,
        student.guardianPhone,
        student.guardian_phone,
        student.guardianPhoneNumber,
        student.metadata?.parentPhone,
        student.metadata?.parent_phone,
        student.metadata?.parentPhoneNumber,
        student.metadata?.parent_phone_number,
        student.metadata?.parentPhone2,
        student.metadata?.secondaryPhone,
        student.metadata?.guardianPhone,
        student.metadata?.guardian_phone,
        student.metadata?.fatherPhone,
        student.metadata?.motherPhone,
        student.metadata?.parents?.[0]?.phone,
        student.metadata?.parents?.[1]?.phone,
        student.phone,
        student.phoneNumber,
        student.phone_number,
        student.metadata?.phoneNumber,
        student.metadata?.phone_number
    ];

    // Check linked enrollments if available
    if (Array.isArray(enrollments) && enrollments.length > 0) {
        const studentId = student.id || student.userId || (student as any).user_id;
        const studentAdm = student.admissionNumber || (student as any).admission_number || (student as any).admNo || student.metadata?.admissionNumber;
        
        const matchedEnrs = enrollments.filter((e: any) => {
            if (!e) return false;
            if (studentId && (e.userId === studentId || e.user_id === studentId || e.studentId === studentId || e.student_id === studentId || e.id === studentId)) return true;
            if (studentAdm) {
                const eAdm = e.admissionNumber || e.admission_number || e.admNo || e.metadata?.admissionNumber;
                if (eAdm && String(eAdm).trim().toLowerCase() === String(studentAdm).trim().toLowerCase()) return true;
            }
            return false;
        });

        matchedEnrs.forEach((enr: any) => {
            candidates.push(
                enr.parentPhone,
                enr.parent_phone,
                enr.parentPhoneNumber,
                enr.parent_phone_number,
                enr.secondaryPhone,
                enr.secondary_phone,
                enr.guardianPhone,
                enr.guardian_phone,
                enr.metadata?.parentPhone,
                enr.metadata?.parent_phone,
                enr.metadata?.parentPhoneNumber,
                enr.metadata?.parent_phone_number,
                enr.metadata?.parentPhone2,
                enr.metadata?.secondaryPhone,
                enr.metadata?.guardianPhone,
                enr.metadata?.guardian_phone,
                enr.metadata?.fatherPhone,
                enr.metadata?.motherPhone,
                enr.metadata?.parents?.[0]?.phone,
                enr.phoneNumber,
                enr.phone_number
            );
        });
    }

    for (const raw of candidates) {
        if (!raw || typeof raw !== 'string') continue;
        const trimmed = raw.trim();
        if (isPlaceholderPhone(trimmed)) continue;
        if (trimmed.includes('@')) continue;
        const formatted = formatPhoneNumber(trimmed);
        if (formatted && formatted.length >= 10 && !isPlaceholderPhone(formatted)) {
            return formatted;
        }
    }

    return '';
};