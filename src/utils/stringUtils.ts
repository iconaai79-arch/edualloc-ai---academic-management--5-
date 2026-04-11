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

    if (sanitized.startsWith('07')) {
        return '254' + sanitized.substring(1);
    }

    if (sanitized.startsWith('011')) {
        return '254' + sanitized.substring(1);
    }

    return phone;
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