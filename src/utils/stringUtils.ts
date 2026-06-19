export const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
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
 * Formats Kenyan phone numbers by replacing '0' with '254' 
 * if they start with '07' or '011'.
 */
export const formatPhoneNumber = (phone: string): string => {
    if (!phone) return phone;

    // Remove any spaces or non-numeric characters for check (except +)
    const sanitized = phone.replace(/\s/g, '');

    if (sanitized.startsWith('07') || sanitized.startsWith('01')) {
        return '254' + sanitized.substring(1);
    }

    return phone;
};

/**
 * Normalizes a phone number to digits only, removing '254' country code
 * and any leading '0'.
 */
export const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    let d = phone.replace(/[^\d]/g, '');
    if (d.startsWith('254') && d.length > 9) {
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