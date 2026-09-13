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