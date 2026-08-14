/**
 * Security Fortification Utility for EduAI Automation
 * Implements XSS Sanitation, PII Masking, Input Sanitization, and RBAC Route Protection.
 */

/**
 * Escapes unsafe HTML characters to prevent Cross-Site Scripting (XSS) in printable documents & dynamic DOM
 */
export const escapeHtml = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    const text = String(str);
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Sanitizes input payloads to strip out malicious script tags and SQL injection patterns
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return '';
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/--/g, '')
        .replace(/;\s*DROP\s+/gi, '')
        .trim();
};

/**
 * Masks Personally Identifiable Information (PII) for public citizen views & public logs
 */
export const maskPii = (value: string, type: 'phone' | 'email' | 'id'): string => {
    if (!value) return '';
    if (type === 'phone') {
        const clean = value.replace(/\s+/g, '');
        if (clean.length < 8) return '***';
        return clean.substring(0, 4) + ' *** *** ' + clean.substring(clean.length - 2);
    }
    if (type === 'email') {
        const parts = value.split('@');
        if (parts.length !== 2) return '***@***';
        const name = parts[0];
        const maskedName = name.length > 2 ? name[0] + '***' + name[name.length - 1] : '***';
        return `${maskedName}@${parts[1]}`;
    }
    if (type === 'id') {
        if (value.length <= 4) return '****';
        return value.substring(0, 2) + '****' + value.substring(value.length - 2);
    }
    return value;
};

/**
 * Strict Role-Based Access Control (RBAC) guard
 */
export const isUserAuthorized = (currentUserRole: string | undefined | null, allowedRoles: string[]): boolean => {
    if (!currentUserRole) return false;
    if (currentUserRole === 'super_admin') return true;
    return allowedRoles.includes(currentUserRole);
};
