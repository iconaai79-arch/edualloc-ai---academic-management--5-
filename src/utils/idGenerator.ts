/**
 * ID Generation Utilities
 * Generates unique IDs for database records using UUIDs or timestamp+random fallback
 */

/**
 * Generates a unique user ID with 'u_' prefix
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp+random
 */
export function generateUserId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `u_${crypto.randomUUID()}`;
    }
    // Fallback for older browsers: timestamp + random string
    return `u_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generates a unique ID with custom prefix
 * @param prefix - The prefix to use (e.g., 'ay', 'sem', 'dept')
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp+random
 */
export function generateId(prefix: string): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    // Fallback: timestamp + random string
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
